'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field, FieldControl, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { contactSchema, type ContactInput } from '../schema';
import { submitContactForm } from '../actions';

export function ContactForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', topic: 'event', message: '', company_website: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await submitContactForm(values);
    if (!result.ok) {
      setError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof ContactInput, { message: messages[0] });
        }
      }
      return;
    }
    setSent(true);
  });

  if (sent) {
    return (
      <Alert tone="success" title="Message received">
        <p className="flex items-start gap-2">
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          Thank you — we will reply within one working day. If it is urgent, please call us.
        </p>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...form.register('company_website')} />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field error={form.formState.errors.topic?.message}>
        <FieldLabel>What is this about?</FieldLabel>
        <FieldControl>
          <Select {...form.register('topic')}>
            <option value="event">Planning an event</option>
            <option value="corporate">Corporate / company account</option>
            <option value="partner">Becoming a partner</option>
            <option value="support">Help with an existing booking</option>
            <option value="other">Something else</option>
          </Select>
        </FieldControl>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={form.formState.errors.name?.message}>
          <FieldLabel>Your name</FieldLabel>
          <FieldControl><Input autoComplete="name" {...form.register('name')} /></FieldControl>
        </Field>
        <Field error={form.formState.errors.phone?.message}>
          <FieldLabel optional>Phone</FieldLabel>
          <FieldControl>
            <Input type="tel" inputMode="tel" placeholder="01712345678" {...form.register('phone')} />
          </FieldControl>
        </Field>
      </div>

      <Field error={form.formState.errors.email?.message}>
        <FieldLabel>Email address</FieldLabel>
        <FieldControl><Input type="email" autoComplete="email" {...form.register('email')} /></FieldControl>
      </Field>

      <Field error={form.formState.errors.message?.message}>
        <FieldLabel>Message</FieldLabel>
        <FieldControl>
          <Textarea rows={6} placeholder="Tell us what you are planning, or what you need help with." {...form.register('message')} />
        </FieldControl>
      </Field>

      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>Send message</Button>
    </form>
  );
}
