import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { Money, } from '@/components/ui/money';
import { SettingsEditor } from '@/features/admin/components/settings-editor';
import { requireUserPage } from '@/features/auth/session';
import { createAdminSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatBps } from '@/lib/money';
import { ROLE_LABELS, type PlatformRole } from '@/features/auth/permissions';

export const metadata = buildMetadata({
  title: 'Settings', description: 'Platform business settings.', path: '/admin/settings', noIndex: true,
});

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  brand: 'Brand & contact',
  locale: 'Locale & currency',
  finance: 'Commercial defaults',
  operations: 'Operations',
  payments: 'Payments',
  features: 'Feature flags',
  general: 'General',
};

export default async function AdminSettingsPage() {
  await requireUserPage('/admin/settings');
  const admin = createAdminSupabase();

  const [{ data: settings }, { data: rules }, { data: policies }, { data: staff }] = await Promise.all([
    admin.from('system_settings').select('*').order('category').order('key'),
    admin
      .from('pricing_rules')
      .select('id, name, scope, commission_bps, service_fee_bps, service_fee_flat_minor, service_fee_min_minor, service_fee_max_minor, vat_bps, deposit_bps, min_order_minor, is_active, priority, effective_from, effective_to, service_categories(name), partner_profiles(display_name), organizations(name)')
      .order('priority', { ascending: false }),
    admin
      .from('cancellation_policies')
      .select('id, name, slug, description, is_default, is_active, cancellation_tiers(hours_before, refund_bps, keeps_deposit, description)')
      .order('name'),
    admin
      .from('platform_staff')
      .select('profile_id, role, is_active, created_at, profiles(full_name, email)')
      .order('created_at'),
  ]);

  const grouped = new Map<string, NonNullable<typeof settings>>();
  for (const setting of settings ?? []) {
    grouped.set(setting.category, [...(grouped.get(setting.category) ?? []), setting]);
  }

  return (
    <>
      <PageHeader
        title="Platform settings"
        description="Business rules live here, not in code. Every change is written to the audit log."
      />

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="pricing">Pricing rules</TabsTrigger>
          <TabsTrigger value="policies">Cancellation policies</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="space-y-6">
            {[...grouped.entries()].map(([category, items]) => (
              <Card key={category}>
                <CardHeader><CardTitle as="h2">{CATEGORY_LABELS[category] ?? category}</CardTitle></CardHeader>
                <CardContent className="pt-3">
                  <SettingsEditor
                    settings={items.map((s) => ({
                      key: s.key,
                      label: s.label,
                      description: s.description,
                      valueType: s.value_type,
                      value: s.value,
                      isPublic: s.is_public,
                    }))}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <Alert tone="info" className="mb-4" title="How rules resolve">
            The most specific active rule wins: organisation, then partner, then category, then
            event type, then the global default. Amounts are recomputed server-side on every
            proposal, so changing a rule never rewrites an already-sent proposal.
          </Alert>

          <Card className="overflow-hidden p-0">
            <TableWrap label="Pricing rules" className="rounded-none border-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Rule</TH><TH>Scope</TH><TH>Applies to</TH>
                    <TH className="text-right">Commission</TH>
                    <TH className="text-right">Service fee</TH>
                    <TH className="text-right">VAT</TH>
                    <TH className="text-right">Deposit</TH>
                    <TH className="text-right">Min order</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {(rules ?? []).map((rule) => {
                    const target =
                      (rule.service_categories as unknown as { name: string } | null)?.name ??
                      (rule.partner_profiles as unknown as { display_name: string } | null)?.display_name ??
                      (rule.organizations as unknown as { name: string } | null)?.name ??
                      'Everything';
                    return (
                      <TR key={rule.id}>
                        <TD>{rule.name}</TD>
                        <TD className="capitalize">{rule.scope.replace(/_/g, ' ')}</TD>
                        <TD>{target}</TD>
                        <TDNum>{formatBps(rule.commission_bps)}</TDNum>
                        <TDNum>
                          {formatBps(rule.service_fee_bps)}
                          {rule.service_fee_min_minor ? (
                            <span className="block text-xs text-ink-500">
                              min <Money minor={rule.service_fee_min_minor} compact />
                            </span>
                          ) : null}
                        </TDNum>
                        <TDNum>{formatBps(rule.vat_bps)}</TDNum>
                        <TDNum>{formatBps(rule.deposit_bps)}</TDNum>
                        <TDNum><Money minor={rule.min_order_minor} compact /></TDNum>
                        <TD>
                          {rule.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                        </TD>
                      </TR>
                    );
                  })}
                  {(rules ?? []).length === 0 ? (
                    <TR><TD colSpan={9} className="py-6 text-center text-ink-500">No pricing rules configured.</TD></TR>
                  ) : null}
                </TBody>
              </Table>
            </TableWrap>
          </Card>

          <p className="mt-3 text-xs text-ink-500">
            New rules are added through a migration or directly in the database for now. Editing
            rates here is intentionally restricted — a wrong commission silently changes every
            partner payout.
          </p>
        </TabsContent>

        <TabsContent value="policies">
          <div className="grid gap-4 md:grid-cols-2">
            {(policies ?? []).map((policy) => {
              const tiers = (policy.cancellation_tiers as unknown as {
                hours_before: number; refund_bps: number; keeps_deposit: boolean; description: string | null;
              }[] | null) ?? [];
              return (
                <Card key={policy.id}>
                  <CardHeader>
                    <CardTitle as="h2">
                      {policy.name}
                      {policy.is_default ? <Badge tone="brand" className="ml-2">Default</Badge> : null}
                    </CardTitle>
                    {policy.description ? <p className="text-sm text-ink-600">{policy.description}</p> : null}
                  </CardHeader>
                  <CardContent className="pt-3">
                    <ul className="space-y-2 text-sm">
                      {tiers
                        .sort((a, b) => b.hours_before - a.hours_before)
                        .map((tier) => (
                          <li key={tier.hours_before} className="flex items-start justify-between gap-3">
                            <span className="text-ink-700">
                              {tier.description ?? `${tier.hours_before}h before`}
                            </span>
                            <span className="shrink-0 font-medium text-ink-950">
                              {formatBps(tier.refund_bps)}
                              {tier.keeps_deposit ? (
                                <span className="block text-xs font-normal text-ink-500">deposit retained</span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <Card className="overflow-hidden p-0">
            <TableWrap label="Platform staff" className="rounded-none border-0">
              <Table>
                <THead><TR><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {(staff ?? []).map((member) => {
                    const profile = member.profiles as unknown as { full_name: string; email: string | null } | null;
                    return (
                      <TR key={member.profile_id}>
                        <TD>{profile?.full_name ?? '—'}</TD>
                        <TD className="text-ink-600">{profile?.email ?? '—'}</TD>
                        <TD>{ROLE_LABELS[member.role as PlatformRole]}</TD>
                        <TD>
                          {member.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Disabled</Badge>}
                        </TD>
                      </TR>
                    );
                  })}
                  {(staff ?? []).length === 0 ? (
                    <TR><TD colSpan={4} className="py-6 text-center text-ink-500">No staff records.</TD></TR>
                  ) : null}
                </TBody>
              </Table>
            </TableWrap>
          </Card>
          <Alert tone="info" className="mt-4" title="Adding staff">
            Staff are added by inserting a row in <code>platform_staff</code> against an existing
            account. Doing it deliberately — rather than through a self-service screen — keeps
            privilege escalation off the web surface entirely.
          </Alert>
        </TabsContent>
      </Tabs>
    </>
  );
}
