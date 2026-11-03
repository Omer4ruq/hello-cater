'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { registerSchema, type RegisterInput } from '../schema';
import { register as registerAction } from '../actions';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = React.useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '', email: '', phone: '', password: '', confirmPassword: '',
      accountType: 'individual', companyName: '', acceptTerms: false as unknown as true,
    },
  });

  const accountType = useWatch({ control: form.control, name: 'accountType' });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await registerAction(values);
    if (!result.ok) {
      setError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof RegisterInput, { message: messages[0] });
        }
      }
      return;
    }
    if (result.data.needsConfirmation) {
      setConfirmationSent(true);
      return;
    }
    router.push(result.data.redirectTo);
    router.refresh();
  });

  if (confirmationSent) {
    return (
      <Alert tone="success" className="mt-8" title="Check your email">
        <p>
          We sent a confirmation link to <strong>{form.getValues('email')}</strong>. Click it to
          activate your account, then sign in.
        </p>
        <p className="mt-2">
          <Link href="/login" className="font-medium underline underline-offset-4">Go to sign in</Link>
        </p>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-900">Account type</legend>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'individual', label: 'Personal', hint: 'Weddings, birthdays, family events' },
            { value: 'company', label: 'Company', hint: 'Corporate catering and events' },
          ] as const).map((option) => (
            <label
              key={option.value}
              className={cn(
                'cursor-pointer rounded-xl border p-4 transition-[border-color,background-color] duration-200 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink-900',
                accountType === option.value
                  ? 'border-ink-900 bg-white ring-1 ring-ink-900'
                  : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
              )}
            >
              <input
                type="radio" value={option.value} className="sr-only"
                {...form.register('accountType')}
              />
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                {accountType === option.value ? (
                  <CheckCircle2 aria-hidden className="size-4 text-brand-700" />
                ) : null}
                {option.label}
              </span>
              <span className="mt-1 block text-xs text-ink-600">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {accountType === 'company' ? (
        <Field error={form.formState.errors.companyName?.message}>
          <FieldLabel>Company name</FieldLabel>
          <FieldControl>
            <Input placeholder="e.g. ABC Technologies Ltd." {...form.register('companyName')} />
          </FieldControl>
        </Field>
      ) : null}

      <Field error={form.formState.errors.fullName?.message}>
        <FieldLabel>Your name</FieldLabel>
        <FieldControl><Input autoComplete="name" {...form.register('fullName')} /></FieldControl>
      </Field>

      <Field error={form.formState.errors.email?.message}>
        <FieldLabel>Email address</FieldLabel>
        <FieldControl><Input type="email" autoComplete="email" {...form.register('email')} /></FieldControl>
      </Field>

      <Field error={form.formState.errors.phone?.message}>
        <FieldLabel>Mobile number</FieldLabel>
        <FieldControl>
          <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="01712345678" {...form.register('phone')} />
        </FieldControl>
      </Field>

      <Field error={form.formState.errors.password?.message}>
        <FieldLabel>Password</FieldLabel>
        <FieldDescription>At least 10 characters. A short phrase works well.</FieldDescription>
        <FieldControl>
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </FieldControl>
      </Field>

      <Field error={form.formState.errors.confirmPassword?.message}>
        <FieldLabel>Confirm password</FieldLabel>
        <FieldControl>
          <Input type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
        </FieldControl>
      </Field>

      <Field error={form.formState.errors.acceptTerms?.message}>
        <label className="flex items-start gap-3 text-sm text-ink-700">
          <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" {...form.register('acceptTerms')} />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="font-semibold text-ink-900 underline decoration-ink-300 underline-offset-4 transition-colors hover:decoration-ink-900">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="font-semibold text-ink-900 underline decoration-ink-300 underline-offset-4 transition-colors hover:decoration-ink-900">Privacy Policy</Link>.
          </span>
        </label>
      </Field>

      <Button type="submit" block size="lg" loading={form.formState.isSubmitting}>
        Create account
      </Button>
    </form>
  );
}
