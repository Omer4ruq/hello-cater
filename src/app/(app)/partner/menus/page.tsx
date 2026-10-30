import { Utensils } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/ui/money';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerCatalog } from '@/features/partner/queries';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Menus', description: 'Your menus and dishes.', path: '/partner/menus', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerMenusPage() {
  const user = await requireUserPage('/partner/menus');
  const partner = activePartner(user);
  const catalog = await getPartnerCatalog(partner.partnerId);

  return (
    <>
      <PageHeader
        title="Menus"
        description="Your dishes and prices. The quote builder imports a whole menu in one click, so you are not retyping items for every brief."
      />

      {catalog.menus.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No menus yet"
          description="Menus are set up with your account manager during onboarding. Once they exist, you can pull them straight into a quotation."
        />
      ) : (
        <div className="space-y-6">
          {catalog.menus.map((menu) => {
            const items = (menu.menu_items as unknown as {
              id: string; name: string; description: string | null; unit: string;
              price_minor: number; is_vegetarian: boolean; is_active: boolean; sort_order: number;
            }[] | null) ?? [];
            const cuisine = menu.cuisines as unknown as { name: string } | null;

            return (
              <Card key={menu.id}>
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle as="h2">{menu.name}</CardTitle>
                    {menu.description ? <p className="text-sm text-ink-600">{menu.description}</p> : null}
                  </div>
                  <div className="flex gap-1.5">
                    {cuisine ? <Badge tone="saffron">{cuisine.name}</Badge> : null}
                    {menu.is_active ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Hidden</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <ul className="divide-y divide-ink-100">
                    {items
                      .filter((i) => i.is_active)
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-ink-900">
                              {item.name}
                              {item.is_vegetarian ? <Badge tone="success" className="ml-2">Veg</Badge> : null}
                            </p>
                            {item.description ? (
                              <p className="mt-0.5 text-sm text-ink-600">{item.description}</p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-right text-sm font-medium text-ink-950">
                            <Money minor={item.price_minor} />
                            <span className="block text-xs font-normal text-ink-500">
                              {item.unit.replace(/_/g, ' ')}
                            </span>
                          </p>
                        </li>
                      ))}
                    {items.filter((i) => i.is_active).length === 0 ? (
                      <li className="py-4 text-sm text-ink-500">No active items in this menu.</li>
                    ) : null}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Alert tone="info" className="mt-6" title="Keeping prices current">
        Menu prices are your starting point, not a commitment — you set the final figure on each
        quotation. Still, keeping them realistic means customers self-select and you waste fewer
        quotes.
      </Alert>
    </>
  );
}
