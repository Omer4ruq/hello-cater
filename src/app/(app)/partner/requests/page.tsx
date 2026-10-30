import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, listPartnerInvites } from '@/features/partner/queries';
import { buildMetadata } from '@/lib/seo';
import { formatEventDate, countdown, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Requests', description: 'Quotation requests matched to your business.',
  path: '/partner/requests', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage('/partner/requests');
  const partner = activePartner(user);
  const params = await searchParams;

  const { rows, total, page, pageCount } = await listPartnerInvites(partner.partnerId, {
    page: Number(params.page) || 1,
    status: params.status,
  });

  return (
    <>
      <PageHeader
        title="Quotation requests"
        description="Briefs our team matched to your services, area and capacity. Declining is free — but your response rate affects future matching."
      />

      <DataToolbar
        searchPlaceholder="Search requests…"
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: 'invited', label: 'New' },
            { value: 'viewed', label: 'Viewed' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'declined', label: 'Declined' },
            { value: 'expired', label: 'Expired' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          description="Keep your packages, service areas, capacity and availability up to date — our matching engine uses all of them to decide who gets invited."
          action={<Button asChild variant="secondary"><Link href="/partner/profile">Update your profile</Link></Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((invite) => {
              const request = invite.service_requests as unknown as {
                reference: string; title: string; event_date: string | null;
                guest_count: number | null; guest_count_max: number | null;
                budget_mode: string; budget_total_minor: number | null;
                budget_per_person_minor: number | null; venue_name: string | null;
                event_types: { name: string } | null;
                cities: { name: string } | null; areas: { name: string } | null;
              };
              const category = invite.service_categories as unknown as { name: string } | null;

              return (
                <Card key={invite.id} interactive className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-sans text-base font-semibold text-ink-950">
                          {request?.event_types?.name ?? 'Event'}
                        </h2>
                        <p className="mt-0.5 text-xs text-ink-500">{request?.reference}</p>
                      </div>
                      <StatusBadge status={invite.status} />
                    </div>

                    {category ? <Badge tone="clay" className="mt-2.5 self-start">{category.name}</Badge> : null}

                    <dl className="mt-4 space-y-1.5 text-sm">
                      <Row label="Date" value={request?.event_date ? formatEventDate(request.event_date) : 'To be confirmed'} />
                      <Row
                        label="Guests"
                        value={request?.guest_count ? `${request.guest_count}${request.guest_count_max ? `–${request.guest_count_max}` : ''}` : '—'}
                      />
                      <Row
                        label="Location"
                        value={[request?.venue_name, request?.areas?.name, request?.cities?.name].filter(Boolean).join(', ') || '—'}
                      />
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-600">Budget</dt>
                        <dd className="text-ink-900">
                          {request?.budget_total_minor ? <Money minor={request.budget_total_minor} />
                            : request?.budget_per_person_minor ? <><Money minor={request.budget_per_person_minor} />/person</>
                            : 'Flexible'}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto pt-4">
                      {invite.respond_by ? (
                        <p className="mb-2.5 text-xs text-warning-700">
                          Respond {countdown(invite.respond_by)}
                        </p>
                      ) : (
                        <p className="mb-2.5 text-xs text-ink-500">Received {relativeDate(invite.invited_at)}</p>
                      )}
                      <Button asChild block size="sm">
                        <Link href={`/partner/requests/${invite.id}`}>
                          {invite.status === 'accepted' ? 'Continue your quote' : 'View brief'}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Pagination
            page={page} pageCount={pageCount} total={total}
            basePath="/partner/requests" searchParams={params}
          />
        </>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-600">{label}</dt>
      <dd className="truncate text-right text-ink-900">{value}</dd>
    </div>
  );
}
