import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { StatusBadge } from '@/components/ui/status-badge';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatDateTime } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Payment result', description: 'Payment outcome.',
  path: '/dashboard/payments', noIndex: true,
});

export const dynamic = 'force-dynamic';

/**
 * Landing page after returning from the gateway.
 *
 * The state shown is read from our own record, which is only marked paid
 * after a server-side validation call — never from the redirect payload.
 */
export default async function PaymentResultPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  await requireUserPage(`/dashboard/payments/${id}/result`);

  const supabase = await createServerSupabase();
  const { data: payment } = await supabase
    .from('payments')
    .select('id, reference, status, amount_minor, purpose, method, paid_at, event_id, events(id, title, reference, total_minor, paid_minor)')
    .eq('id', id)
    .maybeSingle();

  if (!payment) notFound();

  const event = payment.events as unknown as {
    id: string; title: string; reference: string; total_minor: number; paid_minor: number;
  } | null;
  const settled = payment.status === 'paid';
  const outstanding = event ? event.total_minor - event.paid_minor : 0;

  return (
    <div className="mx-auto max-w-xl py-8">
      <Card className="p-8 text-center">
        <span
          className={`mx-auto grid size-14 place-items-center rounded-full ${
            settled ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
          }`}
        >
          {settled ? <CheckCircle2 aria-hidden className="size-6" /> : <Clock aria-hidden className="size-6" />}
        </span>

        <h1 className="mt-6 text-display-sm">
          {settled ? 'Payment received' : 'We are confirming your payment'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-600">
          {settled
            ? 'Thank you. Your booking is updated and a receipt is on its way by email.'
            : status === 'pending'
              ? 'Your bank is still confirming this transaction. We will update your booking and email you the moment it clears — usually within a few minutes.'
              : 'We are checking the status with the payment provider. Nothing further is needed from you right now.'}
        </p>

        <CardContent className="mt-6 rounded-lg bg-ink-50 p-4 text-left">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-600">Reference</dt>
              <dd className="font-mono text-ink-900">{payment.reference}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-600">Amount</dt>
              <dd className="font-medium text-ink-900"><Money minor={payment.amount_minor} /></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-600">Status</dt>
              <dd><StatusBadge status={payment.status} /></dd>
            </div>
            {payment.paid_at ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Paid at</dt>
                <dd className="text-ink-900">{formatDateTime(payment.paid_at)}</dd>
              </div>
            ) : null}
            {event && outstanding > 0 ? (
              <div className="flex justify-between gap-4 border-t border-ink-200 pt-2">
                <dt className="text-ink-600">Still outstanding</dt>
                <dd className="font-medium text-warning-700"><Money minor={outstanding} /></dd>
              </div>
            ) : null}
          </dl>
        </CardContent>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {event ? (
            <Button asChild size="lg"><Link href={`/dashboard/events/${event.id}`}>Open your event</Link></Button>
          ) : null}
          <Button asChild size="lg" variant="secondary">
            <Link href="/dashboard/payments">All payments</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
