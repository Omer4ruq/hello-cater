import { Users } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { createAdminSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Customers', description: 'Customer accounts.', path: '/admin/customers', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/customers');
  const params = await searchParams;
  const admin = createAdminSupabase();

  // Aggregate spend and activity per customer (company or individual).
  const [{ data: events }, { data: organizations }] = await Promise.all([
    admin
      .from('events')
      .select('id, total_minor, paid_minor, event_date, customer_profile_id, organization_id, organizations(name), profiles!events_customer_profile_id_fkey(full_name, email, phone)')
      .order('event_date', { ascending: false })
      .limit(2000),
    admin
      .from('organizations')
      .select('id, name, city, created_at, organization_members(profile_id)')
      .eq('kind', 'customer')
      .order('created_at', { ascending: false }),
  ]);

  type Row = {
    key: string; name: string; contact: string; isCompany: boolean;
    events: number; spendMinor: number; paidMinor: number; lastDate: string | null; members: number;
  };

  const grouped = new Map<string, Row>();

  for (const org of organizations ?? []) {
    grouped.set(org.id, {
      key: org.id, name: org.name, contact: org.city ?? '', isCompany: true,
      events: 0, spendMinor: 0, paidMinor: 0, lastDate: null,
      members: ((org.organization_members as unknown as unknown[] | null) ?? []).length,
    });
  }

  for (const event of events ?? []) {
    const key = event.organization_id ?? event.customer_profile_id;
    const profile = event.profiles as unknown as { full_name: string; email: string | null; phone: string | null } | null;
    const orgName = (event.organizations as unknown as { name: string } | null)?.name;

    const row = grouped.get(key) ?? {
      key,
      name: orgName ?? profile?.full_name ?? 'Customer',
      contact: profile?.email ?? profile?.phone ?? '',
      isCompany: Boolean(event.organization_id),
      events: 0, spendMinor: 0, paidMinor: 0, lastDate: null, members: 1,
    };
    row.events += 1;
    row.spendMinor += event.total_minor;
    row.paidMinor += event.paid_minor;
    if (!row.lastDate || event.event_date > row.lastDate) row.lastDate = event.event_date;
    grouped.set(key, row);
  }

  let rows = [...grouped.values()].sort((a, b) => b.spendMinor - a.spendMinor);

  if (params.q) {
    const needle = params.q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(needle) || r.contact.toLowerCase().includes(needle));
  }
  if (params.status === 'company') rows = rows.filter((r) => r.isCompany);
  if (params.status === 'individual') rows = rows.filter((r) => !r.isCompany);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Companies and individuals, with lifetime value and outstanding balances."
      />

      <DataToolbar
        searchPlaceholder="Search customer or company…"
        filters={[{
          key: 'status', label: 'Type',
          options: [
            { value: 'company', label: 'Companies' },
            { value: 'individual', label: 'Individuals' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Customer accounts appear here after their first request." />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Customers" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Customer</TH><TH>Type</TH><TH>Team</TH><TH>Events</TH>
                  <TH className="text-right">Lifetime value</TH>
                  <TH className="text-right">Outstanding</TH>
                  <TH>Last event</TH>
                </TR>
              </THead>
              <TBody>
                {rows.slice(0, 200).map((row) => (
                  <TR key={row.key}>
                    <TD>
                      <span className="block font-medium text-ink-950">{row.name}</span>
                      {row.contact ? <span className="text-xs text-ink-500">{row.contact}</span> : null}
                    </TD>
                    <TD>
                      {row.isCompany ? <Badge tone="brand">Company</Badge> : <Badge tone="neutral">Individual</Badge>}
                    </TD>
                    <TD>{row.isCompany ? row.members : '—'}</TD>
                    <TD>{row.events}</TD>
                    <TDNum><Money minor={row.spendMinor} compact /></TDNum>
                    <TDNum className={row.spendMinor - row.paidMinor > 0 ? 'text-warning-700' : undefined}>
                      <Money minor={row.spendMinor - row.paidMinor} compact />
                    </TDNum>
                    <TD className="whitespace-nowrap text-xs text-ink-500">
                      {row.lastDate ? formatDateShort(row.lastDate) : '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </>
  );
}
