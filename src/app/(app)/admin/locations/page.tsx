import { MapPin } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Locations', description: 'Districts, cities and areas.',
  path: '/admin/locations', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminLocationsPage() {
  await requireUserPage('/admin/locations');
  const supabase = await createServerSupabase();

  const { data: districts } = await supabase
    .from('districts')
    .select('id, slug, name, name_bn, division, is_active, cities(id, slug, name, name_bn, is_active, is_launched, areas(id, name, is_active))')
    .order('name');

  return (
    <>
      <PageHeader
        title="Locations"
        description="Where the platform operates. Opening a new district is a data change, not a deploy."
      />

      <Alert tone="info" className="mb-6" title="How coverage works">
        A city must be both active and launched before customers can select it. Partners declare
        service areas within a city; a partner with no specific areas is treated as covering the
        whole city.
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        {(districts ?? []).map((district) => {
          const cities = (district.cities as unknown as {
            id: string; slug: string; name: string; name_bn: string | null;
            is_active: boolean; is_launched: boolean; areas: { id: string; name: string; is_active: boolean }[];
          }[] | null) ?? [];

          return (
            <Card key={district.id}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle as="h2" className="flex items-center gap-2">
                    <MapPin aria-hidden className="size-4 text-ink-400" />
                    {district.name}
                  </CardTitle>
                  {district.division ? (
                    <p className="text-xs text-ink-500">{district.division} division</p>
                  ) : null}
                </div>
                {district.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Not launched</Badge>}
              </CardHeader>
              <CardContent className="pt-3">
                {cities.length === 0 ? (
                  <p className="text-sm text-ink-600">No cities configured.</p>
                ) : (
                  <ul className="space-y-3">
                    {cities.map((city) => (
                      <li key={city.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-ink-950">
                            {city.name}
                            {city.name_bn ? <span lang="bn" className="ml-1.5 text-ink-500">{city.name_bn}</span> : null}
                          </p>
                          <span className="flex gap-1.5">
                            {city.is_launched ? <Badge tone="success">Live</Badge> : <Badge tone="warning">Coming soon</Badge>}
                          </span>
                        </div>
                        {city.areas.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {city.areas.filter((a) => a.is_active).map((area) => (
                              <Badge key={area.id} tone="neutral" className="text-[0.68rem]">{area.name}</Badge>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
