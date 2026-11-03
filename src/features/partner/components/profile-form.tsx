'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea, TakaInput } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { updatePartnerProfile } from '../actions';

export type ProfileValues = {
  displayName: string;
  tagline: string;
  about: string;
  minOrderMinor: number;
  minGuests: number | null;
  maxGuests: number | null;
  leadTimeHours: number;
  dailyEventCapacity: number;
  cancellationPolicy: string;
  paymentTerms: string;
  isAcceptingOrders: boolean;
};

export function PartnerProfileForm({
  partnerId, initial, readOnly,
}: {
  partnerId: string;
  initial: ProfileValues;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await updatePartnerProfile({ partnerId, values });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success('Profile saved');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Card>
        <CardHeader><CardTitle as="h2">Public profile</CardTitle></CardHeader>
        <CardContent className="space-y-5 pt-3">
          <Field>
            <FieldLabel>Business name</FieldLabel>
            <FieldControl>
              <Input value={values.displayName} disabled={readOnly} onChange={(e) => set('displayName', e.target.value)} />
            </FieldControl>
          </Field>

          <Field>
            <FieldLabel optional>Tagline</FieldLabel>
            <FieldDescription>One line customers see under your name in search results.</FieldDescription>
            <FieldControl>
              <Input
                value={values.tagline} disabled={readOnly} maxLength={200}
                placeholder="e.g. Kacchi and Bangladeshi catering for 50–1500 guests"
                onChange={(e) => set('tagline', e.target.value)}
              />
            </FieldControl>
          </Field>

          <Field>
            <FieldLabel optional>About your business</FieldLabel>
            <FieldDescription>
              Your kitchen, team, experience and what you are known for. This is your pitch.
            </FieldDescription>
            <FieldControl>
              <Textarea rows={6} value={values.about} disabled={readOnly} onChange={(e) => set('about', e.target.value)} />
            </FieldControl>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle as="h2">Operating limits</CardTitle></CardHeader>
        <CardContent className="space-y-5 pt-3">
          <Alert tone="info">
            These directly control which briefs reach you. Set them honestly — being matched to work
            you cannot deliver hurts your response rate and your reviews.
          </Alert>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel>Minimum order value</FieldLabel>
              <TakaInput
                valueMinor={values.minOrderMinor}
                onValueChange={(v) => set('minOrderMinor', v ?? 0)}
                disabled={readOnly}
              />
            </Field>
            <Field>
              <FieldLabel>Lead time (hours)</FieldLabel>
              <FieldDescription>How much notice you need.</FieldDescription>
              <FieldControl>
                <Input
                  type="number" min={0} max={8760} disabled={readOnly}
                  value={values.leadTimeHours}
                  onChange={(e) => set('leadTimeHours', Number(e.target.value) || 0)}
                />
              </FieldControl>
            </Field>
            <Field>
              <FieldLabel optional>Minimum guests</FieldLabel>
              <FieldControl>
                <Input
                  type="number" min={1} disabled={readOnly}
                  value={values.minGuests ?? ''}
                  onChange={(e) => set('minGuests', e.target.value === '' ? null : Number(e.target.value))}
                />
              </FieldControl>
            </Field>
            <Field>
              <FieldLabel optional>Maximum guests</FieldLabel>
              <FieldControl>
                <Input
                  type="number" min={1} disabled={readOnly}
                  value={values.maxGuests ?? ''}
                  onChange={(e) => set('maxGuests', e.target.value === '' ? null : Number(e.target.value))}
                />
              </FieldControl>
            </Field>
            <Field>
              <FieldLabel>Events per day</FieldLabel>
              <FieldDescription>How many events you can staff simultaneously.</FieldDescription>
              <FieldControl>
                <Input
                  type="number" min={1} max={50} disabled={readOnly}
                  value={values.dailyEventCapacity}
                  onChange={(e) => set('dailyEventCapacity', Number(e.target.value) || 1)}
                />
              </FieldControl>
            </Field>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-ink-200 p-3.5">
            <input
              type="checkbox" className="mt-0.5 size-4 accent-brand-700" disabled={readOnly}
              checked={values.isAcceptingOrders}
              onChange={(e) => set('isAcceptingOrders', e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-ink-950">Accepting new orders</span>
              <span className="mt-0.5 block text-xs text-ink-600">
                Turn this off to pause all new invitations without losing your listing.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle as="h2">Your standard terms</CardTitle></CardHeader>
        <CardContent className="space-y-5 pt-3">
          <p className="text-sm text-ink-600">
            These prefill every quote you build, so you are not retyping them each time.
          </p>
          <Field>
            <FieldLabel optional>Payment terms</FieldLabel>
            <FieldControl>
              <Textarea
                rows={3} disabled={readOnly} value={values.paymentTerms}
                placeholder="e.g. 50% advance on confirmation, balance on the event day"
                onChange={(e) => set('paymentTerms', e.target.value)}
              />
            </FieldControl>
          </Field>
          <Field>
            <FieldLabel optional>Cancellation policy</FieldLabel>
            <FieldControl>
              <Textarea
                rows={3} disabled={readOnly} value={values.cancellationPolicy}
                placeholder="e.g. Free cancellation up to 7 days before; 50% within 3 days"
                onChange={(e) => set('cancellationPolicy', e.target.value)}
              />
            </FieldControl>
          </Field>
        </CardContent>
      </Card>

      {!readOnly ? (
        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={pending}>Save profile</Button>
        </div>
      ) : null}
    </form>
  );
}
