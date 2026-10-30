'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { updateProfile, type ProfileValues } from '../actions';

export function ProfileForm({ initial, email }: { initial: ProfileValues; email: string | null }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<ProfileValues>({ defaultValues: initial });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await updateProfile(values);
    if (!result.ok) {
      setError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof ProfileValues, { message: messages[0] });
        }
      }
      return;
    }
    toast.success('Profile saved');
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field error={form.formState.errors.fullName?.message}>
        <FieldLabel>Full name</FieldLabel>
        <FieldControl><Input autoComplete="name" {...form.register('fullName')} /></FieldControl>
      </Field>

      <Field>
        <FieldLabel>Email address</FieldLabel>
        <FieldDescription>
          This is your sign-in address. Contact support to change it.
        </FieldDescription>
        <FieldControl>
          <Input value={email ?? ''} disabled readOnly />
        </FieldControl>
      </Field>

      <Field error={form.formState.errors.phone?.message}>
        <FieldLabel optional>Mobile number</FieldLabel>
        <FieldDescription>We use this for urgent event-day contact only.</FieldDescription>
        <FieldControl>
          <Input type="tel" inputMode="tel" placeholder="01712345678" {...form.register('phone')} />
        </FieldControl>
      </Field>

      <Field>
        <FieldLabel>Language</FieldLabel>
        <FieldControl>
          <Select {...form.register('locale')}>
            <option value="en">English</option>
            <option value="bn">বাংলা (Bangla)</option>
          </Select>
        </FieldControl>
      </Field>

      <Button type="submit" loading={form.formState.isSubmitting}>Save profile</Button>
    </form>
  );
}
