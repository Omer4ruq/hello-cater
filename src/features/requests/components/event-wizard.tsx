'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm, useWatch, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, CircleCheck, Loader2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select, Textarea, TakaInput } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/ui/money';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { brand } from '@/config/brand';
import {
  eventRequestSchema, WIZARD_STEPS, STEP_FIELDS,
  type EventRequestInput, type EventRequestParsed, type WizardStepId,
} from '../schema';
import { submitEventRequest } from '../actions';

export type WizardCatalog = {
  eventTypes: { id: string; name: string; segment: string; typicalMin: number | null; typicalMax: number | null }[];
  cities: { id: string; name: string; isLaunched: boolean }[];
  areas: { id: string; name: string; cityId: string }[];
  categories: { id: string; name: string; kind: string; parentId: string | null; description: string | null }[];
  cuisines: { id: string; name: string }[];
  organizations: { id: string; name: string }[];
};

const SEGMENT_LABELS: Record<string, string> = {
  corporate: 'Corporate', wedding: 'Wedding', private: 'Private',
  social: 'Social & religious', government: 'Government & NGO',
};

const DRAFT_KEY = 'evently:request-draft';

export function EventWizard({ catalog, isAuthenticated }: { catalog: WizardCatalog; isAuthenticated: boolean }) {
  const searchParams = useSearchParams();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ reference: string; needsSignIn: boolean; accountCreated: boolean } | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const step = WIZARD_STEPS[stepIndex];

  const form = useForm<EventRequestInput, unknown, EventRequestParsed>({
    resolver: zodResolver(eventRequestSchema) as Resolver<EventRequestInput, unknown, EventRequestParsed>,
    mode: 'onTouched',
    defaultValues: {
      eventTypeId: searchParams.get('eventType') ?? '',
      title: '',
      eventDate: searchParams.get('date') ?? '',
      eventEndDate: null,
      startTime: null,
      endTime: null,
      isDateFlexible: false,
      guestCount: Number(searchParams.get('guests')) || undefined,
      guestCountMax: null,
      cityId: searchParams.get('city') ?? catalog.cities.find((c) => c.isLaunched)?.id ?? '',
      areaId: null,
      venueName: '',
      addressLine: '',
      venueNotes: '',
      categoryIds: [],
      cuisineIds: [],
      dietaryNotes: '',
      budgetMode: 'flexible',
      budgetTotalMinor: null,
      budgetPerPersonMinor: null,
      budgetMinMinor: null,
      budgetMaxMinor: null,
      requirements: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      preferredChannel: 'phone',
      organizationId: null,
      company_website: '',
    },
  });

  /**
   * Restores an in-progress draft after a refresh or an accidental
   * navigation, so a customer does not lose ten minutes of typing.
   *
   * This has to run in an effect: sessionStorage does not exist during
   * server rendering, and reading it in a `useState` initialiser would
   * make the first client render disagree with the server's HTML. The
   * lint rule guards against cascading renders from repeated setState;
   * this runs exactly once on mount, which is the documented exception
   * for syncing with a browser-only store.
   */
  React.useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(DRAFT_KEY);
    } catch {
      // Unavailable in private mode; nothing to restore.
    }
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<EventRequestInput> & { __step?: number };
      const { __step, ...savedValues } = parsed;
      form.reset({ ...form.getValues(), ...savedValues });
      if (typeof __step === 'number') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage on mount
        setStepIndex(Math.min(Math.max(__step, 0), WIZARD_STEPS.length - 1));
      }
    } catch {
      // A corrupt draft is not worth surfacing to the customer.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  /**
   * Persists the draft.
   *
   * Called on every step change and before submitting, rather than
   * subscribing to each keystroke: it is the same protection against
   * losing work to a refresh, without a write per character.
   */
  const saveDraft = React.useCallback(
    (step: number) => {
      try {
        window.sessionStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ ...form.getValues(), __step: step }),
        );
      } catch {
        // sessionStorage is unavailable in private mode; not worth surfacing.
      }
    },
    [form],
  );

  // `useWatch` rather than `form.watch()`: the latter returns a fresh
  // subscription each render, which opts this component out of React
  // Compiler memoisation.
  const values = useWatch({ control: form.control }) as EventRequestInput;
  const selectedCityAreas = catalog.areas.filter((a) => a.cityId === values.cityId);
  const selectedEventType = catalog.eventTypes.find((e) => e.id === values.eventTypeId);
  const cateringSelected = catalog.categories.some(
    (c) => values.categoryIds?.includes(c.id) && c.kind === 'catering',
  );

  async function goNext() {
    const fields = STEP_FIELDS[step.id as WizardStepId];
    const valid = fields.length === 0 ? true : await form.trigger(fields as never);
    if (!valid) return;
    track('request_step_completed', { step: step.id, index: stepIndex });
    const next = Math.min(stepIndex + 1, WIZARD_STEPS.length - 1);
    saveDraft(next);
    setStepIndex(next);
    window.scrollTo({ top: 0 });
  }

  function goBack() {
    const previous = Math.max(stepIndex - 1, 0);
    saveDraft(previous);
    setStepIndex(previous);
    window.scrollTo({ top: 0 });
  }

  const onSubmit = form.handleSubmit(async (data) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await submitEventRequest(data as unknown as EventRequestInput);
      if (!response.ok) {
        setFormError(response.error);
        if (response.fieldErrors) {
          for (const [field, messages] of Object.entries(response.fieldErrors)) {
            form.setError(field as keyof EventRequestInput, { message: messages[0] });
          }
          // Jump back to the earliest step that has an error.
          const firstBadStep = WIZARD_STEPS.findIndex((s) =>
            STEP_FIELDS[s.id as WizardStepId].some((f) => f in response.fieldErrors!),
          );
          if (firstBadStep >= 0) setStepIndex(firstBadStep);
        }
        toast.error(response.error);
        return;
      }

      track('request_submitted', { reference: response.reference });
      try { window.sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setResult({
        reference: response.reference,
        needsSignIn: response.needsSignIn,
        accountCreated: response.accountCreated,
      });
    } catch {
      setFormError('Something went wrong. Please try again, or call us and we will take the details.');
    } finally {
      setSubmitting(false);
    }
  });

  if (result) return <SubmittedPanel {...result} />;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:gap-12">
      <StepRail stepIndex={stepIndex} onJump={(i) => i < stepIndex && setStepIndex(i)} />

      <form onSubmit={onSubmit} noValidate className="min-w-0">
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...form.register('company_website')} />

        <div className="mb-7">
          <p className="eyebrow">
            Step {stepIndex + 1} of {WIZARD_STEPS.length}
          </p>
          <h1 className="mt-2 text-display-sm">{step.title}</h1>
        </div>

        <Card className="p-6 sm:p-8">
          {/* ------------------------------------------------ 1. Type */}
          {step.id === 'type' ? (
            <Controller
              control={form.control}
              name="eventTypeId"
              render={({ field, fieldState }) => (
                <Field error={fieldState.error?.message}>
                  <FieldLabel>Choose the closest match</FieldLabel>
                  <FieldDescription>
                    Not sure? Pick the nearest option — you can add detail later.
                  </FieldDescription>
                  <div className="mt-2 space-y-6">
                    {Object.entries(
                      catalog.eventTypes.reduce<Record<string, typeof catalog.eventTypes>>((acc, type) => {
                        (acc[type.segment] ??= []).push(type);
                        return acc;
                      }, {}),
                    ).map(([segment, types]) => (
                      <fieldset key={segment}>
                        <legend className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                          {SEGMENT_LABELS[segment] ?? segment}
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {types.map((type) => (
                            <label
                              key={type.id}
                              className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors',
                                field.value === type.id
                                  ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                                  : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
                              )}
                            >
                              <input
                                type="radio" name="eventTypeId" value={type.id}
                                checked={field.value === type.id}
                                onChange={() => field.onChange(type.id)}
                                className="mt-0.5 size-4 accent-brand-700"
                              />
                              <span>
                                <span className="block text-sm font-medium text-ink-950">{type.name}</span>
                                {type.typicalMin && type.typicalMax ? (
                                  <span className="mt-0.5 block text-xs text-ink-500">
                                    Typically {type.typicalMin}–{type.typicalMax} guests
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </Field>
              )}
            />
          ) : null}

          {/* ------------------------------------------------ 2. Date */}
          {step.id === 'date' ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Controller
                  control={form.control} name="eventDate"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel>Event date</FieldLabel>
                      <FieldControl>
                        <Input type="date" min={new Date().toISOString().slice(0, 10)} {...field} value={field.value ?? ''} />
                      </FieldControl>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control} name="eventEndDate"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel optional>End date</FieldLabel>
                      <FieldDescription>For multi-day programmes.</FieldDescription>
                      <FieldControl>
                        <Input
                          type="date" min={values.eventDate || undefined}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FieldControl>
                    </Field>
                  )}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Controller
                  control={form.control} name="startTime"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel optional>Start time</FieldLabel>
                      <FieldControl>
                        <Input type="time" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                      </FieldControl>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control} name="endTime"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel optional>End time</FieldLabel>
                      <FieldControl>
                        <Input type="time" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                      </FieldControl>
                    </Field>
                  )}
                />
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-ink-200 p-3.5">
                <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" {...form.register('isDateFlexible')} />
                <span>
                  <span className="block text-sm font-medium text-ink-950">My date is flexible</span>
                  <span className="mt-0.5 block text-xs text-ink-600">
                    We will tell you if moving by a day or two unlocks better partners or pricing.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          {/* ---------------------------------------------- 3. Guests */}
          {step.id === 'guests' ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Controller
                  control={form.control} name="guestCount"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel>Expected guests</FieldLabel>
                      <FieldControl>
                        <Input
                          type="number" min={1} max={100000} inputMode="numeric" placeholder="e.g. 300"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        />
                      </FieldControl>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control} name="guestCountMax"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel optional>Upper estimate</FieldLabel>
                      <FieldDescription>If the headcount could grow.</FieldDescription>
                      <FieldControl>
                        <Input
                          type="number" min={1} max={100000} inputMode="numeric"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                        />
                      </FieldControl>
                    </Field>
                  )}
                />
              </div>
              {selectedEventType?.typicalMin && selectedEventType.typicalMax ? (
                <Alert tone="info">
                  {selectedEventType.name} events on our platform usually run{' '}
                  {selectedEventType.typicalMin}–{selectedEventType.typicalMax} guests.
                </Alert>
              ) : null}
            </div>
          ) : null}

          {/* -------------------------------------------- 4. Location */}
          {step.id === 'location' ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Controller
                  control={form.control} name="cityId"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel>City</FieldLabel>
                      <FieldControl>
                        <Select {...field} value={field.value ?? ''}>
                          <option value="">Choose a city</option>
                          {catalog.cities.map((c) => (
                            <option key={c.id} value={c.id} disabled={!c.isLaunched}>
                              {c.name}{c.isLaunched ? '' : ' (coming soon)'}
                            </option>
                          ))}
                        </Select>
                      </FieldControl>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control} name="areaId"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel optional>Area</FieldLabel>
                      <FieldControl>
                        <Select
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          disabled={selectedCityAreas.length === 0}
                        >
                          <option value="">
                            {selectedCityAreas.length ? 'Choose an area' : 'Select a city first'}
                          </option>
                          {selectedCityAreas.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </Select>
                      </FieldControl>
                    </Field>
                  )}
                />
              </div>

              <Field>
                <FieldLabel optional>Venue name</FieldLabel>
                <FieldDescription>An office, community centre, hotel, or your home.</FieldDescription>
                <FieldControl>
                  <Input placeholder="e.g. Head office, 7th floor" {...form.register('venueName')} />
                </FieldControl>
              </Field>

              <Field>
                <FieldLabel optional>Address</FieldLabel>
                <FieldControl>
                  <Textarea rows={2} placeholder="Building, road, landmark" {...form.register('addressLine')} />
                </FieldControl>
              </Field>

              <Field>
                <FieldLabel optional>Access notes</FieldLabel>
                <FieldDescription>
                  Lift access, parking, loading restrictions, security clearance — anything that affects setup.
                </FieldDescription>
                <FieldControl>
                  <Textarea rows={2} {...form.register('venueNotes')} />
                </FieldControl>
              </Field>
            </div>
          ) : null}

          {/* -------------------------------------------- 5. Services */}
          {step.id === 'services' ? (
            <Controller
              control={form.control} name="categoryIds"
              render={({ field, fieldState }) => (
                <Field error={fieldState.error?.message}>
                  <FieldLabel>Which services do you need?</FieldLabel>
                  <FieldDescription>
                    Choose everything relevant. We can combine multiple vendors into one proposal.
                  </FieldDescription>
                  <div className="mt-3 space-y-6">
                    {['catering', 'event_service', 'vendor'].map((kind) => {
                      const items = catalog.categories.filter((c) => c.kind === kind && c.parentId);
                      if (!items.length) return null;
                      return (
                        <fieldset key={kind}>
                          <legend className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                            {kind === 'catering' ? 'Catering' : kind === 'event_service' ? 'Event management' : 'Vendors & suppliers'}
                          </legend>
                          <div className="flex flex-wrap gap-2">
                            {items.map((cat) => {
                              const checked = field.value?.includes(cat.id) ?? false;
                              return (
                                <label
                                  key={cat.id}
                                  className={cn(
                                    'cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors',
                                    checked
                                      ? 'border-brand-600 bg-brand-700 font-medium text-white'
                                      : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50',
                                  )}
                                >
                                  <input
                                    type="checkbox" className="sr-only" checked={checked}
                                    onChange={() =>
                                      field.onChange(
                                        checked
                                          ? field.value!.filter((v) => v !== cat.id)
                                          : [...(field.value ?? []), cat.id],
                                      )
                                    }
                                  />
                                  {checked ? <Check aria-hidden className="mr-1 inline size-3.5" /> : null}
                                  {cat.name}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>
                </Field>
              )}
            />
          ) : null}

          {/* ------------------------------------------------ 6. Food */}
          {step.id === 'food' ? (
            <div className="space-y-5">
              {cateringSelected ? (
                <Controller
                  control={form.control} name="cuisineIds"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel optional>Cuisine preferences</FieldLabel>
                      <FieldDescription>Pick any that apply, or leave blank for suggestions.</FieldDescription>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {catalog.cuisines.map((cuisine) => {
                          const checked = field.value?.includes(cuisine.id) ?? false;
                          return (
                            <label
                              key={cuisine.id}
                              className={cn(
                                'cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors',
                                checked
                                  ? 'border-saffron-400 bg-saffron-400 font-medium text-ink-950'
                                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50',
                              )}
                            >
                              <input
                                type="checkbox" className="sr-only" checked={checked}
                                onChange={() =>
                                  field.onChange(
                                    checked
                                      ? field.value!.filter((v) => v !== cuisine.id)
                                      : [...(field.value ?? []), cuisine.id],
                                  )
                                }
                              />
                              {cuisine.name}
                            </label>
                          );
                        })}
                      </div>
                    </Field>
                  )}
                />
              ) : (
                <Alert tone="info" title="No catering selected">
                  You have not asked for catering, so you can skip this step. Go back to the previous
                  step if you would like to add it.
                </Alert>
              )}

              <Field>
                <FieldLabel optional>Dietary and menu notes</FieldLabel>
                <FieldDescription>
                  Halal requirements, vegetarian counts, allergies, no-beef, specific dishes.
                </FieldDescription>
                <FieldControl>
                  <Textarea rows={4} placeholder="e.g. 30 vegetarian meals, no beef, kacchi for the main course" {...form.register('dietaryNotes')} />
                </FieldControl>
              </Field>
            </div>
          ) : null}

          {/* ---------------------------------------------- 7. Budget */}
          {step.id === 'budget' ? (
            <div className="space-y-5">
              <Controller
                control={form.control} name="budgetMode"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>How would you like to express your budget?</FieldLabel>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {([
                        { value: 'total', label: 'Total budget', hint: 'One overall figure' },
                        { value: 'per_person', label: 'Per person', hint: 'Cost per guest' },
                        { value: 'range', label: 'A range', hint: 'Minimum to maximum' },
                        { value: 'flexible', label: 'Not sure yet', hint: 'Show me options' },
                      ] as const).map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors',
                            field.value === option.value
                              ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                              : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
                          )}
                        >
                          <input
                            type="radio" name="budgetMode" value={option.value}
                            checked={field.value === option.value}
                            onChange={() => field.onChange(option.value)}
                            className="mt-0.5 size-4 accent-brand-700"
                          />
                          <span>
                            <span className="block text-sm font-medium text-ink-950">{option.label}</span>
                            <span className="mt-0.5 block text-xs text-ink-600">{option.hint}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </Field>
                )}
              />

              {values.budgetMode === 'total' ? (
                <Controller
                  control={form.control} name="budgetTotalMinor"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel>Total budget</FieldLabel>
                      <TakaInput valueMinor={field.value ?? null} onValueChange={field.onChange} placeholder="210000" />
                      {values.guestCount && field.value ? (
                        <FieldDescription>
                          That is roughly <Money minor={Math.round(field.value / values.guestCount)} /> per guest.
                        </FieldDescription>
                      ) : null}
                    </Field>
                  )}
                />
              ) : null}

              {values.budgetMode === 'per_person' ? (
                <Controller
                  control={form.control} name="budgetPerPersonMinor"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel>Budget per person</FieldLabel>
                      <TakaInput valueMinor={field.value ?? null} onValueChange={field.onChange} placeholder="700" />
                      {values.guestCount && field.value ? (
                        <FieldDescription>
                          That is about <Money minor={field.value * values.guestCount} /> in total.
                        </FieldDescription>
                      ) : null}
                    </Field>
                  )}
                />
              ) : null}

              {values.budgetMode === 'range' ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Controller
                    control={form.control} name="budgetMinMinor"
                    render={({ field, fieldState }) => (
                      <Field error={fieldState.error?.message}>
                        <FieldLabel>Minimum</FieldLabel>
                        <TakaInput valueMinor={field.value ?? null} onValueChange={field.onChange} />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control} name="budgetMaxMinor"
                    render={({ field, fieldState }) => (
                      <Field error={fieldState.error?.message}>
                        <FieldLabel>Maximum</FieldLabel>
                        <TakaInput valueMinor={field.value ?? null} onValueChange={field.onChange} />
                      </Field>
                    )}
                  />
                </div>
              ) : null}

              {values.budgetMode === 'flexible' ? (
                <Alert tone="info" title="That is fine">
                  We will ask partners for options at a few price points so you can see the trade-offs
                  before committing.
                </Alert>
              ) : null}
            </div>
          ) : null}

          {/* --------------------------------------------- 8. Details */}
          {step.id === 'details' ? (
            <div className="space-y-5">
              <Field>
                <FieldLabel optional>A name for this event</FieldLabel>
                <FieldDescription>Helps you find it later in your dashboard.</FieldDescription>
                <FieldControl>
                  <Input placeholder="e.g. Annual dealer conference 2026" {...form.register('title')} />
                </FieldControl>
              </Field>
              <Field>
                <FieldLabel optional>Anything else we should know?</FieldLabel>
                <FieldDescription>
                  Programme schedule, stage requirements, branding, VIP guests, prior suppliers,
                  or anything that went wrong last time.
                </FieldDescription>
                <FieldControl>
                  <Textarea rows={6} {...form.register('requirements')} />
                </FieldControl>
              </Field>
            </div>
          ) : null}

          {/* --------------------------------------------- 9. Contact */}
          {step.id === 'contact' ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Controller
                  control={form.control} name="contactName"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel>Your name</FieldLabel>
                      <FieldControl><Input autoComplete="name" {...field} /></FieldControl>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control} name="contactPhone"
                  render={({ field, fieldState }) => (
                    <Field error={fieldState.error?.message}>
                      <FieldLabel>Mobile number</FieldLabel>
                      <FieldDescription>Bangladeshi mobile, e.g. 01712345678</FieldDescription>
                      <FieldControl>
                        <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="01712345678" {...field} />
                      </FieldControl>
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control} name="contactEmail"
                render={({ field, fieldState }) => (
                  <Field error={fieldState.error?.message}>
                    <FieldLabel>Email address</FieldLabel>
                    <FieldDescription>
                      We send your proposals here, and it becomes your dashboard sign-in.
                    </FieldDescription>
                    <FieldControl><Input type="email" autoComplete="email" {...field} /></FieldControl>
                  </Field>
                )}
              />

              {catalog.organizations.length > 0 ? (
                <Controller
                  control={form.control} name="organizationId"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel optional>Bill to a company account</FieldLabel>
                      <FieldControl>
                        <Select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)}>
                          <option value="">Personal request</option>
                          {catalog.organizations.map((org) => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </Select>
                      </FieldControl>
                    </Field>
                  )}
                />
              ) : null}

              <Controller
                control={form.control} name="preferredChannel"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>How should we reach you first?</FieldLabel>
                    <FieldControl>
                      <Select {...field}>
                        <option value="phone">Phone call</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="platform">Only through the platform</option>
                      </Select>
                    </FieldControl>
                  </Field>
                )}
              />
            </div>
          ) : null}

          {/* ---------------------------------------------- 10. Review */}
          {step.id === 'review' ? (
            <ReviewPanel values={values} catalog={catalog} onEdit={setStepIndex} />
          ) : null}

          {formError ? (
            <Alert tone="danger" className="mt-6" title="We could not submit your request">
              {formError}
            </Alert>
          ) : null}
        </Card>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0}>
            <ArrowLeft aria-hidden /> Back
          </Button>

          {stepIndex < WIZARD_STEPS.length - 1 ? (
            <Button type="button" size="lg" onClick={goNext}>
              Continue <ArrowRight aria-hidden />
            </Button>
          ) : (
            <Button type="submit" size="lg" loading={submitting}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          )}
        </div>

        {stepIndex === WIZARD_STEPS.length - 1 ? (
          <p className="mt-4 text-center text-sm text-ink-600">
            Submitting is free and non-binding. Nothing is confirmed until you accept a proposal.
            {!isAuthenticated ? ' We will create your account so you can track proposals.' : null}
          </p>
        ) : null}
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- Rail */

