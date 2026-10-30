'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import {
  forgotPasswordSchema, resetPasswordSchema,
  type ForgotPasswordInput, type ResetPasswordInput,
} from '../schema';
import { requestPasswordReset, resetPassword } from '../actions';

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await requestPasswordReset(values);
    // Always shows the same confirmation, whether or not the address is
    // registered — otherwise this form enumerates accounts.
    setSent(true);
  });

  if (sent) {
    return (
      <Alert tone="success" className="mt-8" title="Check your email">
        If an account exists for that address, a reset link is on its way. The link expires in
        60 minutes.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <Field error={form.formState.errors.email?.message}>
        <FieldLabel>Email address</FieldLabel>
        <FieldControl>
          <Input type="email" autoComplete="email" autoFocus {...form.register('email')} />
        </FieldControl>
      </Field>
      <Button type="submit" block size="lg" loading={form.formState.isSubmitting}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await resetPassword(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push('/login?message=Your password has been updated. Please sign in.');
      router.refresh();
    }, 1200);
  });

  if (done) {
    return (
      <Alert tone="success" className="mt-8" title="Password updated">
        Taking you to sign in…{' '}
        <Link href="/login" className="font-medium underline underline-offset-4">Go now</Link>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field error={form.formState.errors.password?.message}>
        <FieldLabel>New password</FieldLabel>
        <FieldDescription>At least 10 characters.</FieldDescription>
        <FieldControl>
          <Input type="password" autoComplete="new-password" autoFocus {...form.register('password')} />
        </FieldControl>
      </Field>
      <Field error={form.formState.errors.confirmPassword?.message}>
        <FieldLabel>Confirm new password</FieldLabel>
        <FieldControl>
          <Input type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
        </FieldControl>
      </Field>
      <Button type="submit" block size="lg" loading={form.formState.isSubmitting}>
        Update password
      </Button>
    </form>
  );
}
