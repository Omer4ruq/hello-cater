import Link from 'next/link';
import {
  ArrowRight, CalendarDays, CreditCard, FileText, Plus, Sparkles, Users,
} from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { getCustomerOverview } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatEventDate, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Dashboard', description: 'Your events at a glance.', path: '/dashboard', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function CustomerOverviewPage() {
  const user = await requireUserPage('/dashboard');
  const data = await getCustomerOverview(user);

  const firstName = (user.profile.full_name || '').split(' ')[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Your dashboard'}
        description="Track requests, review proposals and manage upcoming events."
        actions={
          <Button asChild>
            <Link href="/plan"><Plus aria-hidden /> New request</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Open requests" icon={FileText} href="/dashboard/requests"
          value={data.recentRequests.filter((r) => !['won', 'lost', 'cancelled', 'expired'].includes(r.status)).length}
          hint="awaiting quotations"
        />
        <Stat
          label="Proposals to review" icon={Sparkles} href="/dashboard/proposals"
          value={data.pendingProposals.length}
          hint={data.pendingProposals.length ? 'action needed' : 'nothing waiting'}
        />
        <Stat
          label="Upcoming events" icon={CalendarDays} href="/dashboard/events"
          value={data.upcomingEvents.length}
          hint={data.upcomingEvents[0] ? formatEventDate(data.upcomingEvents[0].event_date) : 'none scheduled'}
        />
        <Stat
          label="Outstanding" icon={CreditCard} href="/dashboard/invoices"
          value={<Money minor={data.outstandingMinor} compact />}
          hint={`${data.openInvoices.length} open ${data.openInvoices.length === 1 ? 'invoice' : 'invoices'}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------ Proposals to review */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle as="h2">Proposals waiting for you</CardTitle>
            <Link href="/dashboard/proposals" className="text-sm font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.pendingProposals.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No proposals yet"
                description="Once partners have quoted against your requirement, our team assembles a proposal and it lands here."
                action={<Button asChild variant="secondary"><Link href="/plan">Submit a requirement</Link></Button>}
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.pendingProposals.map((proposal) => (
                  <li key={proposal.id}>
                    <Link
                      href={`/dashboard/proposals/${proposal.id}`}
                      className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 hover:bg-ink-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink-950">
                          {proposal.title || proposal.reference}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {proposal.reference}
                          {proposal.valid_until ? ` · valid until ${formatEventDate(proposal.valid_until)}` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <Money minor={proposal.total_minor} className="text-sm font-semibold" />
                        <ArrowRight aria-hidden className="size-4 text-ink-400" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ---------------------------------------------- Upcoming events */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle as="h2">Upcoming events</CardTitle>
            <Link href="/dashboard/events" className="text-sm font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Nothing scheduled"
                description="Confirmed events appear here with their full timeline, vendors and payments."
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.upcomingEvents.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 hover:bg-ink-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink-950">{event.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                          {formatEventDate(event.event_date)}
                          {event.guest_count ? <><span aria-hidden>·</span><Users aria-hidden className="size-3" />{event.guest_count}</> : null}
                          {event.venue_name ? <><span aria-hidden>·</span>{event.venue_name}</> : null}
                        </span>
                      </span>
                      <StatusBadge status={event.stage} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* -------------------------------------------- Recent requests */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle as="h2">Recent requests</CardTitle>
            <Link href="/dashboard/requests" className="text-sm font-medium text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentRequests.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No requests yet"
                description="Tell us what you are planning and we will arrange matched, verified partners to quote."
                action={<Button asChild><Link href="/plan">Plan an event</Link></Button>}
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.recentRequests.map((request) => (
                  <li key={request.id}>
                    <Link
                      href={`/dashboard/requests/${request.id}`}
                      className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-ink-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink-950">
                          {request.title || (request.event_types as { name: string } | null)?.name || request.reference}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {request.reference} · submitted {relativeDate(request.created_at)}
                          {request.event_date ? ` · event ${formatEventDate(request.event_date)}` : ''}
                        </span>
                      </span>
                      <StatusBadge status={request.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