/**
 * The step rail.
 *
 * `min-w-0` on the <nav> is load-bearing: a grid item defaults to
 * `min-width: auto`, so without it the rail expands to its content width
 * and scrolls the whole page sideways on mobile instead of letting the
 * inner list scroll. Caught by the mobile end-to-end run.
 */
function StepRail({ stepIndex, onJump }: { stepIndex: number; onJump: (index: number) => void }) {
  return (
    <nav aria-label="Request steps" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <ol className="hide-scrollbar flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0">
        {WIZARD_STEPS.map((step, i) => {
          const state = i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo';
          return (
            <li key={step.id} className="shrink-0 lg:w-full">
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={state === 'todo'}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  state === 'current' && 'bg-brand-50 font-medium text-brand-800',
                  state === 'done' && 'text-ink-700 hover:bg-ink-100',
                  state === 'todo' && 'cursor-default text-ink-400',
                )}
              >
                <span
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full border text-[0.68rem] font-semibold',
                    state === 'done' && 'border-brand-600 bg-brand-600 text-white',
                    state === 'current' && 'border-brand-700 text-brand-800',
                    state === 'todo' && 'border-ink-300 text-ink-400',
                  )}
                >
                  {state === 'done' ? <Check aria-hidden className="size-3" /> : i + 1}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------- Review */

function ReviewPanel({
  values, catalog, onEdit,
}: {
  values: EventRequestInput;
  catalog: WizardCatalog;
  onEdit: (index: number) => void;
}) {
  const eventType = catalog.eventTypes.find((e) => e.id === values.eventTypeId);
  const city = catalog.cities.find((c) => c.id === values.cityId);
  const area = catalog.areas.find((a) => a.id === values.areaId);
  const services = catalog.categories.filter((c) => values.categoryIds?.includes(c.id));
  const cuisines = catalog.cuisines.filter((c) => values.cuisineIds?.includes(c.id));

  const budget =
    values.budgetMode === 'total' && values.budgetTotalMinor
      ? <Money minor={values.budgetTotalMinor} />
      : values.budgetMode === 'per_person' && values.budgetPerPersonMinor
        ? <><Money minor={values.budgetPerPersonMinor} /> per person</>
        : values.budgetMode === 'range' && values.budgetMinMinor && values.budgetMaxMinor
          ? <><Money minor={values.budgetMinMinor} /> – <Money minor={values.budgetMaxMinor} /></>
          : 'Flexible';

  const rows: { label: string; value: React.ReactNode; step: number }[] = [
    { label: 'Event type', value: eventType?.name ?? '—', step: 0 },
    {
      label: 'Date',
      value: values.eventDate
        ? `${values.eventDate}${values.eventEndDate ? ` → ${values.eventEndDate}` : ''}${values.startTime ? `, ${values.startTime}` : ''}${values.isDateFlexible ? ' (flexible)' : ''}`
        : '—',
      step: 1,
    },
    {
      label: 'Guests',
      value: values.guestCount ? `${values.guestCount}${values.guestCountMax ? `–${values.guestCountMax}` : ''}` : '—',
      step: 2,
    },
    {
      label: 'Location',
      value: [values.venueName, area?.name, city?.name].filter(Boolean).join(', ') || '—',
      step: 3,
    },
    {
      label: 'Services',
      value: services.length ? (
        <span className="flex flex-wrap justify-end gap-1.5">
          {services.map((s) => <Badge key={s.id} tone="brand">{s.name}</Badge>)}
        </span>
      ) : '—',
      step: 4,
    },
    {
      label: 'Cuisine',
      value: cuisines.length ? cuisines.map((c) => c.name).join(', ') : 'No preference',
      step: 5,
    },
    { label: 'Budget', value: budget, step: 6 },
    { label: 'Contact', value: [values.contactName, values.contactPhone, values.contactEmail].filter(Boolean).join(' · ') || '—', step: 8 },
  ];

  return (
    <div>
      <p className="text-sm text-ink-600">
        Check everything below. You can edit any section, and you can still change details after
        submitting — nothing is binding.
      </p>

      <dl className="mt-6 divide-y divide-ink-100 border-y border-ink-200">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 py-3.5">
            <dt className="w-32 shrink-0 text-sm text-ink-600">{row.label}</dt>
            <dd className="flex-1 text-right text-sm font-medium text-ink-950">{row.value}</dd>
            <button
              type="button"
              onClick={() => onEdit(row.step)}
              className="shrink-0 text-xs font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
            >
              Edit
            </button>
          </div>
        ))}
      </dl>

      {values.requirements ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-ink-900">Additional requirements</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-600">{values.requirements}</p>
        </div>
      ) : null}

      <Alert tone="info" className="mt-6" title="What happens next">
        Our event team reviews your requirement, shortlists verified partners and invites them to
        quote. You will receive comparable proposals — usually within 24–48 hours.
      </Alert>
    </div>
  );
}

