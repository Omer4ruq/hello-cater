'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldControl, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { loginSchema, type LoginInput } from '../schema';
import { signIn } from '../actions';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', next },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await signIn(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(result.data.redirectTo);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field error={form.formState.errors.email?.message}>
        <FieldLabel>Email address</FieldLabel>
        <FieldControl>
          <Input type="email" autoComplete="email" autoFocus {...form.register('email')} />
        </FieldControl>
      </Field>

      <Field error={form.formState.errors.password?.message}>
        <div className="flex items-baseline justify-between">
          <FieldLabel>Password</FieldLabel>
          <Link href="/forgot-password" className="text-sm text-brand-700 underline underline-offset-4">
            Forgot?
          </Link>
        </div>
        <FieldControl>
          <Input type="password" autoComplete="current-password" {...form.register('password')} />
        </FieldControl>
      </Field>

      <Button type="submit" block size="lg" loading={form.formState.isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
