import { z } from 'zod';

/**
 * Validation for the event request wizard.
 *
 * The same schemas run on the client (for inline feedback) and on the
 * server (as the authority). Nothing is trusted from the browser.
 */

export const BD_PHONE = /^(\+?88)?01[3-9]\d{8}$/;

/** Normalises the many ways a Bangladeshi number gets typed. */
export function normalisePhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  const withoutPrefix = digits.replace(/^\+?88/, '').replace(/^0/, '');
  return `+880${withoutPrefix}`;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .refine((v) => BD_PHONE.test(v.replace(/[\s-]/g, '')), 'Enter a valid Bangladeshi mobile number, e.g. 01712345678')
  .transform((v) => normalisePhone(v));

export const budgetModeSchema = z.enum(['total', 'per_person', 'range', 'flexible']);

/** Step 1–5: the essentials the quick form on the homepage captures. */
export const quickRequestSchema = z.object({
  eventTypeId: z.string().uuid('Choose the type of event'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date').nullable(),
  guestCount: z.number().int().min(1, 'At least 1 guest').max(100_000).nullable(),
  cityId: z.string().uuid('Choose a city'),
  areaId: z.string().uuid().nullable().optional(),
});

export type QuickRequestInput = z.infer<typeof quickRequestSchema>;

/** The full wizard payload. */
export const eventRequestSchema = z
  .object({
    // Step 1
    eventTypeId: z.string().uuid('Choose the type of event'),
    title: z.string().trim().max(160).optional().default(''),

    // Steps 2–3
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose an event date'),
    eventEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a start time').nullable().optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    isDateFlexible: z.boolean().default(false),

    // Step 4
    guestCount: z.number().int().min(1, 'Tell us roughly how many guests').max(100_000),
    guestCountMax: z.number().int().min(1).max(100_000).nullable().optional(),

    // Step 5
    cityId: z.string().uuid('Choose a city'),
    areaId: z.string().uuid().nullable().optional(),
    venueName: z.string().trim().max(160).optional().default(''),
    addressLine: z.string().trim().max(400).optional().default(''),
    venueNotes: z.string().trim().max(1000).optional().default(''),

    // Step 6
    categoryIds: z.array(z.string().uuid()).min(1, 'Choose at least one service'),

    // Step 7
    cuisineIds: z.array(z.string().uuid()).default([]),
    dietaryNotes: z.string().trim().max(1000).optional().default(''),

    // Step 8
    budgetMode: budgetModeSchema.default('flexible'),
    budgetTotalMinor: z.number().int().nonnegative().nullable().optional(),
    budgetPerPersonMinor: z.number().int().nonnegative().nullable().optional(),
    budgetMinMinor: z.number().int().nonnegative().nullable().optional(),
    budgetMaxMinor: z.number().int().nonnegative().nullable().optional(),

    // Step 9
    requirements: z.string().trim().max(4000).optional().default(''),

    // Step 10
    contactName: z.string().trim().min(2, 'Tell us who to contact').max(120),
    contactPhone: phoneSchema,
    contactEmail: z.string().trim().email('Enter a valid email address').toLowerCase(),
    preferredChannel: z.enum(['phone', 'email', 'whatsapp', 'platform']).default('phone'),
    organizationId: z.string().uuid().nullable().optional(),

    /** Honeypot: a real person never fills this in. */
    company_website: z.string().max(0).optional().default(''),
  })
  .superRefine((value, ctx) => {
    if (value.budgetMode === 'total' && !value.budgetTotalMinor) {
      ctx.addIssue({ code: 'custom', path: ['budgetTotalMinor'], message: 'Enter your total budget' });
    }
    if (value.budgetMode === 'per_person' && !value.budgetPerPersonMinor) {
      ctx.addIssue({ code: 'custom', path: ['budgetPerPersonMinor'], message: 'Enter a per-person budget' });
    }
    if (value.budgetMode === 'range') {
      if (!value.budgetMinMinor || !value.budgetMaxMinor) {
        ctx.addIssue({ code: 'custom', path: ['budgetMinMinor'], message: 'Enter both ends of the range' });
      } else if (value.budgetMaxMinor < value.budgetMinMinor) {
        ctx.addIssue({ code: 'custom', path: ['budgetMaxMinor'], message: 'The maximum must be at least the minimum' });
      }
    }
    if (value.guestCountMax && value.guestCountMax < value.guestCount) {
      ctx.addIssue({ code: 'custom', path: ['guestCountMax'], message: 'The upper estimate must be at least the lower one' });
    }
    if (value.eventEndDate && value.eventEndDate < value.eventDate) {
      ctx.addIssue({ code: 'custom', path: ['eventEndDate'], message: 'The end date cannot be before the start date' });
    }

    // A date in the past is almost always a typo.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${value.eventDate}T00:00:00`) < today) {
      ctx.addIssue({ code: 'custom', path: ['eventDate'], message: 'Choose a date in the future' });
    }
  });

export type EventRequestInput = z.input<typeof eventRequestSchema>;
export type EventRequestParsed = z.output<typeof eventRequestSchema>;

export const WIZARD_STEPS = [
  { id: 'type', label: 'Event type', title: 'What are you planning?' },
  { id: 'date', label: 'Date & time', title: 'When is it?' },
  { id: 'guests', label: 'Guests', title: 'How many guests?' },
  { id: 'location', label: 'Location', title: 'Where is it?' },
  { id: 'services', label: 'Services', title: 'What do you need?' },
  { id: 'food', label: 'Food', title: 'Food & cuisine' },
  { id: 'budget', label: 'Budget', title: 'What is your budget?' },
  { id: 'details', label: 'Details', title: 'Anything else?' },
  { id: 'contact', label: 'Contact', title: 'How do we reach you?' },
  { id: 'review', label: 'Review', title: 'Review your request' },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];

/** Fields validated at each step, so "Next" can gate progress. */
export const STEP_FIELDS: Record<WizardStepId, (keyof EventRequestParsed)[]> = {
  type: ['eventTypeId'],
  date: ['eventDate', 'eventEndDate', 'startTime'],
  guests: ['guestCount', 'guestCountMax'],
  location: ['cityId', 'areaId', 'venueName'],
  services: ['categoryIds'],
  food: ['cuisineIds', 'dietaryNotes'],
  budget: ['budgetMode', 'budgetTotalMinor', 'budgetPerPersonMinor', 'budgetMinMinor', 'budgetMaxMinor'],
  details: ['requirements'],
  contact: ['contactName', 'contactPhone', 'contactEmail', 'preferredChannel'],
  review: [],
};
