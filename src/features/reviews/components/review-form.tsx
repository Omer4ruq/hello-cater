'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { submitReview } from '../actions';

/**
 * Accessible star rating.
 *
 * Implemented as a radio group rather than buttons, so screen readers
 * announce it as a single choice of five and keyboard users can arrow
 * between values.
 */
function StarRating({
  name, label, value, onChange, required,
}: {
  name: string;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink-900">
        {label}
        {!required ? <span className="ml-1.5 font-normal text-ink-500">(optional)</span> : null}
      </legend>
      <div className="mt-1.5 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className={cn(
              'cursor-pointer rounded p-0.5 transition-colors',
              'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink-900',
            )}
          >
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <Star
              aria-hidden
              className={cn(
                'size-7 transition-[scale,color,fill] duration-150 ease-out hover:scale-110',
                value !== null && star <= value
                  ? 'fill-ink-900 text-ink-900'
                  : 'text-ink-300',
              )}
            />
            <span className="sr-only">{star} {star === 1 ? 'star' : 'stars'}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ReviewForm({
  bookingId, partnerName, eventTitle, eventId,
}: {
  bookingId: string;
  partnerName: string;
  eventTitle: string;
  eventId: string;
}) {
  const router = useRouter();
  const [rating, setRating] = React.useState<number | null>(null);
  const [quality, setQuality] = React.useState<number | null>(null);
  const [communication, setCommunication] = React.useState<number | null>(null);
  const [punctuality, setPunctuality] = React.useState<number | null>(null);
  const [value, setValue] = React.useState<number | null>(null);
  const [title, setTitle] = React.useState('');
  const [comment, setComment] = React.useState('');
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (rating == null) {
      setError('Choose an overall rating first.');
      return;
    }
    setPending(true);
    setError(null);

    const result = await submitReview({
      bookingId,
      rating,
      qualityRating: quality,
      communicationRating: communication,
      punctualityRating: punctuality,
      valueRating: value,
      title,
      comment,
      isAnonymous,
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success('Thank you — your review is published.');
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <Card className="p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-50 text-success-700">
          <CheckCircle2 aria-hidden className="size-6" />
        </span>
        <h2 className="mt-6 text-display-sm">Thank you</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-600">
          Your review is published on {partnerName}&rsquo;s profile. They can reply publicly, and
          our team reads every one.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild><Link href={`/dashboard/events/${eventId}`}>Back to your event</Link></Button>
          <Button asChild variant="secondary"><Link href="/dashboard">Dashboard</Link></Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Card>
        <CardContent className="space-y-6">
          <StarRating
            name="rating" label={`Overall, how was ${partnerName}?`} required
            value={rating} onChange={setRating}
          />

          <div className="grid gap-5 border-t border-ink-100 pt-5 sm:grid-cols-2">
            <StarRating name="quality" label="Food & service quality" value={quality} onChange={setQuality} />
            <StarRating name="communication" label="Communication" value={communication} onChange={setCommunication} />
            <StarRating name="punctuality" label="Punctuality" value={punctuality} onChange={setPunctuality} />
            <StarRating name="value" label="Value for money" value={value} onChange={setValue} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <Field>
            <FieldLabel optional>Headline</FieldLabel>
            <FieldControl>
              <Input
                value={title} maxLength={160}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Delivered exactly what was quoted"
              />
            </FieldControl>
          </Field>

          <Field>
            <FieldLabel optional>What happened?</FieldLabel>
            <FieldDescription>
              What went well, and anything that did not. Specifics help the next customer far more
              than a score does.
            </FieldDescription>
            <FieldControl>
              <Textarea rows={6} value={comment} maxLength={4000} onChange={(e) => setComment(e.target.value)} />
            </FieldControl>
          </Field>

          <label className="flex items-start gap-3 text-sm text-ink-700">
            <input
              type="checkbox" className="mt-0.5 size-4 accent-brand-700"
              checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <span>
              <span className="block font-medium text-ink-950">Publish without my name</span>
              <span className="mt-0.5 block text-xs text-ink-600">
                The review still shows as verified, because it is tied to a real completed booking.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={pending} disabled={rating == null}>
          Publish review
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/dashboard/events/${eventId}`}>Not now</Link>
        </Button>
      </div>

      <p className="text-xs text-ink-500">
        Reviewing {partnerName} for {eventTitle}. Reviews are public and can only be left by
        customers with a completed booking.
      </p>
    </form>
  );
}
