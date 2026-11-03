import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, CreditCard, MapPin, Users } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/feedback';
import { InternalNotes } from '@/features/admin/components/internal-notes';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { countdown, formatDateTime, formatEventDate, formatTime } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Event workspace', description: 'Operations event workspace.',
  path: '/admin/events', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminEventWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUserPage(`/admin/events/${id}`);
  const supabase = await createServerSupabase();

  const [event, bookings, tasks, timeline, payments, notes, invoices] = await Promise.all([
    supabase
      .from('events')
      .select('id, reference, title, stage, event_date, event_end_date, start_time, end_time, guest_count, venue_name, address_line, venue_notes, total_minor, paid_minor, refunded_minor, customer_notes, created_at, event_manager_id, request_id, proposal_id, event_types(name), cities(name), areas(name), organizations(id, name), profiles(full_name, email, phone)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('bookings')
      .select('id, reference, status, service_date, service_time, delivery_window, headcount, gross_minor, commission_minor, partner_payable_minor, fulfilment_notes, partner_id, service_categories(name), partner_profiles(display_name, slug)')
      .eq('event_id', id),
    supabase
      .from('event_tasks')
      .select('id, title, detail, status, due_at, is_customer_visible, completed_at, profiles(full_name)')
      .eq('event_id', id)
      .order('due_at', { nullsFirst: false }),
    supabase
      .from('event_timeline')
      .select('id, kind, title, detail, visibility, created_at, profiles(full_name)')
      .eq('event_id', id)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('payments')
      .select('id, reference, purpose, status, amount_minor, gateway_fee_minor, method, paid_at, created_at')
      .eq('event_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('internal_notes')
      .select('id, body, created_at, profiles(full_name)')
      .eq('entity', 'event')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, number, kind, status, total_minor, paid_minor, issue_date, due_date')
      .eq('event_id', id),
  ]);

  if (!event.data) notFound();

  const record = event.data;
  const org = record.organizations as unknown as { id: string; name: string } | null;
  const customer = record.profiles as unknown as { full_name: string; email: string | null; phone: string | null } | null;
  const city = record.cities as unknown as { name: string } | null;
  const area = record.areas as unknown as { name: string } | null;

  const bookingRows = bookings.data ?? [];
  const outstanding = record.total_minor - record.paid_minor;
  const totalCommission = bookingRows.reduce((sum, b) => sum + b.commission_minor, 0);
  const totalPayable = bookingRows.reduce((sum, b) => sum + b.partner_payable_minor, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Operations', href: '/admin' },
          { label: 'Events', href: '/admin/events' },
          { label: record.reference },
        ]}
        title={record.title}
        description={`${record.reference} · ${formatEventDate(record.event_date)} · ${countdown(record.event_date)}`}
        actions={
          <>
            <StatusBadge status={record.stage} />
            {record.request_id ? (
              <Link
                href={`/admin/requests/${record.request_id}`}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                View originating request
              </Link>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={CalendarDays} label="Date & time">
          {formatEventDate(record.event_date)}
          <span className="block text-xs text-ink-500">
            {record.start_time ? formatTime(record.start_time) : 'Time TBC'}
          </span>
        </Tile>
        <Tile icon={Users} label="Guests">{record.guest_count ?? '—'}</Tile>
        <Tile icon={MapPin} label="Venue">
          {record.venue_name ?? '—'}
          <span className="block text-xs text-ink-500">{[area?.name, city?.name].filter(Boolean).join(', ')}</span>
        </Tile>
        <Tile icon={CreditCard} label="Collected">
          <Money minor={record.paid_minor} /> / <Money minor={record.total_minor} />
          {outstanding > 0 ? (
            <span className="block text-xs text-warning-700"><Money minor={outstanding} /> outstanding</span>
          ) : (
            <span className="block text-xs text-success-700">Fully paid</span>
          )}
        </Tile>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0">
          <Tabs defaultValue="vendors">
            <TabsList>
              <TabsTrigger value="vendors">Vendors ({bookingRows.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="money">Money</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="vendors">
              {bookingRows.length === 0 ? (
                <EmptyState title="No vendor bookings" description="Bookings are created when the customer accepts a proposal." />
              ) : (
                <Card className="overflow-hidden p-0">
                  <TableWrap label="Event vendors" className="rounded-none border-0">
                    <Table>
                      <THead>
                        <TR>
                          <TH>Partner</TH><TH>Line</TH><TH>Service date</TH><TH>Headcount</TH>
                          <TH className="text-right">Gross</TH>
                          <TH className="text-right">Commission</TH>
                          <TH className="text-right">Payable</TH>
                          <TH>Status</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {bookingRows.map((booking) => {
                          const partner = booking.partner_profiles as unknown as { display_name: string; slug: string } | null;
                          const category = booking.service_categories as unknown as { name: string } | null;
                          return (
                            <TR key={booking.id}>
                              <TD>
                                <Link href={`/admin/partners/${booking.partner_id}`} className="font-medium text-brand-700 hover:underline">
                                  {partner?.display_name ?? 'Partner'}
                                </Link>
                                <span className="block font-mono text-xs text-ink-500">{booking.reference}</span>
                              </TD>
                              <TD>{category ? <Badge tone="neutral">{category.name}</Badge> : '—'}</TD>
                              <TD className="whitespace-nowrap text-xs">
                                {formatEventDate(booking.service_date)}
                                {booking.service_time ? (
                                  <span className="block text-ink-500">{formatTime(booking.service_time)}</span>
                                ) : booking.delivery_window ? (
                                  <span className="block text-ink-500">{booking.delivery_window}</span>
                                ) : null}
                              </TD>
                              <TD>{booking.headcount ?? '—'}</TD>
                              <TDNum><Money minor={booking.gross_minor} /></TDNum>
                              <TDNum className="text-ink-600"><Money minor={booking.commission_minor} /></TDNum>
                              <TDNum><Money minor={booking.partner_payable_minor} /></TDNum>
                              <TD><StatusBadge status={booking.status} /></TD>
                            </TR>
                          );
                        })}
                      </TBody>
                    </Table>
                  </TableWrap>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks">
              {(tasks.data ?? []).length === 0 ? (
                <EmptyState title="No tasks yet" description="Add tasks to track what has to happen before the event day." />
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-ink-100">
                      {(tasks.data ?? []).map((task) => (
                        <li key={task.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-950">
                              {task.title}
                              {task.is_customer_visible ? (
                                <Badge tone="info" className="ml-2">Customer sees this</Badge>
                              ) : (
                                <Badge tone="neutral" className="ml-2">Internal</Badge>
                              )}
                            </p>
                            {task.detail ? <p className="mt-0.5 text-sm text-ink-600">{task.detail}</p> : null}
                            <p className="mt-1 text-xs text-ink-500">
                              {task.due_at ? `Due ${formatDateTime(task.due_at)}` : 'No due date'}
                              {(task.profiles as unknown as { full_name: string } | null)?.full_name
                                ? ` · ${(task.profiles as unknown as { full_name: string }).full_name}`
                                : ''}
                            </p>
                          </div>
                          <StatusBadge status={task.status} />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="money">
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle as="h2">Event economics</CardTitle></CardHeader>
                  <CardContent className="pt-3">
                    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Figure label="Customer total" value={record.total_minor} />
                      <Figure label="Collected" value={record.paid_minor} tone="success" />
                      <Figure label="Commission" value={totalCommission} />
                      <Figure label="Partner payable" value={totalPayable} />
                    </dl>
                    {record.refunded_minor > 0 ? (
                      <p className="mt-4 text-sm text-ink-600">
                        <Money minor={record.refunded_minor} /> refunded on this event.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader><CardTitle as="h2">Payments</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {(payments.data ?? []).length === 0 ? (
                      <p className="p-5 text-sm text-ink-600">No payments recorded.</p>
                    ) : (
                      <TableWrap label="Event payments" className="rounded-none border-0">
                        <Table>
                          <THead>
                            <TR><TH>Reference</TH><TH>Purpose</TH><TH className="text-right">Amount</TH><TH>Method</TH><TH>Status</TH><TH>Paid</TH></TR>
                          </THead>
                          <TBody>
                            {(payments.data ?? []).map((payment) => (
                              <TR key={payment.id}>
                                <TD className="font-mono text-xs">{payment.reference}</TD>
                                <TD className="capitalize">{payment.purpose}</TD>
                                <TDNum><Money minor={payment.amount_minor} /></TDNum>
                                <TD>{payment.method ?? '—'}</TD>
                                <TD><StatusBadge status={payment.status} /></TD>
                                <TD className="whitespace-nowrap text-xs text-ink-500">
                                  {payment.paid_at ? formatDateTime(payment.paid_at) : '—'}
                                </TD>
                              </TR>
                            ))}
                          </TBody>
                        </Table>
                      </TableWrap>
                    )}
                  </CardContent>
                </Card>

                {(invoices.data ?? []).length > 0 ? (
                  <Card className="overflow-hidden">
                    <CardHeader><CardTitle as="h2">Invoices</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <TableWrap label="Event invoices" className="rounded-none border-0">
                        <Table>
                          <THead><TR><TH>Number</TH><TH>Type</TH><TH className="text-right">Total</TH><TH className="text-right">Paid</TH><TH>Status</TH></TR></THead>
                          <TBody>
                            {(invoices.data ?? []).map((invoice) => (
                              <TR key={invoice.id}>
                                <TD>
                                  <Link href={`/invoices/${invoice.id}`} className="font-mono text-xs text-brand-700 hover:underline">
                                    {invoice.number}
                                  </Link>
                                </TD>
                                <TD className="capitalize">{invoice.kind.replace(/_/g, ' ')}</TD>
                                <TDNum><Money minor={invoice.total_minor} /></TDNum>
                                <TDNum><Money minor={invoice.paid_minor} /></TDNum>
                                <TD><StatusBadge status={invoice.status} /></TD>
                              </TR>
                            ))}
                          </TBody>
                        </Table>
                      </TableWrap>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader><CardTitle as="h2">Everything that happened</CardTitle></CardHeader>
                <CardContent className="pt-3">
                  {(timeline.data ?? []).length === 0 ? (
                    <p className="text-sm text-ink-600">Nothing logged yet.</p>
                  ) : (
                    <ol className="space-y-4">
                      {(timeline.data ?? []).map((entry) => (
                        <li key={entry.id} className="flex gap-3">
                          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-700" />
                          <div>
                            <p className="text-sm font-medium text-ink-900">
                              {entry.title}
                              <Badge tone="neutral" className="ml-2">{entry.visibility}</Badge>
                            </p>
                            {entry.detail ? <p className="mt-0.5 text-sm text-ink-600">{entry.detail}</p> : null}
                            <p className="mt-0.5 text-xs text-ink-500">
                              {formatDateTime(entry.created_at)}
                              {(entry.profiles as unknown as { full_name: string } | null)?.full_name
                                ? ` · ${(entry.profiles as unknown as { full_name: string }).full_name}`
                                : ''}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle as="h2">Customer</CardTitle></CardHeader>
            <CardContent className="pt-3 text-sm">
              <p className="font-medium text-ink-950">{customer?.full_name ?? '—'}</p>
              {org ? <p className="mt-0.5 text-ink-600">{org.name}</p> : <p className="mt-0.5 text-ink-500">Individual</p>}
              {customer?.phone ? (
                <p className="mt-2">
                  <a href={`tel:${customer.phone}`} className="text-brand-700 hover:underline">{customer.phone}</a>
                </p>
              ) : null}
              {customer?.email ? (
                <p className="mt-1">
                  <a href={`mailto:${customer.email}`} className="break-all text-brand-700 hover:underline">{customer.email}</a>
                </p>
              ) : null}
              {record.customer_notes ? (
                <div className="mt-4 border-t border-ink-100 pt-3">
                  <p className="text-xs font-medium text-ink-500">Their requirements</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{record.customer_notes}</p>
                </div>
              ) : null}
              {record.venue_notes ? (
                <div className="mt-4 border-t border-ink-100 pt-3">
                  <p className="text-xs font-medium text-ink-500">Venue access</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{record.venue_notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <InternalNotes
            entity="event"
            entityId={record.id}
            notes={(notes.data ?? []).map((n) => ({
              id: n.id, body: n.body, createdAt: n.created_at,
              authorName: (n.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Staff',
            }))}
          />
        </div>
      </div>
    </>
  );
}

function Tile({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <Icon aria-hidden className="size-3.5" /> {label}
      </p>
      <div className="mt-1.5 text-sm font-medium text-ink-950">{children}</div>
    </Card>
  );
}

function Figure({ label, value, tone }: { label: string; value: number; tone?: 'success' }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className={`mt-1 font-sans text-xl font-semibold ${tone === 'success' ? 'text-success-700' : 'text-ink-950'}`}>
        <Money minor={value} />
      </dd>
    </div>
  );
}
