'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { enforceRateLimit, clientIdentifier } from '@/lib/rate-limit';
import { toPublicError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { appUrl } from '@/lib/env';
import { slugify } from '@/lib/utils';
import { recordAudit } from '@/features/audit/log';
import { sendTransactionalEmail } from '@/features/notifications/service';
import {
  loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, partnerSignupSchema,
  type LoginInput, type RegisterInput, type ForgotPasswordInput,
  type ResetPasswordInput, type PartnerSignupInput,
} from './schema';

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Where a user lands after signing in, based on what they actually are. */
export async function resolveLandingPath(): Promise<string> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '/login';

  const [{ data: staff }, { data: memberships }] = await Promise.all([
    supabase.from('platform_staff').select('role').eq('profile_id', user.id).eq('is_active', true).maybeSingle(),
    supabase
      .from('organization_members')
      .select('organizations!inner(kind)')
      .eq('profile_id', user.id)
      .eq('status', 'active'),
  ]);

  if (staff) return '/admin';
  const kinds = (memberships ?? []).map(
    (m) => (m.organizations as unknown as { kind: string }).kind,
  );
  if (kinds.includes('partner')) return '/partner';
  return '/dashboard';
}

export async function signIn(input: LoginInput): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return fail('Please check your details.', parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    await enforceRateLimit('auth_attempt', await clientIdentifier(parsed.data.email),
      'Too many sign-in attempts. Please wait 15 minutes and try again.');

    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      // Deliberately generic: revealing whether an account exists helps
      // credential-stuffing attacks.
      return fail('That email and password combination did not work.');
    }

    await recordAudit({
      actorId: data.user.id, action: 'auth.login', entity: 'auth.users', entityId: data.user.id,
    });

    const target = parsed.data.next?.startsWith('/') ? parsed.data.next : await resolveLandingPath();
    revalidatePath('/', 'layout');
    return { ok: true, data: { redirectTo: target } };
  } catch (error) {
    return fail(toPublicError(error).message);
  }
}

