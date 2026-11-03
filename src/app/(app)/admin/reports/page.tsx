import Link from 'next/link';
import { Download, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Button } from '@/components/ui/button';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { Money } from '@/components/ui/money';
import { GmvChart } from '@/features/admin/components/gmv-chart';
import { requireUserPage } from '@/features/auth/session';
import { getAdminOverview } from '@/features/admin/queries';
import { createAdminSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Reports', description: 'Business reporting.', path: '/admin/reports', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  await requireUserPage('/admin/reports');
  const overview = await getAdminOverview();
  const admin = createAdminSupabase();

  const [{ data: categoryRows }, { data: partnerRows }, { data: cancellations }] = await Promise.all([
    admin
      .from('bookings')
      .select('gross_minor, commission_minor, status, service_categories(name)')
      .in('status', ['confirmed', 'in_preparation', 'ready', 'in_progress', 'completed', 'closed']),
    admin
      .from('bookings')
      .select('partner_id, gross_minor, commission_minor, status, partner_profiles(display_name)')
      .in('status', ['completed', 'closed']),
    admin
      .from('bookings')
      .select('status')
      .in('status', ['cancelled', 'refunded', 'disputed']),
  ]);

  // Revenue by service category.
  const byCategory = new Map<string, { gmv: number; commission: number; count: number }>();
  for (const row of categoryRows ?? []) {
    const name = (row.service_categories as unknown as { name: string } | null)?.name ?? 'Uncategorised';
    const entry = byCategory.get(name) ?? { gmv: 0, commission: 0, count: 0 };
    entry.gmv += row.gross_minor;
    entry.commission += row.commission_minor;
    entry.count += 1;
    byCategory.set(name, entry);
  }
  const categoryReport = [...byCategory.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.gmv - a.gmv);

  // Top partners by delivered value.
  const byPartner = new Map<string, { name: string; gmv: number; commission: number; count: number }>();
  for (const row of partnerRows ?? []) {
    const name = (row.partner_profiles as unknown as { display_name: string } | null)?.display_name ?? 'Partner';
    const entry = byPartner.get(row.partner_id) ?? { name, gmv: 0, commission: 0, count: 0 };
    entry.gmv += row.gross_minor;
    entry.commission += row.commission_minor;
    entry.count += 1;
    byPartner.set(row.partner_id, entry);
  }
  const partnerReport = [...byPartner.values()].sort((a, b) => b.gmv - a.gmv).slice(0, 15);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Revenue, conversion and partner performance. Export any table as CSV."
        actions={
          <Button asChild variant="secondary">
            <Link href="/api/admin/export?report=bookings"><Download aria-hidden /> Export bookings</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="GMV (30 days)" icon={TrendingUp}
          value={<Money minor={overview.gmvMinor} compact />}
          delta={overview.gmvDeltaPct}
        />
        <Stat label="Platform revenue" value={<Money minor={overview.platformRevenueMinor} compact />} hint="30 days" />
        <Stat label="Quote rate" value={`${overview.funnel.quoteRatePct.toFixed(1)}%`} hint="requests reaching a quote" />
        <Stat label="Win rate" value={`${overview.funnel.winRatePct.toFixed(1)}%`} hint="requests becoming events" />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle as="h2">GMV, last 30 days</CardTitle></CardHeader>
        <CardContent className="pt-3"><GmvChart data={overview.gmvSeries} /></CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle as="h2">Revenue by service</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/api/admin/export?report=categories"><Download aria-hidden /> CSV</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <TableWrap label="Revenue by service category" className="rounded-none border-0">
              <Table>
                <THead>
                  <TR><TH>Category</TH><TH className="text-right">Bookings</TH><TH className="text-right">GMV</TH><TH className="text-right">Commission</TH></TR>
                </THead>
                <TBody>
                  {categoryReport.length === 0 ? (
                    <TR><TD colSpan={4} className="py-6 text-center text-ink-500">No bookings yet.</TD></TR>
                  ) : (
                    categoryReport.map((row) => (
                      <TR key={row.name}>
                        <TD>{row.name}</TD>
                        <TDNum>{row.count}</TDNum>
                        <TDNum><Money minor={row.gmv} compact /></TDNum>
                        <TDNum><Money minor={row.commission} compact /></TDNum>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle as="h2">Top partners by delivered value</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/api/admin/export?report=partners"><Download aria-hidden /> CSV</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <TableWrap label="Top partners" className="rounded-none border-0">
              <Table>
                <THead>
                  <TR><TH>Partner</TH><TH className="text-right">Events</TH><TH className="text-right">Delivered</TH><TH className="text-right">Commission</TH></TR>
                </THead>
                <TBody>
                  {partnerReport.length === 0 ? (
                    <TR><TD colSpan={4} className="py-6 text-center text-ink-500">No delivered events yet.</TD></TR>
                  ) : (
                    partnerReport.map((row) => (
                      <TR key={row.name}>
                        <TD>{row.name}</TD>
                        <TDNum>{row.count}</TDNum>
                        <TDNum><Money minor={row.gmv} compact /></TDNum>
                        <TDNum><Money minor={row.commission} compact /></TDNum>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle as="h2">Health indicators</CardTitle></CardHeader>
        <CardContent className="pt-3">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-500">Requests (30 days)</dt>
              <dd className="mt-1 font-sans text-2xl font-semibold text-ink-950">{overview.funnel.submitted}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Reached quotation</dt>
              <dd className="mt-1 font-sans text-2xl font-semibold text-ink-950">{overview.funnel.quoted}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Converted</dt>
              <dd className="mt-1 font-sans text-2xl font-semibold text-ink-950">{overview.funnel.won}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Cancelled / disputed</dt>
              <dd className="mt-1 font-sans text-2xl font-semibold text-ink-950">{cancellations?.length ?? 0}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
