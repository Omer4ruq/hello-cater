import Link from 'next/link';
import {
  ArrowRight, CalendarCheck, ClipboardList, Inbox, MessageSquare,
  Star, TrendingUp, Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerDashboard, getPartnerProfile } from '@/features/partner/queries';
import { buildMetadata } from '@/lib/seo';
import { formatEventDate, formatTime, countdown, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Partner dashboard', description: 'Your requests, bookings and earnings.',
  path: '/partner', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerDashboardPage() {
  const user = await requireUserPage('/partner');
  const partner = activePartner(user);
  const [data, profile] = await Promise.all([
    getPartnerDashboard(partner.partnerId),
    getPartnerProfile(partner.partnerId),
  ]);

  return (
    <>
      <PageHeader
        title={profile?.display_name ?? partner.name}
        description="Everything that needs your attention today."
        actions={
          <Button asChild variant="secondary">
            <Link href="/partner/requests">
              <Inbox aria-hidden /> View requests
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="New requests" icon={Inbox} href="/partner/requests"
          value={data.newInviteCount}
          hint={data.newInviteCount ? 'awaiting your response' : 'nothing new'}
        />
        <Stat
          label="Quotes to finish" icon={ClipboardList} href="/partner/quotes"
          value={data.pendingQuoteCount}
          hint={data.pendingQuoteCount ? 'drafts and revisions' : 'all sent'}
        />
        <Stat
          label="This month" icon={TrendingUp} href="/partner/earnings"
          value={<Money minor={data.monthlyRevenueMinor} compact />}
          hint="your share after commission"
        />
        <Stat
          label="Pending payout" icon={Wallet} href="/partner/payouts"
          value={<Money minor={data.pendingPayoutMinor} compact />}
          hint="delivered, awaiting settlement"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Today's jobs" icon={CalendarCheck} href="/partner/calendar" value={data.todayJobs.length} />
        <Stat label="Upcoming events" icon={CalendarCheck} href="/partner/bookings" value={data.upcomingBookings.length} />
        <Stat label="Unread messages" icon={MessageSquare} href="/partner/messages" value={data.unreadMessages} />
        <Stat
          label="Average rating" icon={Star} href="/partner/reviews"
          value={profile?.rating_count ? `${profile.rating_avg.toFixed(1)} ★` : '—'}
          hint={profile?.rating_count ? `${profile.rating_count} reviews` : 'no reviews yet'}
        />
      </div>

      {data.todayJobs.length > 0 ? (
        <Card className="mt-6 border-ink-900 ring-1 ring-ink-900">
          <CardHeader><CardTitle as="h2">Today</CardTitle></CardHeader>
          <CardContent className="pt-3">
            <ul className="divide-y divide-ink-100">
              {data.todayJobs.map((booking) => {
                const event = booking.events as unknown as { title: string; venue_name: string | null } | null;
                return (
                  <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                    <div>
                      <Link href={`/partner/bookings?q=${booking.reference}`} className="text-sm font-medium text-ink-950 hover:underline">
                        {event?.title ?? booking.reference}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-600">
                        {booking.service_time ? formatTime(booking.service_time) : booking.delivery_window ?? 'Time TBC'}
                        {booking.headcount ? ` · ${booking.headcount} guests` : ''}
                        {event?.venue_name ? ` · ${event.venue_name}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle as="h2">New quotation requests</CardTitle>
            <Link href="/partner/requests" className="text-sm font-semibold text-ink-900 underline-offset-4 hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {data.newInvites.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No open requests"
                description="When a customer requirement matches your services, area and capacity, it appears here first."
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.newInvites.map((invite) => {
                  const request = invite.service_requests as unknown as {
                    reference: string; event_date: string | null; guest_count: number | null;
                    event_types: { name: string } | null; cities: { name: string } | null;
                  } | null;
                  return (
                    <li key={invite.id}>
                      <Link
                        href={`/partner/requests/${invite.id}`}
                        className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 hover:bg-ink-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink-950">
                            {request?.event_types?.name ?? 'Event'}
                            {request?.guest_count ? ` · ${request.guest_count} guests` : ''}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {request?.event_date ? formatEventDate(request.event_date) : 'Date TBC'}
                            {request?.cities?.name ? ` · ${request.cities.name}` : ''}
                            {invite.respond_by ? ` · respond ${countdown(invite.respond_by)}` : ''}
                          </span>
                        </span>
                        <ArrowRight aria-hidden className="size-4 shrink-0 text-ink-400" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle as="h2">Upcoming bookings</CardTitle>
            <Link href="/partner/bookings" className="text-sm font-semibold text-ink-900 underline-offset-4 hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {data.upcomingBookings.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="Nothing booked yet" description="Confirmed jobs appear here with their timing, headcount and venue." />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.upcomingBookings.map((booking) => {
                  const event = booking.events as unknown as { title: string; venue_name: string | null } | null;
                  return (
                    <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-950">{event?.title ?? booking.reference}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {formatEventDate(booking.service_date)} · {countdown(booking.service_date)}
                          {booking.headcount ? ` · ${booking.headcount} guests` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Money minor={booking.gross_minor} className="text-sm font-medium" />
                        <StatusBadge status={booking.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {data.recentReviews.length > 0 ? (
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle as="h2">Recent reviews</CardTitle>
              <Link href="/partner/reviews" className="text-sm font-semibold text-ink-900 underline-offset-4 hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-4 md:grid-cols-3">
                {data.recentReviews.map((review) => (
                  <li key={review.id} className="rounded-2xl border border-ink-200 p-5">
                    <p className="text-sm font-medium text-ink-900">{'★'.repeat(review.rating)}</p>
                    {review.title ? <p className="mt-1.5 text-sm font-medium text-ink-950">{review.title}</p> : null}
                    {review.comment ? <p className="mt-1 line-clamp-3 text-sm text-ink-600">{review.comment}</p> : null}
                    <p className="mt-2 text-xs text-ink-500">{relativeDate(review.created_at)}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