export async function register(input: RegisterInput): Promise<ActionResult<{ redirectTo: string; needsConfirmation: boolean }>> {
  try {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return fail('Please check the highlighted fields.', parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    await enforceRateLimit('auth_attempt', await clientIdentifier(data.email));

    const supabase = await createServerSupabase();
    const { data: signUpResult, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        data: { full_name: data.fullName, phone: data.phone },
      },
    });

    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        return fail('An account already exists for that email. Try signing in, or reset your password.');
      }
      logger.warn('Sign-up failed', { error });
      return fail('We could not create your account. Please try again.');
    }
    if (!signUpResult.user) return fail('We could not create your account. Please try again.');

    // A company account gets its organisation immediately, with the
    // registering user as owner.
    if (data.accountType === 'company' && data.companyName) {
      const admin = createAdminSupabase();
      const baseSlug = slugify(data.companyName) || 'company';
      const { data: org } = await admin
        .from('organizations')
        .insert({
          kind: 'customer',
          name: data.companyName,
          slug: `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`,
          email: data.email,
          phone: data.phone,
          created_by: signUpResult.user.id,
        })
        .select('id')
        .single();

      if (org) {
        await admin.from('organization_members').insert({
          organization_id: org.id,
          profile_id: signUpResult.user.id,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString(),
        });
      }
    }

    await Promise.all([
      recordAudit({
        actorId: signUpResult.user.id, action: 'auth.register',
        entity: 'auth.users', entityId: signUpResult.user.id,
        summary: `${data.accountType} account`,
      }),
      sendTransactionalEmail({
        to: data.email, template: 'welcome',
        data: { name: data.fullName }, profileId: signUpResult.user.id,
        dedupeKey: `welcome:${signUpResult.user.id}`,
      }),
    ]);

    revalidatePath('/', 'layout');
    return {
      ok: true,
      data: { redirectTo: '/dashboard', needsConfirmation: !signUpResult.session },
    };
  } catch (error) {
    return fail(toPublicError(error).message);
  }
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResult> {
  try {
    const parsed = forgotPasswordSchema.safeParse(input);
    if (!parsed.success) return fail('Enter a valid email address.');

    await enforceRateLimit('auth_attempt', await clientIdentifier(parsed.data.email));

    const supabase = await createServerSupabase();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });

    // Always report success: revealing whether an address is registered
    // is an account-enumeration vector.
    return { ok: true };
  } catch (error) {
    logger.warn('Password reset request failed', { error });
    return { ok: true };
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
  try {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return fail('Please check the highlighted fields.', parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Your reset link has expired. Please request a new one.');

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return fail('We could not update your password. Please request a new reset link.');

    await recordAudit({
      actorId: user.id, action: 'auth.password_reset', entity: 'auth.users', entityId: user.id,
    });
    return { ok: true };
  } catch (error) {
    return fail(toPublicError(error).message);
  }
}

export async function signOut() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  if (user) {
    await recordAudit({ actorId: user.id, action: 'auth.logout', entity: 'auth.users', entityId: user.id });
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * Partner self-signup.
 *
 * Creates the account, the partner organisation and an unverified
 * partner profile in one go. The profile is NOT published and cannot
 * quote until operations approves it.
 */
export async function registerPartner(input: PartnerSignupInput): Promise<ActionResult<{ partnerId: string }>> {
  try {
    const parsed = partnerSignupSchema.safeParse(input);
    if (!parsed.success) {
      return fail('Please check the highlighted fields.', parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;
    if (data.company_website) return fail('Submission rejected.');

    await enforceRateLimit('auth_attempt', await clientIdentifier(data.email));

    const supabase = await createServerSupabase();
    const { data: signUpResult, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=/partner`,
        data: { full_name: data.contactName, phone: data.phone },
      },
    });

    if (signUpError || !signUpResult.user) {
      if (signUpError && /already registered|already exists/i.test(signUpError.message)) {
        return fail('An account already exists for that email. Sign in and apply from your dashboard.');
      }
      return fail('We could not create your partner account. Please try again.');
    }

    const admin = createAdminSupabase();
    const userId = signUpResult.user.id;
    const baseSlug = slugify(data.businessName) || 'partner';
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({
        kind: 'partner',
        name: data.businessName,
        slug: uniqueSlug,
        email: data.email,
        phone: data.phone,
        created_by: userId,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      logger.error('Partner organisation creation failed', { error: orgError });
      return fail('We could not create your partner account. Please contact support.');
    }

    await admin.from('organization_members').insert({
      organization_id: org.id, profile_id: userId, role: 'owner',
      status: 'active', joined_at: new Date().toISOString(),
    });

    const { data: partner, error: partnerError } = await admin
      .from('partner_profiles')
      .insert({
        organization_id: org.id,
        slug: uniqueSlug,
        display_name: data.businessName,
        business_type: data.businessType,
        year_established: data.yearEstablished ?? null,
        max_guests: data.maxGuests ?? null,
        about: data.about || null,
        // Unverified and unpublished: it cannot appear publicly or quote.
        verification_status: 'pending',
        published_at: null,
      })
      .select('id')
      .single();

    if (partnerError || !partner) {
      logger.error('Partner profile creation failed', { error: partnerError });
      return fail('We could not create your partner profile. Please contact support.');
    }

    await Promise.all([
      admin.from('partner_categories').insert(
        data.categoryIds.map((categoryId, i) => ({
          partner_id: partner.id, category_id: categoryId, is_primary: i === 0,
        })),
      ),
      data.areaIds.length
        ? admin.from('partner_service_areas').insert(
            data.areaIds.map((areaId) => ({
              partner_id: partner.id, city_id: data.cityId, area_id: areaId,
            })),
          )
        : admin.from('partner_service_areas').insert({ partner_id: partner.id, city_id: data.cityId }),
      admin.from('partner_verification_events').insert({
        partner_id: partner.id, to_status: 'pending', notes: 'Self-service signup submitted',
      }),
    ]);

    await recordAudit({
      actorId: userId, action: 'auth.register', entity: 'partner_profiles', entityId: partner.id,
      summary: `Partner signup: ${data.businessName}`,
    });

    revalidatePath('/admin/partners');
    return { ok: true, data: { partnerId: partner.id } };
  } catch (error) {
    logger.error('registerPartner failed', { error });
    return fail(toPublicError(error).message);
  }
}
