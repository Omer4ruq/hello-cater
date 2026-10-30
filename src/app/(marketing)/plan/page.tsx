import { Suspense } from 'react';
import { EventWizard, type WizardCatalog } from '@/features/requests/components/event-wizard';
import { getSessionUser } from '@/features/auth/session';
import { getCategories, getCities, getAreas, getCuisines, getEventTypes } from '@/features/content/queries';
import { buildMetadata } from '@/lib/seo';
import { SkeletonCard } from '@/components/ui/feedback';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata = buildMetadata({
  title: 'Plan an event',
  description:
    'Tell us about your event and receive comparable quotations from verified catering and event partners in Dhaka. Free and non-binding.',
  path: '/plan',
});

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const user = isSupabaseConfigured ? await getSessionUser().catch(() => null) : null;

  const [eventTypes, cities, areas, categories, cuisines] = await Promise.all([
    getEventTypes(), getCities(), getAreas('dhaka'), getCategories(), getCuisines(),
  ]);

  const catalog: WizardCatalog = {
    eventTypes: eventTypes.map((e) => ({
      id: e.id, name: e.name, segment: e.segment,
      typicalMin: e.typical_guests_min, typicalMax: e.typical_guests_max,
    })),
    cities: cities.map((c) => ({ id: c.id, name: c.name, isLaunched: c.is_launched })),
    areas: areas.map((a) => ({ id: a.id, name: a.name, cityId: a.city_id })),
    categories: categories.map((c) => ({
      id: c.id, name: c.name, kind: c.kind, parentId: c.parent_id, description: c.short_description,
    })),
    cuisines: cuisines.map((c) => ({ id: c.id, name: c.name })),
    organizations: (user?.customerOrgs ?? []).map((o) => ({ id: o.organizationId, name: o.organizationName })),
  };

  return (
    <div className="container-page py-12 lg:py-16">
      <Suspense fallback={<SkeletonCard />}>
        <EventWizard catalog={catalog} isAuthenticated={Boolean(user)} />
      </Suspense>
    </div>
  );
}
