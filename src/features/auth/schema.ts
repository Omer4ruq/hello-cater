import { z } from 'zod';
import { phoneSchema } from '@/features/requests/schema';

/**
 * Password policy: length beats composition rules for real-world
 * strength, so we require 10+ characters and reject the handful of
 * obvious choices rather than demanding symbols.
 */
const WEAK = new Set([
  'password', 'password1', 'password123', '1234567890', 'qwertyuiop',
  'iloveyou1', 'bangladesh', 'dhaka12345', 'letmein123', 'admin12345',
]);

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'That is too long')
  .refine((v) => !WEAK.has(v.toLowerCase()), 'That password is too easy to guess')
  .refine((v) => !/^(.)\1+$/.test(v), 'That password is too easy to guess');

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Enter your password'),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your name').max(120),
    email: z.string().trim().email('Enter a valid email address').toLowerCase(),
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    accountType: z.enum(['individual', 'company']).default('individual'),
    companyName: z.string().trim().max(160).optional(),
    acceptTerms: z.literal(true, { message: 'Please accept the terms to continue' }),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
    }
    if (value.accountType === 'company' && !value.companyName?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'Enter your company name' });
    }
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
});

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const partnerSignupSchema = z
  .object({
    businessName: z.string().trim().min(2, 'Enter your business name').max(160),
    contactName: z.string().trim().min(2, 'Enter the owner or contact name').max(120),
    email: z.string().trim().email('Enter a valid email address').toLowerCase(),
    phone: phoneSchema,
    password: passwordSchema,
    businessType: z.enum(['sole_proprietor', 'partnership', 'private_limited', 'individual', 'other']),
    categoryIds: z.array(z.string().uuid()).min(1, 'Choose at least one service you offer'),
    cityId: z.string().uuid('Choose your city'),
    areaIds: z.array(z.string().uuid()).default([]),
    yearEstablished: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
    maxGuests: z.number().int().min(1).max(100_000).nullable().optional(),
    about: z.string().trim().max(2000).optional().default(''),
    acceptTerms: z.literal(true, { message: 'Please accept the partner agreement' }),
    company_website: z.string().max(0).optional().default(''),
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type PartnerSignupInput = z.input<typeof partnerSignupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
