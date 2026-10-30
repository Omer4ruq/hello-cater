import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(120),
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  phone: z.string().trim().max(24).optional().default(''),
  topic: z.enum(['event', 'corporate', 'partner', 'support', 'other']).default('event'),
  message: z.string().trim().min(10, 'Tell us a little more').max(4000),
  /** Honeypot — real people leave this empty. */
  company_website: z.string().max(0).optional().default(''),
});

export type ContactInput = z.input<typeof contactSchema>;

export const ticketSchema = z.object({
  subject: z.string().trim().min(3, 'Give your ticket a subject').max(160),
  category: z.enum(['payment', 'delivery', 'service_quality', 'cancellation', 'refund', 'account', 'technical', 'other']),
  message: z.string().trim().min(10, 'Describe the issue').max(4000),
  eventId: z.string().uuid().nullable().optional(),
  bookingId: z.string().uuid().nullable().optional(),
});

export type TicketInput = z.input<typeof ticketSchema>;
