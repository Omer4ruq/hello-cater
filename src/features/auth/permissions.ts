/**
 * The permission catalogue, mirrored from the `permissions` table so the
 * TypeScript side gets autocomplete and compile-time checking. The
 * database remains the enforcement point; this is the vocabulary.
 */
export const PERMISSIONS = [
  'requests.view', 'requests.manage',
  'partners.view', 'partners.manage', 'partners.verify',
  'customers.view', 'customers.manage',
  'quotes.view', 'quotes.manage',
  'proposals.manage',
  'bookings.view', 'bookings.manage',
  'events.manage',
  'payments.view', 'payments.manage',
  'invoices.manage',
  'payouts.view', 'payouts.approve',
  'reports.view',
  'disputes.manage', 'tickets.manage', 'reviews.moderate', 'messages.view_all',
  'cms.manage', 'catalog.manage',
  'settings.manage', 'staff.manage', 'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type PlatformRole =
  | 'super_admin' | 'ops_admin' | 'finance_admin' | 'support_admin' | 'content_admin';

/** Mirrors the role_permissions seed in 0002_identity.sql. */
export const ROLE_PERMISSIONS: Record<PlatformRole, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  ops_admin: [
    'requests.view', 'requests.manage', 'partners.view', 'partners.manage',
    'customers.view', 'customers.manage', 'quotes.view', 'quotes.manage',
    'proposals.manage', 'bookings.view', 'bookings.manage', 'events.manage',
    'payments.view', 'payouts.view', 'reports.view', 'messages.view_all',
    'tickets.manage', 'catalog.manage',
  ],
  finance_admin: [
    'requests.view', 'bookings.view', 'payments.view', 'payments.manage',
    'invoices.manage', 'payouts.view', 'payouts.approve', 'reports.view',
    'partners.view', 'customers.view', 'disputes.manage', 'audit.view',
  ],
  support_admin: [
    'requests.view', 'bookings.view', 'partners.view', 'customers.view',
    'quotes.view', 'tickets.manage', 'disputes.manage', 'reviews.moderate',
    'messages.view_all', 'payments.view',
  ],
  content_admin: ['cms.manage', 'catalog.manage', 'partners.view', 'reviews.moderate'],
};

export const ROLE_LABELS: Record<PlatformRole, string> = {
  super_admin: 'Super Admin',
  ops_admin: 'Operations',
  finance_admin: 'Finance',
  support_admin: 'Support',
  content_admin: 'Content',
};

export function roleHasPermission(role: PlatformRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
