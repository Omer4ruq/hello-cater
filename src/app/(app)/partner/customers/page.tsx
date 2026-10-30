import { Users } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerCustomers } from '@/features/partner/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Customers', description: 'Your customer history.',
  path: '/partner/customers', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerCustomersPage() {
  const user = await requireUserPage('/partner/customers');
  const partner = activePartner(user);
  const customers = await getPartnerCustomers(partner.partnerId);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Who you have worked with through the platform, and what you delivered for them."
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customer history yet"
          description="Once you deliver your first booking, the customer and their event history appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {customers.map((customer) => (
            <Card key={customer.key}>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-sans text-base font-semibold text-ink-950">{customer.name}</h2>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Last event {formatDateShort(customer.lastDate)}
                    </p>
                  </div>
                  {customer.isCompany ? <Badge tone="brand">Company</Badge> : <Badge tone="neutral">Individual</Badge>}
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-ink-100 py-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-500">Events</dt>
                    <dd className="font-medium text-ink-900">{customer.bookings}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-500">Delivered</dt>
                    <dd className="font-medium text-ink-900">{customer.completed}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-500">Total value</dt>
                    <dd className="font-medium text-ink-900"><Money minor={customer.totalMinor} compact /></dd>
                  </div>
                </dl>

                <ul className="mt-3 space-y-1.5">
                  {customer.events.slice(0, 4).map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-ink-700">{event.title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-ink-500">
                        {formatDateShort(event.date)}
                        <StatusBadge status={event.status} />
                      </span>
                    </li>
                  ))}
                  {customer.events.length > 4 ? (
                    <li className="text-xs text-ink-500">+{customer.events.length - 4} more</li>
                  ) : null}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-ink-500">
        Direct contact details are held by the platform. All event communication runs through your
        message threads so commitments stay documented for both sides.
      </p>
    </>
  );
}
