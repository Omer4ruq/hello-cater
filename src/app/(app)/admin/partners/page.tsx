import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money, } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { listAdminPartners } from '@/features/admin/queries';
import { buildMetadata } from '@/lib/seo';
import { formatBps } from '@/lib/money';
import { relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Partners', description: 'Partner network.', path: '/admin/partners', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/partners');
  const params = await searchParams;
  const { rows, total, page, pageCount } = await listAdminPartners({
    page: Number(params.page) || 1, q: params.q, status: params.status,
  });

  return (
    <>
      <PageHeader
        title="Partners"
        description="Your supply side: who is verified, who is performing, and who needs attention."
      />

      <DataToolbar
        searchPlaceholder="Search partner name…"
        filters={[{
          key: 'status', label: 'Verification',
          options: [
            { value: 'unsubmitted', label: 'Not submitted' },
            { value: 'pending', label: 'Pending' },
            { value: 'under_review', label: 'Under review' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'suspended', label: 'Suspended' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No partners yet"
          description="Partners either sign up through the public page or are onboarded by your team."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Partners" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Partner</TH>
                  <TH>Verification</TH>
                  <TH>Rating</TH>
                  <TH>Delivered</TH>
                  <TH>Response</TH>
                  <TH className="text-right">Min order</TH>
                  <TH>Commission</TH>
                  <TH>Joined</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((partner) => {
                  const org = partner.organizations as unknown as { name: string; city: string | null } | null;
                  return (
                    <TR key={partner.id}>
                      <TD>
                        <Link href={`/admin/partners/${partner.id}`} className="font-medium text-brand-700 hover:underline">
                          {partner.display_name}
                        </Link>
                        <span className="block text-xs text-ink-500">
                          {org?.name}{org?.city ? ` · ${org.city}` : ''}
                        </span>
                      </TD>
                      <TD>
                        <StatusBadge status={partner.verification_status} />
                        {partner.verification_status === 'approved' && !partner.published_at ? (
                          <Badge tone="warning" className="ml-1.5">Unpublished</Badge>
                        ) : null}
                        {!partner.is_accepting_orders ? (
                          <Badge tone="neutral" className="ml-1.5">Paused</Badge>
                        ) : null}
                      </TD>
                      <TD>{partner.rating_count ? `${partner.rating_avg.toFixed(1)} ★ (${partner.rating_count})` : '—'}</TD>
                      <TD>{partner.completed_bookings}</TD>
                      <TD>{(partner.response_rate_bps / 100).toFixed(0)}%</TD>
                      <TDNum><Money minor={partner.min_order_minor} compact /></TDNum>
                      <TD>{partner.commission_bps != null ? formatBps(partner.commission_bps) : <span className="text-ink-500">Default</span>}</TD>
                      <TD className="whitespace-nowrap text-xs text-ink-500">{relativeDate(partner.created_at)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination page={page} pageCount={pageCount} total={total} basePath="/admin/partners" searchParams={params} />
          </div>
        </Card>
      )}
    </>
  );
}
