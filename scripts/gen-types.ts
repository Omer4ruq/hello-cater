/**
 * Generates src/types/database.ts by introspecting a PostgreSQL database.
 *
 * The official `supabase gen types` command requires Docker; this does the
 * same job with a direct connection, so types stay in lockstep with the
 * versioned migrations in CI and on machines without a container runtime.
 *
 *   npm run db:types              # uses DATABASE_URL or the local scratch db
 */
import { Client } from 'pg';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const url =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.USER}@localhost:5432/evently_check`;

/** PostgreSQL base type -> TypeScript type. */
function tsType(udt: string, isArray: boolean, enums: Set<string>): string {
  const base = (() => {
    if (enums.has(udt)) return `Database['public']['Enums']['${udt}']`;
    switch (udt) {
      case 'int2':
      case 'int4':
      case 'float4':
      case 'float8':
        return 'number';
      // bigint and numeric are returned as strings by PostgREST when they
      // exceed JS safe-integer range; supabase-js types them as number.
      case 'int8':
      case 'numeric':
        return 'number';
      case 'bool':
        return 'boolean';
      case 'json':
      case 'jsonb':
        return 'Json';
      case 'uuid':
      case 'text':
      case 'varchar':
      case 'bpchar':
      case 'citext':
      case 'date':
      case 'time':
      case 'timetz':
      case 'timestamp':
      case 'timestamptz':
      case 'inet':
      case 'interval':
        return 'string';
      default:
        return 'string';
    }
  })();
  return isArray ? `${base}[]` : base;
}

type Col = {
  table_name: string;
  column_name: string;
  udt_name: string;
  is_nullable: boolean;
  has_default: boolean;
  is_generated: boolean;
  is_view: boolean;
};

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  const { rows: enumRows } = await client.query<{ name: string; labels: string[] }>(`
    select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname order by t.typname`);

  const enumNames = new Set(enumRows.map((e) => e.name));

  const { rows: cols } = await client.query<Col>(`
    select c.relname                as table_name,
           a.attname                as column_name,
           case when t.typcategory = 'A'
                then (select typname from pg_type where oid = t.typelem)
                else t.typname end  as udt_name,
           not a.attnotnull         as is_nullable,
           (ad.oid is not null or a.attidentity <> '') as has_default,
           (a.attgenerated <> '')   as is_generated,
           (c.relkind = 'v')        as is_view,
           (t.typcategory = 'A')    as is_array
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
    where n.nspname = 'public'
      and c.relkind in ('r', 'v')
      and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum`);

  // Foreign keys become PostgREST "Relationships", which is what makes
  // embedded selects (`profiles!inner(...)`) type-check.
  const { rows: fks } = await client.query<{
    table_name: string; constraint_name: string; columns: string[];
    referenced_relation: string; referenced_columns: string[]; is_one_to_one: boolean;
  }>(`
    select
      c.relname as table_name,
      con.conname as constraint_name,
      array_agg(att.attname::text order by k.ord) as columns,
      rel.relname as referenced_relation,
      array_agg(ratt.attname::text order by k.ord) as referenced_columns,
      exists (
        select 1 from pg_constraint u
        where u.conrelid = con.conrelid
          and u.contype in ('u', 'p')
          and u.conkey @> con.conkey and con.conkey @> u.conkey
      ) as is_one_to_one
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_class rel on rel.oid = con.confrelid
    join lateral unnest(con.conkey) with ordinality as k(attnum, ord) on true
    join lateral unnest(con.confkey) with ordinality as rk(attnum, ord) on rk.ord = k.ord
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
    join pg_attribute ratt on ratt.attrelid = con.confrelid and ratt.attnum = rk.attnum
    where con.contype = 'f' and n.nspname = 'public'
    group by c.relname, con.conname, rel.relname, con.conrelid, con.conkey
    order by c.relname, con.conname`);

  const relationshipsByTable = new Map<string, string[]>();
  for (const fk of fks) {
    const entry =
      `          {\n` +
      `            foreignKeyName: '${fk.constraint_name}';\n` +
      `            columns: [${fk.columns.map((c) => `'${c}'`).join(', ')}];\n` +
      `            isOneToOne: ${fk.is_one_to_one};\n` +
      `            referencedRelation: '${fk.referenced_relation}';\n` +
      `            referencedColumns: [${fk.referenced_columns.map((c) => `'${c}'`).join(', ')}];\n` +
      `          },`;
    relationshipsByTable.set(fk.table_name, [...(relationshipsByTable.get(fk.table_name) ?? []), entry]);
  }

  const relationshipsFor = (table: string): string => {
    const entries = relationshipsByTable.get(table);
    return entries?.length ? `[\n${entries.join('\n')}\n        ]` : '[]';
  };

  // Public functions are the RPC surface reachable through PostgREST.
  const { rows: funcs } = await client.query<{ name: string; args: string; ret: string }>(`
    select p.proname as name,
           pg_get_function_arguments(p.oid) as args,
           pg_get_function_result(p.oid) as ret
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type t on t.oid = p.prorettype
    where n.nspname = 'public'
      and p.prokind = 'f'
      and t.typname <> 'trigger'
      -- Exclude functions installed by extensions (pgcrypto, citext, pg_trgm).
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.classid = 'pg_proc'::regclass and d.deptype = 'e')
    order by p.proname`);

  const byTable = new Map<string, (Col & { is_array: boolean })[]>();
  for (const c of cols as (Col & { is_array: boolean })[]) {
    if (!byTable.has(c.table_name)) byTable.set(c.table_name, []);
    byTable.get(c.table_name)!.push(c);
  }

  const tables: string[] = [];
  const views: string[] = [];

  for (const [name, columns] of [...byTable.entries()].sort()) {
    const isView = columns[0].is_view;
    const row = columns
      .map((c) => `        ${c.column_name}: ${tsType(c.udt_name, c.is_array, enumNames)}${c.is_nullable ? ' | null' : ''};`)
      .join('\n');

    if (isView) {
      views.push(
        `      ${name}: {\n        Row: {\n${row}\n        };\n        Relationships: ${relationshipsFor(name)};\n      };`,
      );
      continue;
    }

    const insert = columns
      .filter((c) => !c.is_generated)
      .map((c) => {
        const optional = c.is_nullable || c.has_default;
        return `        ${c.column_name}${optional ? '?' : ''}: ${tsType(c.udt_name, c.is_array, enumNames)}${c.is_nullable ? ' | null' : ''};`;
      })
      .join('\n');

    const update = columns
      .filter((c) => !c.is_generated)
      .map(
        (c) =>
          `        ${c.column_name}?: ${tsType(c.udt_name, c.is_array, enumNames)}${c.is_nullable ? ' | null' : ''};`,
      )
      .join('\n');

    tables.push(
      `      ${name}: {\n        Row: {\n${row}\n        };\n        Insert: {\n${insert}\n        };\n` +
        `        Update: {\n${update}\n        };\n        Relationships: ${relationshipsFor(name)};\n      };`,
    );
  }

  // ---- RPC signatures -------------------------------------------------
  const sqlToTs = (raw: string): string => {
    const t = raw.trim().toLowerCase().replace(/\[\]$/, '');
    const isArr = raw.trim().endsWith('[]');
    const base = (() => {
      if (enumNames.has(t)) return `Database['public']['Enums']['${t}']`;
      if (/^(integer|int|int2|int4|int8|bigint|smallint|numeric|real|double precision)$/.test(t)) return 'number';
      if (t === 'boolean' || t === 'bool') return 'boolean';
      if (t === 'json' || t === 'jsonb') return 'Json';
      if (t === 'void') return 'undefined';
      if (t === 'record' || t.startsWith('setof')) return 'Json';
      if (byTable.has(t)) return `Database['public']['Tables']['${t}']['Row']`;
      return 'string';
    })();
    return isArr ? `${base}[]` : base;
  };

  const functions = funcs
    .map((f) => {
      const args = f.args
        .split(/,(?![^(]*\))/)
        .map((a) => a.trim())
        .filter(Boolean)
        .map((a) => {
          const withoutDefault = a.split(/\s+default\s+/i)[0].trim();
          const hasDefault = /\s+default\s+/i.test(a);
          const parts = withoutDefault.split(/\s+/);
          const name = parts.shift()!;
          return `          ${name}${hasDefault ? '?' : ''}: ${sqlToTs(parts.join(' '))};`;
        });

      const returns = f.ret.replace(/^setof\s+/i, '');
      const isSet = /^setof\s+/i.test(f.ret);
      const ret = `${sqlToTs(returns)}${isSet ? '[]' : ''}`;

      return `      ${f.name}: {\n        Args: ${
        args.length ? `{\n${args.join('\n')}\n        }` : 'Record<string, never>'
      };\n        Returns: ${ret};\n      };`;
    })
    .join('\n');

  const enums = enumRows
    .map((e) => `      ${e.name}: ${e.labels.map((l) => `'${l}'`).join(' | ')};`)
    .join('\n');

  const out = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Run \`npm run db:types\` after changing supabase/migrations.
 * Source of truth: supabase/migrations/*.sql
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13';
  };
  public: {
    Tables: {
${tables.join('\n')}
    };
    Views: {
${views.join('\n')}
    };
    Functions: {
${functions}
    };
    Enums: {
${enums}
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
export type Functions<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T];
`;

  writeFileSync(resolve(process.cwd(), 'src/types/database.ts'), out);
  await client.end();
  console.log(
    `✓ src/types/database.ts — ${tables.length} tables, ${views.length} views, ${enumRows.length} enums, ${funcs.length} rpc functions`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
