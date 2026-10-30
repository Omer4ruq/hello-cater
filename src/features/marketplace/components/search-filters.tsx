'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';

export type FilterOption = { value: string; label: string; group?: string };

/**
 * Marketplace filters.
 *
 * State lives entirely in the URL so a filtered search is shareable and
 * server-rendered — no client-side dataset, no hydration of thousands of
 * rows. On mobile the panel collapses behind a single button instead of
 * stacking ten selects down the page.
 */
export function SearchFilters({
  categories, cities, areas, cuisines, eventTypes, resultCount,
}: {
  categories: FilterOption[];
  cities: FilterOption[];
  areas: FilterOption[];
  cuisines: FilterOption[];
  eventTypes: FilterOption[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(searchParams.get('q') ?? '');
  const [, startTransition] = React.useTransition();

  const apply = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === '') params.delete(key);
        else params.set(key, value);
      }
      params.delete('page');
      track('filter_applied', updates);
      startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (query === current) return;
    const timer = setTimeout(() => apply({ q: query || null }), 400);
    return () => clearTimeout(timer);
  }, [query, apply, searchParams]);

  const active = ['category', 'city', 'area', 'cuisine', 'eventType', 'guests', 'minRating', 'sort']
    .filter((key) => searchParams.get(key));

  const selects = [
    { key: 'category', label: 'Service', options: categories },
    { key: 'city', label: 'City', options: cities },
    { key: 'area', label: 'Area', options: areas },
    { key: 'eventType', label: 'Event type', options: eventTypes },
    { key: 'cuisine', label: 'Cuisine', options: cuisines },
  ];

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <Input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search partners by name…" aria-label="Search partners" className="pl-9"
          />
        </div>

        <Button
          variant="secondary"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="lg:hidden"
        >
          <SlidersHorizontal aria-hidden /> Filters
          {active.length > 0 ? <Badge tone="brand">{active.length}</Badge> : null}
        </Button>

        <Select
          aria-label="Sort by"
          className="w-auto min-w-40"
          value={searchParams.get('sort') ?? 'recommended'}
          onChange={(e) => apply({ sort: e.target.value === 'recommended' ? null : e.target.value })}
        >
          <option value="recommended">Recommended</option>
          <option value="rating">Highest rated</option>
          <option value="price_low">Lowest price</option>
          <option value="experience">Most experienced</option>
        </Select>
      </div>

      <div className={cn('mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6', !open && 'hidden lg:grid')}>
        {selects.map((filter) => (
          <Select
            key={filter.key}
            aria-label={filter.label}
            value={searchParams.get(filter.key) ?? ''}
            onChange={(e) => apply({ [filter.key]: e.target.value || null })}
          >
            <option value="">{filter.label}: any</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        ))}

        <Input
          type="number" min={1} placeholder="Guests"
          aria-label="Minimum capacity for guests"
          defaultValue={searchParams.get('guests') ?? ''}
          onBlur={(e) => apply({ guests: e.target.value || null })}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-sm text-ink-600" aria-live="polite">
          {resultCount} verified {resultCount === 1 ? 'partner' : 'partners'}
        </p>
        {active.length > 0 || query ? (
          <Button
            variant="ghost" size="sm"
            onClick={() => {
              setQuery('');
              startTransition(() => router.push(pathname, { scroll: false }));
            }}
          >
            <X aria-hidden /> Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
