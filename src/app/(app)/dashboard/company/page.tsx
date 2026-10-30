import { notFound } from 'next/navigation';
import { Building2, Users } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/stat';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { Money } from '@/components/ui/money';
import { Alert } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Company & team', description: 'Manage your company account.',
  path: '/dashboard/company', noIndex: true,
});

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', manager: 'Manager', staff: 'Staff',
};

export default async function CompanyPage() {
  const user = await requireUserPage('/dashboard/company');
  const membership = user.customerOrgs[0];
  if (!membership) notFound();

  const supabase = await createServerSupabase();
  const [{ data: organization }, { data: members }, { data: events }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, legal_name, email, phone, address_line, area, city, tin, bin_vat, billing_email, created_at')
      .eq('id', membership.organizationId)
      .maybeSingle(),
    supabase
      .from('organization_members')
      .select('id, role, status, title, department, spend_limit_minor, requires_approval, joined_at, profiles(full_name, email, phone)')
      .eq('organization_id', membership.organizationId)
      .neq('status', 'removed'),
    supabase
      .from('events')
      .select('id, title, reference, event_date, total_minor, paid_minor, stage')
      .eq('organization_id', membership.organizationId)
      .order('event_date', { ascending: false })
      .limit(50),
  ]);

  if (!organization) notFound();

  const totalSpend = (events ?? []).reduce((sum, e) => sum + e.total_minor, 0);
  const outstanding = (events ?? []).reduce((sum, e) => sum + (e.total_minor - e.paid_minor), 0);
  const isAdmin = ['owner', 'admin'].includes(membership.role);

  return (
    <>
      <PageHeader
        title={organization.name}
        description="Your company account, team and spending."
        actions={<Badge tone="brand">{ROLE_LABELS[membership.role]}</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Team members" icon={Users} value={(members ?? []).length} />
        <Stat label="Events" icon={Building2} value={(events ?? []).length} />
        <Stat label="Total spend" value={<Money minor={totalSpend} compact />} />
        <Stat
          label="Outstanding" value={<Money minor={outstanding} compact />}
          hint={outstanding > 0 ? 'across open invoices' : 'nothing due'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle as="h2">Team</CardTitle></CardHeader>
            <CardContent className="p-0">
              <TableWrap label="Company team" className="rounded-none border-0">
                <Table>
                  <THead>
                    <TR><TH>Name</TH><TH>Role</TH><TH>Department</TH><TH className="text-right">Spend limit</TH><TH>Status</TH></TR>
                  </THead>
                  <TBody>
                    {(members ?? []).map((member) => {
                      const profile = member.profiles as unknown as {
                        full_name: string; email: string | null; phone: string | null;
                      } | null;
                      return (
                        <TR key={member.id}>
                          <TD>
                            <span className="block font-medium text-ink-950">{profile?.full_name ?? '—'}</span>
                            <span className="text-xs text-ink-500">{profile?.email}</span>
                          </TD>
                          <TD>{ROLE_LABELS[member.role]}</TD>
                          <TD className="text-ink-600">{member.department ?? '—'}</TD>
                          <TDNum>
                            {member.spend_limit_minor != null ? (
                              <Money minor={member.spend_limit_minor} compact />
                            ) : (
                              <span className="text-ink-500">No cap</span>
                            )}
                            {member.requires_approval ? (
                              <Badge tone="warning" className="ml-1.5">Needs approval</Badge>
                            ) : null}
                          </TDNum>
                          <TD>
                            {member.status === 'active'
                              ? <Badge tone="success">Active</Badge>
                              : <Badge tone="neutral">{member.status}</Badge>}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader><CardTitle as="h2">Company events</CardTitle></CardHeader>
            <CardContent className="p-0">
              <TableWrap label="Company events" className="rounded-none border-0">
                <Table>
                  <THead>
                    <TR><TH>Event</TH><TH>Date</TH><TH className="text-right">Value</TH><TH className="text-right">Outstanding</TH></TR>
                  </THead>
                  <TBody>
                    {(events ?? []).map((event) => (
                      <TR key={event.id}>
                        <TD>
                          <span className="block">{event.title}</span>
                          <span className="font-mono text-xs text-ink-500">{event.reference}</span>
                        </TD>
                        <TD className="whitespace-nowrap text-xs">{formatDateShort(event.event_date)}</TD>
                        <TDNum><Money minor={event.total_minor} compact /></TDNum>
                        <TDNum className={event.total_minor - event.paid_minor > 0 ? 'text-warning-700' : 'text-success-700'}>
                          <Money minor={event.total_minor - event.paid_minor} compact />
                        </TDNum>
                      </TR>
                    ))}
                    {(events ?? []).length === 0 ? (
                      <TR><TD colSpan={4} className="py-6 text-center text-ink-500">No company events yet.</TD></TR>
                    ) : null}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle as="h2">Billing details</CardTitle></CardHeader>
            <CardContent className="pt-3 text-sm">
              <dl className="space-y-2.5">
                <Row label="Legal name" value={organization.legal_name ?? organization.name} />
                <Row label="Address" value={[organization.address_line, organization.area, organization.city].filter(Boolean).join(', ') || '—'} />
                <Row label="Billing email" value={organization.billing_email ?? organization.email ?? '—'} />
                <Row label="Phone" value={organization.phone ?? '—'} />
                <Row label="TIN" value={organization.tin ?? '—'} />
                <Row label="BIN / VAT" value={organization.bin_vat ?? '—'} />
              </dl>
            </CardContent>
          </Card>

          {isAdmin ? (
            <Alert tone="info" title="Inviting colleagues">
              Team invitations and spending limits are configured by our team during onboarding.
              Contact your account manager to add colleagues or change approval rules — we want a
              record of who authorised each change.
            </Alert>
          ) : (
            <Alert tone="info" title="Your access">
              You can raise requirements and see your company&rsquo;s events. Approvals and billing
              changes are handled by your company admins.
            </Alert>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-right text-ink-900">{value}</dd>
    </div>
  );
}
