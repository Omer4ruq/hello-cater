import { Client, types, type QueryResult } from 'pg';

/**
 * node-postgres returns BIGINT (oid 20) and NUMERIC (oid 1700) as
 * strings to avoid precision loss. Every money column here is an
 * integer count of poisha well inside the safe-integer range, and
 * PostgREST/supabase-js hand these back as numbers, so parsing them the
 * same way keeps assertions honest about what the app will actually see.
 */
types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

/**
 * Harness for exercising the real schema — RLS policies, triggers and
 * constraints — against PostgreSQL.
 *
 * Queries run as the `authenticated` or `anon` role with the same
 * `request.jwt.claim.sub` GUC that Supabase sets per request, so the
 * policies under test are the ones that will run in production.
 */

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  `postgresql://${process.env.USER}@localhost:5432/evently_test`;

/** Demo identities from supabase/seed_demo.sql. */
export const USERS = {
  superAdmin: '11111111-0000-4000-8000-000000000001',
  opsAdmin: '11111111-0000-4000-8000-000000000002',
  financeAdmin: '11111111-0000-4000-8000-000000000003',
  supportAdmin: '11111111-0000-4000-8000-000000000004',
  companyAdmin: '22222222-0000-4000-8000-000000000001',
  companyStaff: '22222222-0000-4000-8000-000000000002',
  individual: '22222222-0000-4000-8000-000000000003',
  catererOwner: '33333333-0000-4000-8000-000000000001',
  decoratorOwner: '33333333-0000-4000-8000-000000000002',
  photographerOwner: '33333333-0000-4000-8000-000000000003',
  soundOwner: '33333333-0000-4000-8000-000000000005',
} as const;

export const FIXTURES = {
  corporateRequest: '99999999-0000-4000-8000-000000000001',
  holudRequest: '99999999-0000-4000-8000-000000000002',
  holudEvent: 'eeeeeeee-0000-4000-8000-000000000001',
  townHallEvent: 'eeeeeeee-0000-4000-8000-000000000002',
  cateringBooking: 'ffffffff-0000-4000-8000-000000000001',
  completedBooking: 'ffffffff-0000-4000-8000-000000000011',
  acceptedProposal: 'dddddddd-0000-4000-8000-000000000001',
  bengalFeast: '66666666-0000-4000-8000-000000000001',
  zaikaKitchen: '66666666-0000-4000-8000-000000000003',
  orchidDecor: '66666666-0000-4000-8000-000000000004',
  nagarSound: '66666666-0000-4000-8000-000000000010',
  abcTech: '44444444-0000-4000-8000-000000000001',
  deposit: '12121212-0000-4000-8000-000000000001',
} as const;

export type Role = 'anon' | 'authenticated' | 'service_role';

let client: Client | null = null;

export async function connect(): Promise<Client> {
  if (client) return client;
  client = new Client({ connectionString: TEST_DB_URL });
  await client.connect();
  return client;
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
  }
}

/**
 * Runs a query in the security context of a given role and user.
 *
 * Wrapped in a transaction that is always rolled back, so tests never
 * leak state into one another and a test that writes cannot corrupt the
 * fixtures for the next one.
 */
export async function asUser<T extends Record<string, unknown> = Record<string, unknown>>(
  options: { role?: Role; userId?: string | null },
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const db = await connect();
  const role = options.role ?? 'authenticated';

  await db.query('begin');
  try {
    await db.query(`set local role ${role}`);
    await db.query(
      `select set_config('request.jwt.claim.sub', $1, true),
              set_config('request.jwt.claim.role', $2, true)`,
      [options.userId ?? '', role],
    );
    const result = await db.query<T>(sql, params);
    return result;
  } finally {
    await db.query('rollback');
  }
}

/** Convenience: run as a signed-in user. */
export function asAuthenticated<T extends Record<string, unknown> = Record<string, unknown>>(
  userId: string,
  sql: string,
  params: unknown[] = [],
) {
  return asUser<T>({ role: 'authenticated', userId }, sql, params);
}

/** Convenience: run as a signed-out visitor. */
export function asAnon<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) {
  return asUser<T>({ role: 'anon', userId: null }, sql, params);
}

/** Runs with full privileges — for arranging fixtures, never for assertions. */
export async function asAdmin<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const db = await connect();
  return db.query<T>(sql, params);
}

/**
 * Asserts that a statement is rejected, and returns the error so the
 * test can check *why*. Fails if the statement unexpectedly succeeds.
 */
export async function expectRejection(
  run: () => Promise<unknown>,
): Promise<{ message: string; code?: string }> {
  try {
    await run();
  } catch (error) {
    const err = error as { message: string; code?: string };
    return { message: err.message, code: err.code };
  }
  throw new Error('Expected the statement to be rejected, but it succeeded.');
}

/** True when the local test database has been built. */
export async function databaseAvailable(): Promise<boolean> {
  try {
    const db = new Client({ connectionString: TEST_DB_URL, connectionTimeoutMillis: 1500 });
    await db.connect();
    await db.query('select 1 from service_categories limit 1');
    await db.end();
    return true;
  } catch {
    return false;
  }
}
