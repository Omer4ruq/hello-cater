import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert } from '@/components/ui/feedback';
import { ProposalDetail } from '@/features/proposals/components/proposal-view';
import { markProposalViewed } from '@/features/proposals/actions';
import { getProposalForCustomer } from '@/features/customer/queries';
import { requireUserPage } from '@/features/auth/session';
import { buildMetadata } from '@/lib/seo';
import { formatEventDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Proposal', description: 'Review your proposal.', path: '/dashboard/proposals', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUserPage(`/dashboard/proposals/${id}`);

  const data = await getProposalForCustomer(id);
  if (!data) notFound();

  // Fire-and-forget read receipt, so the ops team can see engagement.
  await markProposalViewed(id);

  const { proposal, lines } = data;
  const request = proposal.service_requests as unknown as {
    reference: string; event_date: string | null; guest_count: number | null;
    venue_name: string | null; event_types: { name: string } | null; cities: { name: string } | null;
  } | null;

  const readOnly = !['sent', 'viewed', 'changes_requested'].includes(proposal.status);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Proposals', href: '/dashboard/proposals' },
          { label: proposal.reference },
        ]}
        title={proposal.title || `Proposal ${proposal.reference}`}
        description={[
          request?.event_types?.name,
          request?.event_date ? formatEventDate(request.event_date) : null,
          request?.guest_count ? `${request.guest_count} guests` : null,
          request?.venue_name ?? request?.cities?.name,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={<StatusBadge status={proposal.status} />}
      />

      {proposal.status === 'accepted' ? (
        <Alert tone="success" className="mb-6" title="You accepted this proposal">
          Your event workspace has the confirmed vendors, schedule and payment plan.
        </Alert>
      ) : null}
      {proposal.status === 'changes_requested' ? (
        <Alert tone="info" className="mb-6" title="Changes requested">
          Our team is working on a revised version and will send it shortly.
        </Alert>
      ) : null}
      {proposal.status === 'rejected' ? (
        <Alert tone="info" className="mb-6" title="You declined this proposal">
          If circumstances change, let us know and we can revive it.
        </Alert>
      ) : null}

      <ProposalDetail
        readOnly={readOnly}
        proposal={{
          id: proposal.id,
          reference: proposal.reference,
          title: proposal.title,
          summary: proposal.summary,
          terms: proposal.terms,
          cancellationPolicy: proposal.cancellation_policy,
          status: proposal.status,
          partnerGrossMinor: proposal.partner_gross_minor,
          serviceFeeMinor: proposal.service_fee_minor,
          coordinationFeeMinor: proposal.coordination_fee_minor,
          deliveryFeeMinor: proposal.delivery_fee_minor,
          discountMinor: proposal.discount_minor,
          taxMinor: proposal.tax_minor,
          totalMinor: proposal.total_minor,
          depositBps: proposal.deposit_bps,
          depositMinor: proposal.deposit_minor,
          balanceDueDays: proposal.balance_due_days,
          validUntil: proposal.valid_until,
          eventDate: request?.event_date ?? null,
          guestCount: request?.guest_count ?? null,
          venueName: request?.venue_name ?? null,
          eventTypeName: request?.event_types?.name ?? null,
          cityName: request?.cities?.name ?? null,
        }}
        lines={lines.map((line) => {
          const category = line.service_categories as unknown as { name: string } | null;
          const partner = line.partner_profiles as unknown as {
            display_name: string; slug: string; rating_avg: number; rating_count: number;
          } | null;
          return {
            id: line.id,
            label: line.label,
            description: line.description,
            amount_minor: line.amount_minor,
            is_platform_line: line.is_platform_line,
            categoryName: category?.name ?? null,
            partnerName: partner?.display_name ?? null,
            partnerSlug: partner?.slug ?? null,
            partnerRating: partner?.rating_avg ?? null,
            partnerRatingCount: partner?.rating_count ?? null,
          };
        })}
      />
    </>
  );
}
