'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { partnerSignupSchema, type PartnerSignupInput } from '../schema';
import { registerPartner } from '../actions';

export function PartnerSignupForm({
  categories, cities, areas,
}: {
  categories: { id: string; name: string; kind: string }[];
  cities: { id: string; name: string; isLaunched: boolean }[];
  areas: { id: string; name: string; cityId: string }[];
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<PartnerSignupInput>({
    resolver: zodResolver(partnerSignupSchema),
    mode: 'onTouched',
    defaultValues: {
      businessName: '', contactName: '', email: '', phone: '', password: '',
      businessType: 'sole_proprietor', categoryIds: [], areaIds: [],
      cityId: cities.find((c) => c.isLaunched)?.id ?? '',
      yearEstablished: null, maxGuests: null, about: '',
      acceptTerms: false as unknown as true, company_website: '',
    },
  });

  const cityId = useWatch({ control: form.control, name: 'cityId' });
  const cityAreas = areas.filter((a) => a.cityId === cityId);

  React.useEffect(() => {
    track('partner_signup_started');
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await registerPartner(values);
    if (!result.ok) {
      setError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof PartnerSignupInput, { message: messages[0] });
        }
      }
      return;
    }
    track('partner_signup_completed');
    setSubmitted(true);
  });

  if (submitted) {
    return (
      <Card className="motion-stagger p-8 text-center sm:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-ink-50 text-brand-700">
          <CheckCircle2 aria-hidden className="size-6" />
        </span>
        <h2 className="mt-6 text-display-sm font-extrabold">Application received</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-600">
          Check your email to confirm your address, then sign in to upload your trade licence and
          supporting documents. Our partner team reviews applications within two working days.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full px-7"><Link href="/login">Sign in to your dashboard</Link></Button>
          <Button asChild size="lg" variant="secondary" className="rounded-full px-7"><Link href="/">Back to home</Link></Button>
        </div>
      </Card>
    );
  }

  const grouped = [
    { kind: 'catering', label: 'Catering' },
    { kind: 'event_service', label: 'Event management' },
    { kind: 'vendor', label: 'Vendors & suppliers' },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...form.register('company_website')} />

      {error ? <Alert tone="danger" title="We could not submit your application">{error}</Alert> : null}

      <Card>
        <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0"><CardTitle as="h2" className="text-lg font-bold">Your business</CardTitle></CardHeader>
        <CardContent className="space-y-5 p-6 pt-4 sm:p-7 sm:pt-4">
          <Field error={form.formState.errors.businessName?.message}>
            <FieldLabel>Business name</FieldLabel>
            <FieldControl>
              <Input placeholder="e.g. Bengal Kitchen Catering" {...form.register('businessName')} />
            </FieldControl>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={form.formState.errors.businessType?.message}>
              <FieldLabel>Business type</FieldLabel>
              <FieldControl>
                <Select {...form.register('businessType')}>
                  <option value="sole_proprietor">Sole proprietor</option>
                  <option value="partnership">Partnership</option>
                  <option value="private_limited">Private limited</option>
                  <option value="individual">Individual / freelancer</option>
                  <option value="other">Other</option>
                </Select>
              </FieldControl>
            </Field>

            <Controller
              control={form.control} name="yearEstablished"
              render={({ field, fieldState }) => (
                <Field error={fieldState.error?.message}>
                  <FieldLabel optional>Operating since</FieldLabel>
                  <FieldControl>
                    <Input
                      type="number" min={1900} max={new Date().getFullYear()} placeholder="e.g. 2018"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </FieldControl>
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control} name="maxGuests"
            render={({ field, fieldState }) => (
              <Field error={fieldState.error?.message}>
                <FieldLabel optional>Largest event you can serve (guests)</FieldLabel>
                <FieldDescription>
                  Be honest — this directly controls which briefs we send you.
                </FieldDescription>
                <FieldControl>
                  <Input
                    type="number" min={1} placeholder="e.g. 800"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </FieldControl>
              </Field>
            )}
          />

          <Field error={form.formState.errors.about?.message}>
            <FieldLabel optional>About your business</FieldLabel>
            <FieldDescription>What you are known for, your kitchen or team, notable past work.</FieldDescription>
            <FieldControl>
              <Textarea rows={4} {...form.register('about')} />
            </FieldControl>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0"><CardTitle as="h2" className="text-lg font-bold">What you offer</CardTitle></CardHeader>
        <CardContent className="space-y-5 p-6 pt-4 sm:p-7 sm:pt-4">
          <Controller
            control={form.control} name="categoryIds"
            render={({ field, fieldState }) => (
              <Field error={fieldState.error?.message}>
                <FieldLabel>Services</FieldLabel>
                <FieldDescription>Choose everything you genuinely deliver yourself.</FieldDescription>
                <div className="mt-2 space-y-5">
                  {grouped.map((group) => {
                    const items = categories.filter((c) => c.kind === group.kind);
                    if (!items.length) return null;
                    return (
                      <fieldset key={group.kind}>
                        <legend className="mb-2 text-sm font-semibold text-ink-900">
                          {group.label}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {items.map((category) => {
                            const checked = field.value?.includes(category.id) ?? false;
                            return (
                              <label
                                key={category.id}
                                className={cn(
                                  'inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color,scale] duration-200 active:scale-[0.97] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink-900',
                                  checked
                                    ? 'border-ink-900 bg-ink-900 text-white'
                                    : 'border-ink-300 bg-white text-ink-900 hover:border-ink-900',
                                )}
                              >
                                <input
                                  type="checkbox" className="sr-only" checked={checked}
                                  onChange={() =>
                                    field.onChange(
                                      checked
                                        ? field.value!.filter((v) => v !== category.id)
                                        : [...(field.value ?? []), category.id],
                                    )
                                  }
                                />
                                {category.name}
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

          <Field error={form.formState.errors.cityId?.message}>
            <FieldLabel>City</FieldLabel>
            <FieldControl>
              <Select {...form.register('cityId')}>
                {cities.map((city) => (
                  <option key={city.id} value={city.id} disabled={!city.isLaunched}>
                    {city.name}{city.isLaunched ? '' : ' (coming soon)'}
                  </option>
                ))}
              </Select>
            </FieldControl>
          </Field>

          <Controller
            control={form.control} name="areaIds"
            render={({ field }) => (
              <Field>
                <FieldLabel optional>Areas you cover</FieldLabel>
                <FieldDescription>Leave blank if you cover the whole city.</FieldDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cityAreas.map((area) => {
                    const checked = field.value?.includes(area.id) ?? false;
                    return (
                      <label
                        key={area.id}
                        className={cn(
                          'inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color,scale] duration-200 active:scale-[0.97] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink-900',
                          checked
                            ? 'border-ink-900 bg-ink-900 text-white'
                            : 'border-ink-300 bg-white text-ink-900 hover:border-ink-900',
                        )}
                      >
                        <input
                          type="checkbox" className="sr-only" checked={checked}
                          onChange={() =>
                            field.onChange(
                              checked
                                ? field.value!.filter((v) => v !== area.id)
                                : [...(field.value ?? []), area.id],
                            )
                          }
                        />
                        {area.name}
                      </label>
                    );
                  })}
                </div>
              </Field>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0"><CardTitle as="h2" className="text-lg font-bold">Your account</CardTitle></CardHeader>
        <CardContent className="space-y-5 p-6 pt-4 sm:p-7 sm:pt-4">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={form.formState.errors.contactName?.message}>
              <FieldLabel>Owner or contact name</FieldLabel>
              <FieldControl><Input autoComplete="name" {...form.register('contactName')} /></FieldControl>
            </Field>
            <Field error={form.formState.errors.phone?.message}>
              <FieldLabel>Mobile number</FieldLabel>
              <FieldControl>
                <Input type="tel" inputMode="tel" placeholder="01712345678" {...form.register('phone')} />
              </FieldControl>
            </Field>
          </div>

          <Field error={form.formState.errors.email?.message}>
            <FieldLabel>Email address</FieldLabel>
            <FieldControl><Input type="email" autoComplete="email" {...form.register('email')} /></FieldControl>
          </Field>

          <Field error={form.formState.errors.password?.message}>
            <FieldLabel>Password</FieldLabel>
            <FieldDescription>At least 10 characters.</FieldDescription>
            <FieldControl>
              <Input type="password" autoComplete="new-password" {...form.register('password')} />
            </FieldControl>
          </Field>

          <Field error={form.formState.errors.acceptTerms?.message}>
            <label className="flex items-start gap-3 text-sm text-ink-700">
              <input type="checkbox" className="mt-0.5 size-4 accent-ink-900" {...form.register('acceptTerms')} />
              <span>
                I agree to the{' '}
                <Link href="/partner-agreement" className="font-semibold text-ink-900 underline underline-offset-4">Partner Agreement</Link>
                {' '}and{' '}
                <Link href="/terms" className="font-semibold text-ink-900 underline underline-offset-4">Terms of Service</Link>,
                and confirm I am authorised to represent this business.
              </span>
            </label>
          </Field>
        </CardContent>
      </Card>

      <Alert tone="info" title="What happens next">
        You will be able to sign in immediately, but you cannot receive briefs or quote until our
        team verifies your business. Upload your trade licence from the dashboard to speed that up.
      </Alert>

      <Button type="submit" size="lg" block className="rounded-full" loading={form.formState.isSubmitting}>
        Submit application
      </Button>
    </form>
  );
}
