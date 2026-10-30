'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { ticketSchema, type TicketInput } from '../schema';
import { createSupportTicket } from '../actions';

export function TicketForm({ events }: { events: { id: string; label: string }[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<TicketInput>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: '', category: 'other', message: '', eventId: null },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await createSupportTicket(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(`Ticket ${result.reference} created`);
    form.reset();
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field error={form.formState.errors.category?.message}>
        <FieldLabel>What is this about?</FieldLabel>
        <FieldControl>
          <Select {...form.register('category')}>
            <option value="payment">Payment issue</option>
            <option value="delivery">Late or missed delivery</option>
            <option value="service_quality">Service quality</option>
            <option value="cancellation">Cancellation</option>
            <option value="refund">Refund</option>
            <option value="account">Account</option>
            <option value="technical">Technical problem</option>
            <option value="other">Something else</option>
          </Select>
        </FieldControl>
      </Field>

      {events.length > 0 ? (
        <Field>
          <FieldLabel optional>Related event</FieldLabel>
          <FieldControl>
            <Select
              {...form.register('eventId')}
              onChange={(e) => form.setValue('eventId', e.target.value || null)}
            >
              <option value="">Not about a specific event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.label}</option>
              ))}
            </Select>
          </FieldControl>
        </Field>
      ) : null}

      <Field error={form.formState.errors.subject?.message}>
        <FieldLabel>Subject</FieldLabel>
        <FieldControl>
          <Input placeholder="A one-line summary" {...form.register('subject')} />
        </FieldControl>
      </Field>

      <Field error={form.formState.errors.message?.message}>
        <FieldLabel>What happened?</FieldLabel>
        <FieldDescription>
          Dates, amounts and what you expected help us resolve it in one round rather than three.
        </FieldDescription>
        <FieldControl>
          <Textarea rows={5} {...form.register('message')} />
        </FieldControl>
      </Field>

      <Button type="submit" loading={form.formState.isSubmitting}>Raise ticket</Button>
    </form>
  );
}
