'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireUser } from '@/features/auth/session';
import { toPublicError } from '@/lib/errors';
import { phoneSchema } from '@/features/requests/schema';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name').max(120),
  phone: phoneSchema.or(z.literal('')),
  locale: z.enum(['en', 'bn']).default('en'),
});

export type ProfileValues = z.input<typeof profileSchema>;

/**
 * Updates the caller's own profile.
 *
 * RLS restricts the row to `id = auth.uid()`, so this cannot be turned
 * into an edit-anyone endpoint even if the id were supplied.
 */
export async function updateProfile(
  input: ProfileValues,
): Promise<{ ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }> {
  try {
    const user = await requireUser();
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Please check the highlighted fields.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone || null,
        locale: parsed.data.locale,
      })
      .eq('id', user.id);

    if (error) return { ok: false, error: 'We could not save your profile.' };

    revalidatePath('/account');
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}
