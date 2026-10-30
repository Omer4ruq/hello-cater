import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { Money } from '@/components/ui/money';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { brand } from '@/config/brand';

export const metadata = buildMetadata({
  title: 'Payment instructions', description: 'How to pay by bank transfer.',
  path: '/dashboard/payments', noIndex: true,
});

export const dynamic = 'force-dynamic';

/**
 * Offline settlement instructions.
 *
 * Shown when the platform is running without a payment gateway, or when
 * a corporate customer settles by transfer against an invoice. Finance
 * confirms receipt in the admin, which runs the same confirmation path
 * as a gateway callback.
 */
export default async function PaymentInstructionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUserPage(`/dashboard/payments/${id}/instructions`);

  const supabase = await createServerSupabase();
  const { data: payment } = await supabase
    .from('payments')
    .select('id, reference, amount_minor, purpose, status, event_id, events(id, title, reference)')
    .eq('id', id)
    .maybeSingle();

  if (!payment) notFound();
  const event = payment.events as unknown as { id: string; title: string; reference: string } | null;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-display-sm">Pay by bank transfer</h1>
      <p className="mt-3 text-ink-600">
        Transfer the amount below and quote your payment reference. We confirm receipt within one
        working day and your booking updates automatically.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <Building2 aria-hidden className="size-4 text-ink-400" /> Transfer details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <dl className="space-y-3 text-sm">
            <Row label="Amount"><Money minor={payment.amount_minor} className="text-base font-semibold" /></Row>
            <Row label="Payment reference">
              <span className="font-mono font-semibold text-ink-950">{payment.reference}</span>
            </Row>
            <Row label="Account name">{brand.legalName}</Row>
            <Row label="Bank">
              <span className="text-ink-500">To be configured in system settings</span>
            </Row>
            <Row label="Account number">
              <span className="text-ink-500">To be configured in system settings</span>
            </Row>
            {event ? <Row label="Event">{event.title} ({event.reference})</Row> : null}
          </dl>

          <Alert tone="warning" className="mt-5" title="Bank details not configured">
            Your finance team should add the receiving account to Admin → Settings before sharing
            this page with customers. Until then, contact {brand.supportEmail} for transfer details.
          </Alert>
        </CardContent>
      </Card>

      <Alert tone="info" className="mt-6" title="Quote your reference">
        <p className="flex items-start gap-2">
          <Copy aria-hidden className="mt-0.5 size-4 shrink-0" />
          Transfers without the reference <strong>{payment.reference}</strong> take longer to match
          and may delay your booking confirmation.
        </p>
      </Alert>

      <div className="mt-7 flex flex-wrap gap-3">
        {event ? (
          <Button asChild><Link href={`/dashboard/events/${event.id}`}>Back to your event</Link></Button>
        ) : null}
        <Button asChild variant="secondary"><Link href="/dashboard/payments">All payments</Link></Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-ink-100 pb-3 last:border-0">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-ink-900">{children}</dd>
    </div>
  );
}
