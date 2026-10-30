'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { track } from '@/lib/analytics';
import { brand } from '@/config/brand';

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

  // Without catalogue data (e.g. before the database is configured) the
  // bar still works: occasion and city are picked in the wizard instead.
  const hasCatalogue = eventTypes.length > 0;

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
    if (hasCatalogue && !eventTypeId) {
      setError('Choose the type of event to continue.');
      return;
    }
    setError(null);
    setPending(true);
    track('request_started', { source: 'home_hero', eventTypeId });

    const params = new URLSearchParams();
    if (eventTypeId) params.set('eventType', eventTypeId);
    if (eventDate) params.set('date', eventDate);
    if (guestCount) params.set('guests', guestCount);
    if (cityId) params.set('city', cityId);
    router.push(`/plan?${params.toString()}`);
  }

  const errorId = React.useId();

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div
        className={
          'flex flex-col rounded-3xl border border-ink-300 bg-white p-1.5 shadow-sm transition-colors duration-200 ' +
          'md:flex-row md:items-center md:rounded-full md:p-0 has-[:focus]:bg-ink-100'
        }
      >
        <BarSegment label="Occasion" className="md:flex-[1.5] md:pl-8">
          {hasCatalogue ? (
            <Select
              variant="bare"
              aria-label="Occasion"
              value={eventTypeId}
              onChange={(e) => { setEventTypeId(e.target.value); setError(null); }}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            >
              <option value="">What are you planning?</option>
              {grouped.map((group) => (
                <optgroup key={group.segment} label={SEGMENT_LABELS[group.segment] ?? group.segment}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          ) : (
            <span className="truncate text-sm text-ink-500">Choose on the next step</span>
          )}
        </BarSegment>
        <BarDivider />
        <BarSegment label="Date">
          <input
            type="date" min={today} value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={barControl + (eventDate ? '' : ' text-ink-500')}
          />
        </BarSegment>
        <BarDivider />
        <BarSegment label="Guests">
          <input
            type="number" min={1} max={100000} inputMode="numeric" placeholder="How many?"
            value={guestCount} onChange={(e) => setGuestCount(e.target.value)}
            className={barControl}
          />
        </BarSegment>
        <BarDivider />
        <BarSegment label="City">
          {cities.length === 0 ? (
            <span className="truncate text-sm text-ink-900">{brand.launchCity}</span>
          ) : (
            <Select variant="bare" aria-label="City" value={cityId} onChange={(e) => setCityId(e.target.value)}>
              {cities.map((city) => (
                <option key={city.id} value={city.id} disabled={!city.isLaunched}>
                  {city.name}{city.isLaunched ? '' : ' (coming soon)'}
                </option>
              ))}
            </Select>
          )}
        </BarSegment>
        <Button type="submit" size="lg" loading={pending} className="mt-1.5 rounded-full md:my-2 md:ml-1 md:mr-2 md:mt-2">
          <Search aria-hidden /> Get proposals
        </Button>
      </div>

      <p id={errorId} role="alert" className="mt-3 min-h-5 text-center text-sm font-medium text-danger-700">
        {error}
      </p>
    </form>
  );
}

const barControl =
  'w-full min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-sm text-ink-900 ' +
  'placeholder:text-ink-500 focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-50 ' +
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/** One field of the pill bar; lifts out as a white pill while focused. */
function BarSegment({
  label, className, children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={
        'flex min-w-0 flex-1 cursor-pointer flex-col justify-center rounded-full px-6 py-3 ' +
        'transition-[background-color,box-shadow] duration-200 ease-out ' +
        'hover:bg-ink-100 focus-within:bg-white focus-within:shadow-lg focus-within:hover:bg-white ' +
        'md:min-h-16 ' + (className ?? '')
      }
    >
      <span className="text-xs font-bold text-ink-900">{label}</span>
      {children}
    </label>
  );
}

function BarDivider() {
  // Fades out beside the focused segment, so the lifted pill reads as one shape.
  return (
    <span
      aria-hidden
      className="hidden h-8 w-px shrink-0 bg-ink-300 transition-opacity duration-200 md:block [label:focus-within+&]:opacity-0 [&:has(+label:focus-within)]:opacity-0"
    />
  );
}
