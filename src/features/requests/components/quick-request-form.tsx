import { getCities, getEventTypes } from '@/features/content/queries';
import { QuickRequestFormClient } from './quick-request-form-client';

/**
 * Server wrapper so the homepage hero form has real catalogue data
 * without the page needing to know how to fetch it.
 */
export async function QuickRequestForm() {
  const [eventTypes, cities] = await Promise.all([getEventTypes(), getCities()]);
  return (
    <QuickRequestFormClient
      eventTypes={eventTypes.map((e) => ({ id: e.id, name: e.name, segment: e.segment }))}
      cities={cities.map((c) => ({ id: c.id, name: c.name, isLaunched: c.is_launched }))}
    />
  );
}
