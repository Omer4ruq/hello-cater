import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { forbidden, unauthenticated } from '@/lib/errors';
import type { Permission, PlatformRole } from './permissions';
import { ROLE_PERMISSIONS } from './permissions';
import type { Tables } from '@/types/database';

export type OrgMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  kind: 'customer' | 'partner';
  role: 'owner' | 'admin' | 'manager' | 'staff';
  partnerId: string | null;
  spendLimitMinor: number | null;
  requiresApproval: boolean;
};

export type SessionUser = {
  id: string;
  email: string | null;
  profile: Tables<'profiles'>;
  platformRole: PlatformRole | null;
  permissions: Permission[];
  memberships: OrgMembership[];
  /** Convenience accessors for the three product surfaces. */
  isStaff: boolean;
  customerOrgs: OrgMembership[];
  partnerOrgs: OrgMembership[];
};

/**
 * Loads the signed-in user with their profile, platform role and
 * organisation memberships.
 *
 * Wrapped in React's `cache` so a page that checks permissions in the
 * layout, the page and three components still issues one set of queries
 * per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, staffResult, membershipResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('platform_staff').select('role, is_active').eq('profile_id', user.id).maybeSingle(),
    supabase
      .from('organization_members')
      .select(
        'role, spend_limit_minor, requires_approval, organizations!inner(id, name, slug, kind, partner_profiles(id))',
      )
      .eq('profile_id', user.id)
      .eq('status', 'active'),
  ]);

  if (profileResult.error || !profileResult.data) return null;

  const platformRole =
    staffResult.data?.is_active === true ? (staffResult.data.role as PlatformRole) : null;

  type MembershipRow = {
    role: OrgMembership['role'];
    spend_limit_minor: number | null;
    requires_approval: boolean;
    organizations: {
      id: string;
      name: string;
      slug: string;
      kind: 'customer' | 'partner';
      // organization_id is unique on partner_profiles, so PostgREST returns one object.
      partner_profiles: { id: string } | { id: string }[] | null;
    };
  };

  const memberships: OrgMembership[] = ((membershipResult.data ?? []) as unknown as MembershipRow[])
    .filter((m) => m.organizations)
    .map((m) => ({
      organizationId: m.organizations.id,
      organizationName: m.organizations.name,
      organizationSlug: m.organizations.slug,
      kind: m.organizations.kind,
      role: m.role,
      partnerId: [m.organizations.partner_profiles ?? []].flat()[0]?.id ?? null,
      spendLimitMinor: m.spend_limit_minor,
      requiresApproval: m.requires_approval,
    }));

  return {
    id: user.id,
    email: user.email ?? profileResult.data.email ?? null,
    profile: profileResult.data,
    platformRole,
    permissions: platformRole ? [...ROLE_PERMISSIONS[platformRole]] : [],
    memberships,
    isStaff: platformRole !== null,
    customerOrgs: memberships.filter((m) => m.kind === 'customer'),
    partnerOrgs: memberships.filter((m) => m.kind === 'partner'),
  };
});

/** Throws rather than redirecting — for route handlers and server actions. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthenticated();
  return user;
}

/** Redirects to sign-in — for pages. */
export async function requireUserPage(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''}`);
  }
  return user;
}

export function hasPermission(user: SessionUser | null, permission: Permission): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) {
    throw forbidden(`This action requires the "${permission}" permission.`);
  }
  return user;
}

/** Any staff role. Use `requirePermission` where a specific capability matters. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isStaff) throw forbidden('This area is restricted to platform staff.');
  return user;
}

/**
 * Asserts the user belongs to the given partner organisation.
 * Returns the membership so callers can additionally check the role.
 */
export async function requirePartnerAccess(partnerId: string): Promise<{
  user: SessionUser;
  membership: OrgMembership;
}> {
  const user = await requireUser();
  const membership = user.partnerOrgs.find((m) => m.partnerId === partnerId);
  if (!membership) {
    if (user.isStaff && user.permissions.includes('partners.manage')) {
      return {
        user,
        membership: {
          organizationId: '',
          organizationName: 'Platform',
          organizationSlug: 'platform',
          kind: 'partner',
          role: 'admin',
          partnerId,
          spendLimitMinor: null,
          requiresApproval: false,
        },
      };
    }
    throw forbidden('You do not have access to this partner account.');
  }
  return { user, membership };
}

/** The partner the user is currently operating as (first membership). */
export function activePartnerId(user: SessionUser): string | null {
  return user.partnerOrgs.find((m) => m.partnerId)?.partnerId ?? null;
}
