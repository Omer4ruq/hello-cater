import { Users } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableWrap, Table, THead, TH, TBody, TR, TD } from '@/components/ui/table';
import { Alert } from '@/components/ui/feedback';
import { TeamInvite } from '@/features/partner/components/team-invite';
import { requireUserPage } from '@/features/auth/session';
import { activePartner } from '@/features/partner/queries';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Team', description: 'Your team members.', path: '/partner/team', noIndex: true,
});

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', manager: 'Manager', staff: 'Staff',
};

const ROLE_DESCRIPTIONS = [
  ['Owner', 'Full access including billing and payout accounts. One per business.'],
  ['Admin', 'Everything except transferring ownership. Can invite and remove team members.'],
  ['Manager', 'Can quote, manage bookings and message customers. No access to payout details.'],
  ['Staff', 'Can view bookings and update fulfilment status. Cannot quote or see earnings.'],
];

export default async function PartnerTeamPage() {
  const user = await requireUserPage('/partner/team');
  const partner = activePartner(user);
  const supabase = await createServerSupabase();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id, profile_id, role, status, title, joined_at, profiles!organization_members_profile_id_fkey(full_name, email, phone)')
      .eq('organization_id', partner.organizationId)
      .neq('status', 'removed'),
    supabase
      .from('organization_invites')
      .select('id, email, role, expires_at, accepted_at, created_at')
      .eq('organization_id', partner.organizationId)
      .is('accepted_at', null),
  ]);

  const canManage = ['owner', 'admin'].includes(partner.role);

  return (
    <>
      <PageHeader
        title="Team"
        description="Who from your business can use this dashboard, and what they can do."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle as="h2">Team members ({(members ?? []).length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <TableWrap label="Team members" className="rounded-none border-0">
                <Table>
                  <THead>
                    <TR><TH>Name</TH><TH>Contact</TH><TH>Role</TH><TH>Joined</TH><TH>Status</TH></TR>
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
                            {member.title ? <span className="text-xs text-ink-500">{member.title}</span> : null}
                          </TD>
                          <TD className="text-xs text-ink-600">
                            <span className="block">{profile?.email}</span>
                            {profile?.phone ? <span className="block">{profile.phone}</span> : null}
                          </TD>
                          <TD>{ROLE_LABELS[member.role]}</TD>
                          <TD className="whitespace-nowrap text-xs text-ink-500">
                            {member.joined_at ? formatDateShort(member.joined_at) : '—'}
                          </TD>
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

          {(invites ?? []).length > 0 ? (
            <Card className="overflow-hidden">
              <CardHeader><CardTitle as="h2">Pending invitations</CardTitle></CardHeader>
              <CardContent className="p-0">
                <TableWrap label="Pending invitations" className="rounded-none border-0">
                  <Table>
                    <THead><TR><TH>Email</TH><TH>Role</TH><TH>Expires</TH></TR></THead>
                    <TBody>
                      {(invites ?? []).map((invite) => (
                        <TR key={invite.id}>
                          <TD>{invite.email}</TD>
                          <TD>{ROLE_LABELS[invite.role]}</TD>
                          <TD className="whitespace-nowrap text-xs text-ink-500">
                            {formatDateShort(invite.expires_at)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {canManage ? (
            <TeamInvite partnerId={partner.partnerId} organizationId={partner.organizationId} />
          ) : (
            <Alert tone="info" title="Read-only">
              Only owners and admins can invite or remove team members.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Users aria-hidden className="size-4 text-ink-400" /> What each role can do
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <dl className="space-y-3 text-sm">
                {ROLE_DESCRIPTIONS.map(([role, description]) => (
                  <div key={role}>
                    <dt className="font-medium text-ink-900">{role}</dt>
                    <dd className="mt-0.5 text-ink-600">{description}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
