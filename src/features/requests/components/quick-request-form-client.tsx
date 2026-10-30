'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field, FieldControl, FieldLabel } from '@/components/ui/field';
import { track } from '@/lib/analytics';

const SEGMENT_ORDER = ['corporate', 'wedding', 'private', 'social', 'government'] as const;
const SEGMENT_LABELS: Record<string, string> = {
  corporate: 'Corporate', wedding: 'Wedding', private: 'Private',
  social: 'Social & religious', government: 'Government & NGO',
};

/**
 * The hero capture form. Collects only the four facts that make a brief
 * useful, then hands off to the full wizard with those answers prefilled
 * — so nobody retypes what they just entered.
 */
export function QuickRequestFormClient({
  eventTypes, cities,
}: {
  eventTypes: { id: string; name: string; segment: string }[];
  cities: { id: string; name: string; isLaunched: boolean }[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [eventTypeId, setEventTypeId] = React.useState('');
  const [eventDate, setEventDate] = React.useState('');
  const [guestCount, setGuestCount] = React.useState('');
  const [cityId, setCityId] = React.useState(() => cities.find((c) => c.isLaunched)?.id ?? '');
  const [error, setError] = React.useState<string | null>(null);

  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const grouped = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const type of eventTypes) {
      map.set(type.segment, [...(map.get(type.segment) ?? []), { id: type.id, name: type.name }]);
    }
    return SEGMENT_ORDER.filter((s) => map.has(s)).map((s) => ({ segment: s, items: map.get(s)! }));
  }, [eventTypes]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!eventTypeId) {
      setError('Choose the type of event to continue.');
      return;
    }
    setError(null);
    setPending(true);
    track('request_started', { source: 'home_hero', eventTypeId });

    const params = new URLSearchParams({ eventType: eventTypeId });
    if (eventDate) params.set('date', eventDate);
    if (guestCount) params.set('guests', guestCount);
    if (cityId) params.set('city', cityId);
    router.push(`/plan?${params.toString()}`);
  }

  // With no catalogue data (e.g. before the database is configured) the
  // form still offers a working route into the wizard.
  if (eventTypes.length === 0) {
    return (
      <Button asChild block size="lg">
        <a href="/plan">
          Start your request <ArrowRight aria-hidden />
        </a>
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field error={error}>
        <FieldLabel>What are you planning?</FieldLabel>
        <FieldControl>
          <Select value={eventTypeId} onChange={(e) => setEventTypeId(e.target.value)} required>
            <option value="">Choose an event type</option>
            {grouped.map((group) => (
              <optgroup key={group.segment} label={SEGMENT_LABELS[group.segment] ?? group.segment}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </FieldControl>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel optional>Event date</FieldLabel>
          <FieldControl>
            <Input type="date" min={today} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </FieldControl>
        </Field>
        <Field>
          <FieldLabel optional>Guests</FieldLabel>
          <FieldControl>
            <Input
              type="number" min={1} max={100000} inputMode="numeric" placeholder="e.g. 250"
              value={guestCount} onChange={(e) => setGuestCount(e.target.value)}
            />
          </FieldControl>
        </Field>
      </div>

      <Field>
        <FieldLabel>City</FieldLabel>
        <FieldControl>
          <Select value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {cities.map((city) => (
              <option key={city.id} value={city.id} disabled={!city.isLaunched}>
                {city.name}{city.isLaunched ? '' : ' (coming soon)'}
              </option>
            ))}
          </Select>
        </FieldControl>
      </Field>

      <Button type="submit" block size="lg" loading={pending}>
        Continue <ArrowRight aria-hidden />
      </Button>

      <p className="text-center text-xs text-ink-500">
        Free and non-binding. No payment details required.
      </p>
    </form>
  );
}
