import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays, CheckCircle2, Circle, CreditCard, FileText, MapPin, Star, Users,
} from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { Money } from '@/components/ui/money';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { getCustomerEvent } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateTime, formatEventDate, formatTime, countdown } from '@/lib/dates';
import { PayNowButton } from '@/features/payments/components/pay-now-button';

export const metadata = buildMetadata({
  title: 'Event', description: 'Your event workspace.', path: '/dashboard/events', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUserPage(`/dashboard/events/${id}`);

  const data = await getCustomerEvent(id);
  if (!data) notFound();

  const { event, bookings, tasks, timeline, documents, payments } = data;
  const city = event.cities as unknown as { name: string } | null;
  const area = event.areas as unknown as { name: string } | null;
  const outstanding = event.total_minor - event.paid_minor;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Events', href: '/dashboard/events' },
          { label: event.reference },
        ]}
        title={event.title}
        description={`${event.reference} · ${formatEventDate(event.event_date)} · ${countdown(event.event_date)}`}
        actions={
          <>
            <StatusBadge status={event.stage} />
            {outstanding > 0 ? (
              <PayNowButton eventId={event.id} amountMinor={outstanding} />
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile icon={CalendarDays} label="Date & time">
          {formatEventDate(event.event_date)}
          <span className="block text-xs text-ink-500">
            {event.start_time ? formatTime(event.start_time) : 'Time to be confirmed'}
          </span>
        </SummaryTile>
        <SummaryTile icon={Users} label="Guests">{event.guest_count ?? '—'}</SummaryTile>
        <SummaryTile icon={MapPin} label="Venue">
          {event.venue_name ?? '—'}
          <span className="block text-xs text-ink-500">{[area?.name, city?.name].filter(Boolean).join(', ')}</span>
        </SummaryTile>
        <SummaryTile icon={CreditCard} label="Payment">
          <Money minor={event.paid_minor} /> / <Money minor={event.total_minor} />
          {outstanding > 0 ? (
            <span className="block text-xs text-warning-700"><Money minor={outstanding} /> outstanding</span>
          ) : (
            <span className="block text-xs text-success-700">Fully paid</span>
          )}
        </SummaryTile>
      </div>

      <Tabs defaultValue="vendors" className="mt-6">
        <TabsList>
          <TabsTrigger value="vendors">Vendors ({bookings.length})</TabsTrigger>
          <TabsTrigger value="checklist">Checklist ({tasks.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="timeline">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors">
          <div className="grid gap-4 md:grid-cols-2">
            {bookings.map((booking) => {
              const partner = booking.partner_profiles as unknown as {
                display_name: string; slug: string; logo_url: string | null; rating_avg: number;
              } | null;
              const category = booking.service_categories as unknown as { name: string } | null;
              return (
                <Card key={booking.id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-sans text-base font-semibold text-ink-950">
                            {partner?.display_name ?? 'Partner'}
                          </h3>
                          <VerifiedBadge />
                        </div>
                        {category ? <Badge tone="neutral" className="mt-1.5">{category.name}</Badge> : null}
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>

                    <dl className="mt-4 space-y-1.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-600">Service date</dt>
                        <dd className="text-ink-900">{formatEventDate(booking.service_date)}</dd>
                      </div>
                      {booking.service_time ? (
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-600">Time</dt>
                          <dd className="text-ink-900">{formatTime(booking.service_time)}</dd>
                        </div>
                      ) : null}
                      {booking.headcount ? (
                        <div className="flex justify-between gap-3">
                          <dt className="text-ink-600">Headcount</dt>
                          <dd className="text-ink-900">{booking.headcount}</dd>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-600">Value</dt>
                        <dd className="font-medium text-ink-900"><Money minor={booking.gross_minor} /></dd>
                      </div>
                    </dl>

                    {booking.fulfilment_notes ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
                        {booking.fulfilment_notes}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {['completed', 'closed'].includes(booking.status) ? (
                        <Button asChild size="sm">
                          <Link href={`/dashboard/bookings/${booking.id}/review`}>
                            <Star aria-hidden /> Leave a review
                          </Link>
                        </Button>
                      ) : null}
                      {partner?.slug ? (
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/partners/${partner.slug}`}>View profile</Link>
                        </Button>
                      ) : null}
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/dashboard/messages">Message</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="checklist">
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing for you to do right now"
              description="Your event manager adds items here whenever they need something from you — a final headcount, a guest list or an approval."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-ink-100">
                  {tasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-3 p-4">
                      {task.status === 'done' ? (
                        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success-500" />
                      ) : (
                        <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-300" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={task.status === 'done' ? 'text-sm text-ink-500 line-through' : 'text-sm font-medium text-ink-950'}>
                          {task.title}
                        </p>
                        {task.detail ? <p className="mt-0.5 text-sm text-ink-600">{task.detail}</p> : null}
                        {task.due_at ? (
                          <p className="mt-1 text-xs text-ink-500">Due {formatDateTime(task.due_at)}</p>
                        ) : null}
                      </div>
                      <StatusBadge status={task.status} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments yet" description="Payments against this event appear here with their receipts." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-ink-100">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-sm font-medium text-ink-950">
                          {payment.purpose === 'deposit' ? 'Deposit' : payment.purpose === 'balance' ? 'Balance' : 'Payment'}
                          <span className="ml-2 font-mono text-xs text-ink-500">{payment.reference}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {payment.paid_at ? formatDateTime(payment.paid_at) : formatDateTime(payment.created_at)}
                          {payment.method ? ` · ${payment.method}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Money minor={payment.amount_minor} className="text-sm font-semibold" />
                        <StatusBadge status={payment.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents">
          {documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents yet" description="Contracts, floor plans, run sheets and menus shared with you appear here." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-ink-100">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <FileText aria-hidden className="size-4 text-ink-400" />
                        <div>
                          <p className="text-sm font-medium text-ink-950">{doc.title}</p>
                          <p className="text-xs text-ink-500">{formatDateTime(doc.created_at)}</p>
                        </div>
                      </div>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/api/files/event-documents?path=${encodeURIComponent(doc.storage_path)}`}>
                          Download
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle as="h2">Activity</CardTitle></CardHeader>
            <CardContent className="pt-3">
              {timeline.length === 0 ? (
                <p className="text-sm text-ink-600">Nothing logged yet.</p>
              ) : (
                <ol className="space-y-4">
                  {timeline.map((entry) => (
                    <li key={entry.id} className="flex gap-3">
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-700" />
                      <div>
                        <p className="text-sm font-medium text-ink-900">{entry.title}</p>
                        {entry.detail ? <p className="mt-0.5 text-sm text-ink-600">{entry.detail}</p> : null}
                        <p className="mt-0.5 text-xs text-ink-500">{formatDateTime(entry.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function SummaryTile({
  icon: Icon, label, children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <p className="flex items-center gap-1.5 text-sm font-medium text-ink-500">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </p>
      <div className="mt-1.5 text-base font-semibold text-ink-900">{children}</div>
    </Card>
  );
}
