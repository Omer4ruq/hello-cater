import Link from 'next/link';
import { LifeBuoy, Mail, Phone } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { TicketForm } from '@/features/support/components/ticket-form';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { relativeDate } from '@/lib/dates';
import { brand } from '@/config/brand';

export const metadata = buildMetadata({
  title: 'Support', description: 'Get help.', path: '/dashboard/support', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  await requireUserPage('/dashboard/support');
  const supabase = await createServerSupabase();

  const [{ data: tickets }, { data: events }] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id, reference, subject, category, status, priority, created_at, resolution')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('events')
      .select('id, title, reference')
      .order('event_date', { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <PageHeader
        title="Support"
        description="Raise an issue about a booking, a payment or your account. We respond within one working day."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div>
          <h2 className="mb-3 font-sans text-base font-semibold text-ink-950">Your tickets</h2>
          {(tickets ?? []).length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="No tickets"
              description="Nothing open. If something goes wrong with an event, raise it here so it is recorded and tracked."
            />
          ) : (
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-ink-100">
                {(tickets ?? []).map((ticket) => (
                  <li key={ticket.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-950">{ticket.subject}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          <span className="font-mono">{ticket.reference}</span>
                          <span className="mx-1.5" aria-hidden>·</span>
                          {relativeDate(ticket.created_at)}
                          <Badge tone="neutral" className="ml-2 capitalize">
                            {ticket.category.replace(/_/g, ' ')}
                          </Badge>
                        </p>
                        {ticket.resolution ? (
                          <p className="mt-2 rounded-lg bg-success-50 p-2.5 text-sm text-success-700">
                            {ticket.resolution}
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge status={ticket.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <h2 className="mb-3 mt-8 font-sans text-base font-semibold text-ink-950">Raise a new ticket</h2>
          <Card>
            <CardContent>
              <TicketForm events={(events ?? []).map((e) => ({ id: e.id, label: `${e.title} (${e.reference})` }))} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle as="h2">Urgent on the day?</CardTitle></CardHeader>
            <CardContent className="pt-3 text-sm">
              <p className="text-ink-600">
                If your event is happening now, call us — do not raise a ticket.
              </p>
              <p className="mt-3 flex items-center gap-2">
                <Phone aria-hidden className="size-4 text-ink-400" />
                <a href={`tel:${brand.supportPhone}`} className="font-medium text-brand-700 hover:underline">
                  {brand.supportPhoneDisplay}
                </a>
              </p>
              <p className="mt-2 flex items-center gap-2">
                <Mail aria-hidden className="size-4 text-ink-400" />
                <a href={`mailto:${brand.supportEmail}`} className="break-all font-medium text-brand-700 hover:underline">
                  {brand.supportEmail}
                </a>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle as="h2">About a specific event?</CardTitle></CardHeader>
            <CardContent className="pt-3 text-sm text-ink-600">
              <p>
                Messaging your event manager on the event thread is usually faster and keeps
                everything in one place.
              </p>
              <Link href="/dashboard/messages" className="mt-3 inline-block font-medium text-brand-700 underline underline-offset-4">
                Open messages
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
