import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Money, PerPerson } from '@/components/ui/money';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerCatalog } from '@/features/partner/queries';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Packages', description: 'Your sellable packages.',
  path: '/partner/services', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerPackagesPage() {
  const user = await requireUserPage('/partner/services');
  const partner = activePartner(user);
  const catalog = await getPartnerCatalog(partner.partnerId);

  return (
    <>
      <PageHeader
        title="Packages"
        description="Pre-priced offerings customers can browse and request directly. They also prefill your quote builder."
      />

      <Alert tone="info" className="mb-6" title="Packages are marketing, quotes are the contract">
        A package sets expectations and helps customers find you. The binding price is always the
        written quotation you submit against a specific brief.
      </Alert>

      {catalog.packages.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No packages yet"
          description="Packages are set up with your account manager during onboarding, so pricing and inclusions are checked before they go public."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.packages.map((pkg) => {
            const items = (pkg.package_items as unknown as {
              id: string; label: string; detail: string | null; is_optional: boolean; sort_order: number;
            }[] | null) ?? [];
            const category = pkg.service_categories as unknown as { name: string } | null;

            return (
              <Card key={pkg.id} className="flex flex-col overflow-hidden">
                {pkg.hero_image_url ? (
                  <div className="relative h-32">
                    <Image src={pkg.hero_image_url} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />
                  </div>
                ) : null}
                <CardContent className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-sans text-base font-semibold text-ink-950">{pkg.name}</h2>
                    <div className="flex shrink-0 gap-1.5">
                      {pkg.is_featured ? <Badge tone="saffron">Featured</Badge> : null}
                      {pkg.is_active ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Hidden</Badge>}
                    </div>
                  </div>
                  {category ? <Badge tone="clay" className="mt-1.5 self-start">{category.name}</Badge> : null}
                  {pkg.description ? (
                    <p className="mt-2.5 text-sm text-ink-600">{pkg.description}</p>
                  ) : null}

                  {items.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-ink-700">
                      {items.sort((a, b) => a.sort_order - b.sort_order).slice(0, 6).map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-clay-500" />
                          <span>
                            {item.label}
                            {item.is_optional ? <span className="text-ink-500"> (optional)</span> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-auto border-t border-ink-100 pt-3">
                    <p className="text-sm">
                      {pkg.per_person_price_minor > 0 ? (
                        <PerPerson minor={pkg.per_person_price_minor} className="font-semibold text-ink-950" />
                      ) : (
                        <span className="font-semibold text-ink-950"><Money minor={pkg.base_price_minor} /></span>
                      )}
                    </p>
                    {pkg.min_guests ? (
                      <p className="mt-0.5 text-xs text-ink-500">
                        {pkg.min_guests}{pkg.max_guests ? `–${pkg.max_guests}` : '+'} guests
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
