import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PrintButton } from '@/features/invoices/components/print-button';
import { Money } from '@/components/ui/money';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';
import { brand } from '@/config/brand';

export const metadata = buildMetadata({
  title: 'Invoice', description: 'Invoice detail.', path: '/invoices', noIndex: true,
});

export const dynamic = 'force-dynamic';

/**
 * Printable invoice.
 *
 * RLS decides visibility: only the billed customer, their company
 * colleagues, the partner on a statement, or finance staff can load it.
 * "Download PDF" uses the browser's print-to-PDF — deliberate, because a
 * headless renderer is a heavy dependency for a document the browser
 * already produces faithfully, and it works offline and on mobile.
 */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUserPage(`/invoices/${id}`);

  const supabase = await createServerSupabase();
  const [{ data: invoice }, { data: items }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, events(title, reference, event_date, venue_name), partner_profiles(display_name)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('invoice_items')
      .select('id, label, description, quantity, unit_price_minor, line_total_minor, sort_order')
      .eq('invoice_id', id)
      .order('sort_order'),
  ]);

  if (!invoice) notFound();

  const event = invoice.events as unknown as {
    title: string; reference: string; event_date: string; venue_name: string | null;
  } | null;
  const isStatement = invoice.kind === 'partner_statement';
  const outstanding = invoice.total_minor - invoice.paid_minor;

  return (
    <div className="min-h-dvh bg-ink-50 py-8 print:bg-white print:py-0">
      <div className="container-page max-w-3xl">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={isStatement ? '/partner/payouts' : '/dashboard/invoices'}>← Back</Link>
          </Button>
          <div className="flex items-center gap-2">
            <StatusBadge status={invoice.status} />
            <PrintButton />
          </div>
        </div>

        <article className="rounded-xl border border-ink-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink-200 pb-6">
            <div>
              <p className="font-display text-2xl font-semibold text-brand-800">
                {brand.shortName} <span className="text-saffron-500">BD</span>
              </p>
              <address className="mt-2 not-italic text-sm leading-relaxed text-ink-600">
                {brand.legalName}
                <br />
                {brand.address.line1}
                <br />
                {brand.address.city}, {brand.address.country}
                <br />
                {brand.supportEmail}
              </address>
            </div>
            <div className="text-right">
              <h1 className="font-sans text-xl font-semibold uppercase tracking-wide text-ink-950">
                {isStatement ? 'Settlement statement' : invoice.kind === 'credit_note' ? 'Credit note' : 'Invoice'}
              </h1>
              <p className="mt-1 font-mono text-sm text-ink-700">{invoice.number}</p>
              <dl className="mt-3 space-y-0.5 text-sm">
                <div className="flex justify-end gap-3">
                  <dt className="text-ink-500">Issued</dt>
                  <dd className="text-ink-900">{formatDateShort(invoice.issue_date)}</dd>
                </div>
                {invoice.due_date ? (
                  <div className="flex justify-end gap-3">
                    <dt className="text-ink-500">Due</dt>
                    <dd className="text-ink-900">{formatDateShort(invoice.due_date)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </header>

          <section className="grid gap-6 border-b border-ink-200 py-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {isStatement ? 'Settled to' : 'Billed to'}
              </h2>
              <p className="mt-2 font-medium text-ink-950">{invoice.bill_to_name}</p>
              {invoice.bill_to_address ? (
                <p className="mt-0.5 text-sm text-ink-600">{invoice.bill_to_address}</p>
              ) : null}
              {invoice.bill_to_email ? (
                <p className="mt-0.5 text-sm text-ink-600">{invoice.bill_to_email}</p>
              ) : null}
              {invoice.bill_to_phone ? (
                <p className="mt-0.5 text-sm text-ink-600">{invoice.bill_to_phone}</p>
              ) : null}
              {invoice.bill_to_tin ? (
                <p className="mt-0.5 text-sm text-ink-600">TIN: {invoice.bill_to_tin}</p>
              ) : null}
            </div>

            {event ? (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Event</h2>
                <p className="mt-2 font-medium text-ink-950">{event.title}</p>
                <p className="mt-0.5 text-sm text-ink-600">{event.reference}</p>
                <p className="mt-0.5 text-sm text-ink-600">{formatDateShort(event.event_date)}</p>
                {event.venue_name ? <p className="mt-0.5 text-sm text-ink-600">{event.venue_name}</p> : null}
              </div>
            ) : null}
          </section>

          <section className="py-6">
            <table className="w-full text-sm">
              <caption className="sr-only">Invoice line items</caption>
              <thead>
                <tr className="border-b border-ink-200 text-left">
                  <th scope="col" className="pb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Description</th>
                  <th scope="col" className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Qty</th>
                  <th scope="col" className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Unit</th>
                  <th scope="col" className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {(items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5">
                      <span className="block text-ink-900">{item.label}</span>
                      {item.description ? (
                        <span className="block text-xs text-ink-500">{item.description}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-ink-700">{Number(item.quantity)}</td>
                    <td className="py-2.5 text-right tabular-nums text-ink-700">
                      <Money minor={item.unit_price_minor} />
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-medium text-ink-950">
                      <Money minor={item.line_total_minor ?? 0} />
                    </td>
                  </tr>
                ))}
                {(items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-ink-500">No line items recorded.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <dl className="ml-auto mt-6 max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="tabular-nums text-ink-900"><Money minor={invoice.subtotal_minor} /></dd>
              </div>
              {invoice.discount_minor > 0 ? (
                <div className="flex justify-between gap-6">
                  <dt className="text-ink-600">{isStatement ? 'Commission' : 'Discount'}</dt>
                  <dd className="tabular-nums text-ink-900">−<Money minor={invoice.discount_minor} /></dd>
                </div>
              ) : null}
              {invoice.tax_minor > 0 ? (
                <div className="flex justify-between gap-6">
                  <dt className="text-ink-600">VAT</dt>
                  <dd className="tabular-nums text-ink-900"><Money minor={invoice.tax_minor} /></dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-6 border-t border-ink-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums"><Money minor={invoice.total_minor} /></dd>
              </div>
              {!isStatement ? (
                <>
                  <div className="flex justify-between gap-6">
                    <dt className="text-ink-600">Paid</dt>
                    <dd className="tabular-nums text-success-700"><Money minor={invoice.paid_minor} /></dd>
                  </div>
                  <div className="flex justify-between gap-6 font-semibold">
                    <dt>Balance due</dt>
                    <dd className={`tabular-nums ${outstanding > 0 ? 'text-warning-700' : 'text-success-700'}`}>
                      <Money minor={outstanding} />
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
          </section>

          <footer className="border-t border-ink-200 pt-6 text-sm text-ink-600">
            {invoice.notes ? <p>{invoice.notes}</p> : null}
            {invoice.terms ? <p className="mt-2">{invoice.terms}</p> : null}
            <p className="mt-4 text-xs text-ink-500">
              All amounts in {brand.currency}. Generated by {brand.name} on{' '}
              {formatDateShort(new Date().toISOString())}.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
