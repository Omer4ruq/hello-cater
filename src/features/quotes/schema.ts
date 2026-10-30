import { z } from 'zod';

export const CHARGE_KINDS = [
  'food', 'beverage', 'delivery', 'setup', 'service_staff', 'equipment',
  'decoration', 'venue', 'transport', 'rental', 'other',
] as const;

export const CHARGE_KIND_LABELS: Record<(typeof CHARGE_KINDS)[number], string> = {
  food: 'Food', beverage: 'Beverage', delivery: 'Delivery', setup: 'Setup',
  service_staff: 'Service staff', equipment: 'Equipment', decoration: 'Decoration',
  venue: 'Venue', transport: 'Transport', rental: 'Rental', other: 'Other',
};

export const QUOTE_UNITS = [
  'per_person', 'per_piece', 'per_kg', 'per_tray', 'per_item', 'flat', 'per_hour', 'per_day',
] as const;

export const UNIT_LABELS: Record<(typeof QUOTE_UNITS)[number], string> = {
  per_person: 'per person', per_piece: 'per piece', per_kg: 'per kg',
  per_tray: 'per tray', per_item: 'per item', flat: 'flat', per_hour: 'per hour', per_day: 'per day',
};

export const quoteItemSchema = z.object({
  id: z.string().optional(),
  chargeKind: z.enum(CHARGE_KINDS).default('food'),
  label: z.string().trim().min(1, 'Describe this line').max(200),
  description: z.string().trim().max(600).optional().default(''),
  unit: z.enum(QUOTE_UNITS).default('per_person'),
  quantity: z.number().positive('Quantity must be greater than zero').max(1_000_000),
  unitPriceMinor: z.number().int().nonnegative('Price cannot be negative'),
  isOptional: z.boolean().default(false),
});

export const quoteDraftSchema = z
  .object({
    quoteId: z.string().uuid().optional(),
    requestId: z.string().uuid(),
    inviteId: z.string().uuid().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    guestCount: z.number().int().positive().nullable().optional(),
    menuId: z.string().uuid().nullable().optional(),
    packageId: z.string().uuid().nullable().optional(),
    items: z.array(quoteItemSchema).min(1, 'Add at least one line item'),
    discountMinor: z.number().int().nonnegative().default(0),
    taxMinor: z.number().int().nonnegative().default(0),
    notes: z.string().trim().max(4000).optional().default(''),
    paymentTerms: z.string().trim().max(2000).optional().default(''),
    cancellationPolicy: z.string().trim().max(2000).optional().default(''),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    changeSummary: z.string().trim().max(1000).optional().default(''),
  })
  .superRefine((value, ctx) => {
    const subtotal = value.items
      .filter((i) => !i.isOptional)
      .reduce((sum, i) => sum + Math.round(i.quantity * i.unitPriceMinor), 0);
    if (value.discountMinor > subtotal + value.taxMinor) {
      ctx.addIssue({
        code: 'custom', path: ['discountMinor'],
        message: 'A discount cannot exceed the quote total',
      });
    }
    if (subtotal === 0) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: 'The quote total cannot be zero' });
    }
  });

export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuoteDraftInput = z.input<typeof quoteDraftSchema>;
export type QuoteDraftParsed = z.output<typeof quoteDraftSchema>;

/** Mirrors the database's round(quantity * unit_price_minor). */
export function lineTotalMinor(item: { quantity: number; unitPriceMinor: number }): number {
  return Math.round(item.quantity * item.unitPriceMinor);
}

export function quoteTotals(input: {
  items: { quantity: number; unitPriceMinor: number; isOptional?: boolean }[];
  discountMinor: number;
  taxMinor: number;
  guestCount?: number | null;
}) {
  const subtotalMinor = input.items
    .filter((i) => !i.isOptional)
    .reduce((sum, i) => sum + lineTotalMinor(i), 0);
  const optionalMinor = input.items
    .filter((i) => i.isOptional)
    .reduce((sum, i) => sum + lineTotalMinor(i), 0);
  const totalMinor = Math.max(subtotalMinor + input.taxMinor - input.discountMinor, 0);
  return {
    subtotalMinor,
    optionalMinor,
    totalMinor,
    perPersonMinor:
      input.guestCount && input.guestCount > 0 ? Math.round(totalMinor / input.guestCount) : null,
  };
}