/* ---------------------------------------------------------- Submitted */

function SubmittedPanel({
  reference, needsSignIn, accountCreated,
}: {
  reference: string;
  needsSignIn: boolean;
  accountCreated: boolean;
}) {
  return (
    <Card className="mx-auto max-w-2xl p-8 text-center sm:p-12">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-700">
        <PartyPopper aria-hidden className="size-6" />
      </span>
      <h1 className="mt-6 text-display-sm">Request submitted</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-600">
        Our event team will review your requirements and arrange suitable partners. Most requests
        receive their first quotations within 24–48 hours.
      </p>

      <p className="mt-6 inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-4 py-2.5 font-mono text-sm">
        <CircleCheck aria-hidden className="size-4 text-brand-600" />
        Reference <strong className="font-semibold">{reference}</strong>
      </p>

      {accountCreated ? (
        <Alert tone="info" className="mt-7 text-left" title="We created your account">
          So you can track proposals in one place, we created an account with the email you gave us.
          Use “Forgot password” on the sign-in page to set a password, or request a sign-in link.
        </Alert>
      ) : null}

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href={needsSignIn ? '/login' : '/dashboard/requests'}>
            {needsSignIn ? 'Sign in to track it' : 'View your requests'}
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">Back to home</Link>
        </Button>
      </div>

      <p className="mt-8 text-sm text-ink-500">
        Need it sooner? Call us on{' '}
        <a href={`tel:${brand.supportPhone}`} className="font-medium text-brand-700 underline underline-offset-4">
          {brand.supportPhoneDisplay}
        </a>
        .
      </p>
    </Card>
  );
}

export { Loader2 };
