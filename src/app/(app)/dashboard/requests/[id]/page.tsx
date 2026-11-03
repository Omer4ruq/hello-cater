import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Sparkles, Star, Users } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, statusLabel } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { getCustomerRequest } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { formatEventDate, formatTime, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Request', description: 'Your event requirement.', path: '/dashboard/requests', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUserPage(`/dashboard/requests/${id}`);

  const data = await getCustomerRequest(id);
  if (!data) notFound();

  const { request, services, proposals, invitesTotal, invitesAccepted, history } = data;
  const eventType = request.event_types as unknown as { name: string; slug: string } | null;
  const city = request.cities as unknown as { name: string } | null;
  const area = request.areas as unknown as { name: string } | null;

  const budget =
    request.budget_mode === 'total' && request.budget_total_minor
      ? <Money minor={request.budget_total_minor} />
      : request.budget_mode === 'per_person' && request.budget_per_person_minor
        ? <><Money minor={request.budget_per_person_minor} /> per person</>
        : request.budget_mode === 'range' && request.budget_min_minor && request.budget_max_minor
          ? <><Money minor={request.budget_min_minor} /> – <Money minor={request.budget_max_minor} /></>
          : 'Flexible';

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Requests', href: '/dashboard/requests' },
          { label: request.reference },
        ]}
        title={request.title || eventType?.name || request.reference}
        description={`${request.reference} · submitted ${relativeDate(request.submitted_at ?? request.created_at)}`}
        actions={<StatusBadge status={request.status} />}
      />

      {proposals.length > 0 ? (
        <Alert tone="success" className="mb-6" title="You have a proposal to review">
          <Link href={`/dashboard/proposals/${proposals[0].id}`} className="font-medium underline underline-offset-4">
            Open proposal {proposals[0].reference}
          </Link>{' '}
          — <Money minor={proposals[0].total_minor} />
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle as="h2">Your requirement</CardTitle></CardHeader>
            <CardContent className="pt-3">
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <Detail icon={CalendarDays} label="Date">
                  {formatEventDate(request.event_date)}
                  {request.event_end_date ? ` → ${formatEventDate(request.event_end_date)}` : ''}
                  {request.start_time ? `, ${formatTime(request.start_time)}` : ''}
                  {request.is_date_flexible ? <Badge tone="neutral" className="ml-2">Flexible</Badge> : null}
                </Detail>
                <Detail icon={Users} label="Guests">
                  {request.guest_count}
                  {request.guest_count_max ? `–${request.guest_count_max}` : ''}
                </Detail>
                <Detail icon={MapPin} label="Location">
                  {[request.venue_name, area?.name, city?.name].filter(Boolean).join(', ') || '—'}
                </Detail>
                <Detail label="Budget">{budget}</Detail>
              </dl>

              <div className="mt-6">
                <p className="text-sm font-medium text-ink-900">Services requested</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {services.map((service) => {
                    const category = service.service_categories as unknown as { name: string } | null;
                    return <Badge key={service.category_id} tone="brand">{category?.name ?? 'Service'}</Badge>;
                  })}
                </div>
              </div>

              {request.dietary_notes ? (
                <div className="mt-5">
                  <p className="text-sm font-medium text-ink-900">Dietary and menu notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">{request.dietary_notes}</p>
                </div>
              ) : null}

              {request.requirements ? (
                <div className="mt-5">
                  <p className="text-sm font-medium text-ink-900">Additional requirements</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">{request.requirements}</p>
                </div>
              ) : null}

              {request.venue_notes ? (
                <div className="mt-5">
                  <p className="text-sm font-medium text-ink-900">Venue access notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">{request.venue_notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {proposals.length > 0 ? (
            <section aria-labelledby="proposals-heading">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="proposals-heading" className="font-sans text-xl font-bold tracking-tight text-ink-900">Proposals</h2>
                <p className="text-sm text-ink-500">
                  {proposals.length} {proposals.length === 1 ? 'version' : 'versions'}
                </p>
              </div>
              <ul className="motion-stagger mt-4 grid gap-4 sm:grid-cols-2">
                {proposals.map((proposal, index) => {
                  const latest = index === 0;
                  return (
                    <li key={proposal.id} className="min-w-0">
                      <Link
                        href={`/dashboard/proposals/${proposal.id}`}
                        className={cn(
                          'group flex h-full flex-col rounded-2xl border bg-white p-5 transition-[box-shadow,border-color] duration-200 hover:shadow-md',
                          latest ? 'border-ink-900 ring-1 ring-ink-900' : 'border-ink-200 hover:border-ink-300',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {latest ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                              <Star aria-hidden className="size-3.5 fill-current" /> Latest version
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-ink-500">Version {proposal.version_no}</span>
                          )}
                          <StatusBadge status={proposal.status} />
                        </div>
                        <p className="mt-3 truncate text-base font-semibold text-ink-900">
                          {proposal.title || `Proposal ${proposal.reference}`}
                        </p>
                        <p className="text-sm text-ink-500">
                          {proposal.reference}{latest ? ` · v${proposal.version_no}` : ''}
                        </p>
                        <p className="mt-5 text-sm text-ink-600">Total</p>
                        <Money minor={proposal.total_minor} className="font-sans text-3xl font-extrabold tracking-tight text-ink-900 tabular-nums" />
                        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
                          <span className="text-ink-500">
                            {proposal.valid_until ? `Valid until ${formatEventDate(proposal.valid_until)}` : proposal.sent_at ? `Sent ${relativeDate(proposal.sent_at)}` : ''}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-ink-900">
                            Review <ArrowRight aria-hidden className="icon-nudge size-4" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle as="h2">Progress</CardTitle></CardHeader>
            <CardContent className="pt-3">
              <div className="mb-5 rounded-xl bg-ink-50 p-3.5">
                <p className="flex items-center gap-2 text-sm text-ink-700">
                  <Sparkles aria-hidden className="size-4 text-brand-700" />
                  {invitesTotal === 0
                    ? 'Our team is shortlisting partners for you.'
                    : `${invitesTotal} ${invitesTotal === 1 ? 'partner' : 'partners'} approached · ${invitesAccepted} quoting`}
                </p>
              </div>

              <ol className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-700" />
                    <span className="text-sm">
                      <span className="block text-ink-900">{statusLabel(entry.to_status)}</span>
                      <span className="block text-xs text-ink-500">{relativeDate(entry.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle as="h2">Need to change something?</CardTitle></CardHeader>
            <CardContent className="pt-3 text-sm text-ink-600">
              <p>Guest count moved? Date shifted? Tell us and we will update the partners.</p>
              <Button asChild variant="secondary" block className="mt-4">
                <Link href="/dashboard/messages">Message our team</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Detail({
  icon: Icon, label, children,
}: {
  icon?: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm font-medium text-ink-500">
        {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink-900">{children}</dd>
    </div>
  );
}
