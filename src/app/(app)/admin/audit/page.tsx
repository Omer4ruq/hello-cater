import { FileSearch } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableWrap, Table, THead, TH, TBody, TR, TD } from '@/components/ui/table';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { paginationRange } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateTime } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Audit log', description: 'Immutable record of privileged actions.',
  path: '/admin/audit', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/audit');
  const params = await searchParams;
  const { start, end, page, pageSize } = paginationRange({ page: Number(params.page) || 1, pageSize: 50 });

  const supabase = await createServerSupabase();
  let query = supabase
    .from('audit_logs')
    .select('id, action, entity, entity_id, summary, actor_role, created_at, ip_address, profiles(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (params.entity) query = query.eq('entity', params.entity);
  if (params.q) query = query.or(`action.ilike.%${params.q}%,summary.ilike.%${params.q}%`);
  if (params.from) query = query.gte('created_at', params.from);
  if (params.to) query = query.lte('created_at', `${params.to}T23:59:59`);

  const { data, count } = await query;
  const rows = data ?? [];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only record of privileged and financial actions. Rows cannot be edited or deleted, including by staff."
      />

      <Alert tone="info" className="mb-4" title="Two layers of auditing">
        Application-level entries record the <em>intent</em> behind an action and who took it.
        Database triggers separately record row-level before/after values on partner verification,
        pricing rules, payouts, refunds, role changes and settings.
      </Alert>

      <DataToolbar
        searchPlaceholder="Search action or summary…"
        showDateRange
        filters={[{
          key: 'entity', label: 'Entity',
          options: [
            { value: 'service_requests', label: 'Requests' },
            { value: 'quotes', label: 'Quotes' },
            { value: 'proposals', label: 'Proposals' },
            { value: 'bookings', label: 'Bookings' },
            { value: 'payments', label: 'Payments' },
            { value: 'payouts', label: 'Payouts' },
            { value: 'partner_profiles', label: 'Partners' },
            { value: 'platform_staff', label: 'Staff' },
            { value: 'system_settings', label: 'Settings' },
            { value: 'reports', label: 'Exports' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No audit entries match"
          description="Privileged actions are recorded here automatically as they happen."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Audit log" className="rounded-none border-0">
            <Table>
              <THead>
                <TR><TH>When</TH><TH>Actor</TH><TH>Action</TH><TH>Entity</TH><TH>Summary</TH><TH>IP</TH></TR>
              </THead>
              <TBody>
                {rows.map((entry) => {
                  const actor = entry.profiles as unknown as { full_name: string; email: string | null } | null;
                  return (
                    <TR key={entry.id}>
                      <TD className="whitespace-nowrap text-xs text-ink-600">{formatDateTime(entry.created_at)}</TD>
                      <TD>
                        <span className="block text-sm">{actor?.full_name ?? 'System'}</span>
                        {entry.actor_role ? (
                          <Badge tone="neutral" className="mt-0.5">{entry.actor_role.replace(/_/g, ' ')}</Badge>
                        ) : null}
                      </TD>
                      <TD className="font-mono text-xs">{entry.action}</TD>
                      <TD className="text-xs text-ink-600">
                        {entry.entity}
                        {entry.entity_id ? (
                          <span className="block font-mono text-[0.68rem] text-ink-400">
                            {entry.entity_id.slice(0, 8)}…
                          </span>
                        ) : null}
                      </TD>
                      <TD className="max-w-md text-sm text-ink-700">{entry.summary ?? '—'}</TD>
                      <TD className="font-mono text-xs text-ink-500">{String(entry.ip_address ?? '—')}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination
              page={page} pageCount={Math.ceil(total / pageSize)} total={total}
              basePath="/admin/audit" searchParams={params}
            />
          </div>
        </Card>
      )}
    </>
  );
}
