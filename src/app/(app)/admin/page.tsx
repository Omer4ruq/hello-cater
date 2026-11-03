import Link from 'next/link';
import {
  BadgeCheck, Building2, CalendarRange, CreditCard, Inbox, TrendingUp, Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { GmvChart } from '@/features/admin/components/gmv-chart';
import { requireUserPage } from '@/features/auth/session';
import { getAdminOverview } from '@/features/admin/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Operations', description: 'Platform operations console.', path: '/admin', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  await requireUserPage('/admin');
  const data = await getAdminOverview();

  return (
    <>
      <PageHeader
        title="Operations"
        description="Everything moving through the platform right now."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="GMV (30 days)" icon={TrendingUp} href="/admin/reports"
          value={<Money minor={data.gmvMinor} compact />}
          delta={data.gmvDeltaPct}
          hint="vs previous 30 days"
        />
        <Stat
          label="Platform revenue" icon={Wallet} href="/admin/reports"
          value={<Money minor={data.platformRevenueMinor} compact />}
          hint="commission + fees, 30 days"
        />
        <Stat
          label="Open requests" icon={Inbox} href="/admin/requests"
          value={data.openRequestCount} hint="need triage or partners"
        />
        <Stat
          label="Outstanding" icon={CreditCard} href="/admin/invoices"
          value={<Money minor={data.outstandingMinor} compact />} hint="unpaid customer invoices"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active events" icon={CalendarRange} href="/admin/events" value={data.activeEventCount} hint={`${data.upcomingEventCount} upcoming`} />
        <Stat label="Pending verification" icon={BadgeCheck} href="/admin/verification" value={data.pendingVerificationCount} />
        <Stat
          label="Pending payouts" icon={Wallet} href="/admin/payouts"
          value={<Money minor={data.pendingPayoutMinor} compact />}
          hint={`${data.pendingPayoutCount} awaiting`}
        />
        <Stat label="Verified partners" icon={Building2} href="/admin/partners" value={data.activePartnerCount} hint={`${data.activeCustomerCount} customers`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle as="h2">GMV, last 30 days</CardTitle></CardHeader>
          <CardContent className="pt-3">
            <GmvChart data={data.gmvSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle as="h2">Request funnel (30 days)</CardTitle></CardHeader>
          <CardContent className="pt-3">
            <ul className="space-y-4">
              <FunnelRow label="Requests submitted" value={data.funnel.submitted} total={data.funnel.submitted} />
              <FunnelRow label="Reached quotation" value={data.funnel.quoted} total={data.funnel.submitted} />
              <FunnelRow label="Converted to events" value={data.funnel.won} total={data.funnel.submitted} />
            </ul>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-200 pt-4 text-sm">
              <div>
                <dt className="text-xs text-ink-500">Quote rate</dt>
                <dd className="mt-0.5 font-sans text-lg font-semibold text-ink-950">
                  {data.funnel.quoteRatePct.toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">Win rate</dt>
                <dd className="mt-0.5 font-sans text-lg font-semibold text-ink-950">
                  {data.funnel.winRatePct.toFixed(1)}%
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle as="h2">Latest requests</CardTitle>
            <Link href="/admin/requests" className="text-sm font-medium text-brand-700 hover:underline">
              Open the queue
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentRequests.length === 0 ? (
              <EmptyState icon={Inbox} title="No requests yet" description="Incoming requirements land here for triage." />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.recentRequests.map((request) => {
                  const eventType = request.event_types as unknown as { name: string } | null;
                  const city = request.cities as unknown as { name: string } | null;
                  return (
                    <li key={request.id}>
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-ink-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink-950">
                            {request.title || eventType?.name || request.reference}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {request.reference} · {relativeDate(request.created_at)}
                            {request.event_date ? ` · event ${formatDateShort(request.event_date)}` : ''}
                            {request.guest_count ? ` · ${request.guest_count} guests` : ''}
                            {city ? ` · ${city.name}` : ''}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          {!request.assigned_to ? <Badge tone="warning">Unassigned</Badge> : null}
                          <StatusBadge status={request.status} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function FunnelRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-700">{label}</span>
        <span className="font-medium tabular-nums text-ink-950">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </li>
  );
}
