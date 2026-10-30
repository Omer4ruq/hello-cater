import { brand } from '@/config/brand';

/**
 * Legal page registry and draft copy.
 *
 * IMPORTANT: every document below is a DRAFT written as a starting point
 * for a Bangladesh-qualified lawyer to review. None of it is legal
 * advice, and the VAT, consumer-protection and payment-settlement
 * treatment in particular must be confirmed with a local lawyer and
 * accountant before public launch. Admins can replace the body of any of
 * these from Admin → Content; this file is only the fallback.
 */

export const LEGAL_PAGES = [
  { slug: 'terms', title: 'Terms of Service', description: `The agreement between you and ${brand.legalName} when you use the platform.` },
  { slug: 'privacy', title: 'Privacy Policy', description: 'What personal data we collect, why, and what you can ask us to do with it.' },
  { slug: 'refund-policy', title: 'Cancellation & Refund Policy', description: 'How cancellations, refunds and disputes are handled.' },
  { slug: 'partner-agreement', title: 'Partner Agreement', description: 'The terms that apply to service partners on the platform.' },
] as const;

export type LegalSlug = (typeof LEGAL_PAGES)[number]['slug'];

const TERMS = `
${brand.legalName} ("we", "us") operates ${brand.name}, a managed marketplace that connects customers with independent catering and event service providers ("partners") in ${brand.country}. These terms govern your use of the platform.

## 1. What we do and do not do

We are an intermediary and coordinator. We shortlist partners, collect quotations, present proposals, collect payment, and coordinate delivery. We do not ourselves cook food, own venues, or operate event equipment. The partner named on your booking is the party performing the service.

We take responsibility for the platform, for the accuracy of what we present to you, and for coordinating resolution when something goes wrong. We are not the manufacturer or direct provider of the underlying service.

## 2. Requests, quotations and proposals

Submitting a requirement is free and creates no obligation on either side. A quotation from a partner is an offer that may be time-limited. A proposal we send you is binding on us and the named partners only once you accept it and pay any deposit stated in it.

Prices in a proposal are held until the stated validity date. After that date we may need to re-confirm availability and pricing with the partners.

## 3. Bookings

Accepting a proposal creates a booking between you and each named partner, coordinated and invoiced by us. The scope is what the proposal describes. Changes to headcount, timing, venue or menu after acceptance may change the price, and we will confirm any change in writing before it takes effect.

## 4. Payment

Unless separately agreed, payment is made to us and not directly to the partner. We hold and disburse funds to partners after delivery, according to our settlement process. Paying a partner directly outside the platform removes our ability to coordinate, hold funds or help resolve a dispute.

All prices are in Bangladeshi Taka (BDT). Where tax applies it is shown separately on your invoice.

## 5. Cancellation and refunds

Cancellation terms are set out in the proposal you accept and in our Cancellation & Refund Policy. Different partners and service types can carry different terms; the terms that apply to you are the ones shown before you accept.

## 6. Your responsibilities

You agree to give accurate information about your event, provide reasonable access to the venue, confirm final headcount by the agreed deadline, and treat partner staff respectfully. Inaccurate information is the most common cause of an event going wrong, and may affect what we can put right.

## 7. Communication on the platform

We may mask direct contact details in conversations between customers and partners until a booking is confirmed. This keeps commitments documented and lets us help if there is a disagreement. It is not intended to obstruct legitimate communication.

## 8. Reviews

Only customers with a completed booking may review the partner who delivered it. We may remove reviews that are abusive, defamatory, or not about the service delivered.

## 9. Liability

Nothing in these terms excludes liability that cannot lawfully be excluded. Subject to that, our liability in connection with a booking is limited to the platform fees we charged you for that booking, and we are not liable for indirect or consequential loss.

Our responsibility for the performance of a partner is to coordinate, mediate and apply the remedies described in our policies — not to guarantee the partner's performance.

## 10. Suspension

We may suspend or close an account that submits fraudulent requests, abuses partners or staff, attempts to circumvent platform payment, or breaches these terms.

## 11. Changes

We may update these terms. Material changes will be notified to registered users, and the version in force when you accept a proposal is the version that governs that booking.

## 12. Governing law

These terms are governed by the laws of ${brand.country}, and the courts of ${brand.launchCity} have jurisdiction.

## 13. Contact

${brand.legalName}, ${brand.address.line1}, ${brand.address.city}. Email ${brand.supportEmail}, phone ${brand.supportPhoneDisplay}.
`;

const PRIVACY = `
This policy explains what personal data ${brand.legalName} collects through ${brand.name}, why we collect it, and what you can ask us to do with it.

## 1. What we collect

- **Account data**: your name, email address, phone number and, for company accounts, your organisation and role.
- **Event data**: the requirements you submit — date, guest count, venue, budget, dietary notes and any other detail you give us.
- **Transaction data**: bookings, invoices, payments and payouts. We store gateway transaction references; we do not store full card numbers.
- **Communication**: messages sent through the platform, and emails we send you. We retain the original text of messages for dispute resolution.
- **Technical data**: IP address, browser type and pages visited, used for security, abuse prevention and product analytics.
- **Partner data**: for partners, business registration and verification documents.

## 2. Why we use it

To operate the service: match you with partners, produce quotations and proposals, take payment, coordinate delivery and settle partners. To keep the platform safe: verify partners, detect abuse and prevent fraud. To communicate with you about your events. To improve the product, using aggregated analytics.

We do not sell personal data.

## 3. Who we share it with

- **Partners**, but only what they need to quote and deliver: the event requirement, and — once a booking is confirmed — the details needed to deliver it. We mask direct contact details until that point.
- **Service providers** who operate parts of our infrastructure: hosting, database, email delivery and payment processing. They act on our instructions.
- **Authorities**, where we are legally required to.

## 4. Verification documents

Partner verification documents are stored in private storage and are accessible only to the partner who uploaded them and to staff performing verification. They are never shown publicly.

## 5. Retention

We keep transaction and financial records for as long as required for tax and accounting purposes. Other personal data is kept while your account is active and for a reasonable period afterwards. Message history related to a booking is retained for dispute resolution.

## 6. Your choices

You can update your profile, change notification preferences, and request a copy or deletion of your data by writing to ${brand.supportEmail}. Deletion requests are honoured except where we must retain records for legal or accounting reasons.

## 7. Security

We use encryption in transit, database-level access controls, and strict separation between what different accounts can read. No system is perfectly secure; please use a strong, unique password and tell us immediately if you suspect unauthorised access.

## 8. Contact

Write to ${brand.supportEmail} or ${brand.legalName}, ${brand.address.line1}, ${brand.address.city}.
`;

const REFUNDS = `
This policy explains how cancellations and refunds work. The specific terms for your booking are shown in the proposal before you accept it, and those terms take precedence over the general position described here.

## 1. Before you accept a proposal

Nothing is committed and nothing is charged. You can decline a proposal or ask for changes at no cost.

## 2. After you accept

Accepting a proposal confirms your booking with each named partner. Partners begin committing cost — ingredients, staff rosters, sub-hire and deposits — from that point, which is why cancellation terms tighten as the event approaches.

## 3. Cancellation tiers

Every booking carries a cancellation policy with refund tiers based on how far ahead you cancel. Our standard policy is:

- Cancel 7 or more days before the event: full refund
- Cancel 3 to 7 days before: 75% refund
- Cancel 1 to 3 days before: 50% refund, deposit retained
- Cancel within 24 hours: no refund

Some partners and larger productions use stricter or more flexible terms. The tiers that apply to you are displayed in your proposal and on your booking.

## 4. Changes rather than cancellation

Reducing headcount, moving a date or changing a menu is often possible and usually cheaper than cancelling. Contact your event manager as early as you can; we will confirm any price change in writing before applying it.

## 5. If we or a partner cancel

If a partner cannot deliver, we will source a replacement of equivalent standard at no additional cost to you where we reasonably can. If we cannot, you receive a full refund of amounts paid for the affected service.

## 6. If something goes wrong on the day

Tell your event manager immediately, and raise a support ticket so it is recorded. We investigate with both sides, and remedies may include a partial refund, a credit, or a deduction from the partner's settlement. We aim to reach a decision within five working days.

## 7. How refunds are paid

Refunds are returned to the original payment method where possible. Card and mobile financial service refunds typically take 5 to 10 working days to appear, depending on your bank. Bank transfer refunds are made to the account the payment came from.

## 8. Disputes

If you disagree with a decision, reply on the ticket and ask for escalation. A second reviewer who was not involved in the original decision will look at it again.

## 9. Contact

${brand.supportEmail} · ${brand.supportPhoneDisplay}
`;

const PARTNER_AGREEMENT = `
This agreement applies to service partners listed on ${brand.name}, operated by ${brand.legalName}.

## 1. Relationship

You are an independent business. Nothing here creates employment, agency, partnership or exclusivity. You decide which briefs to quote on and what to charge.

## 2. Verification

Before you can quote, we verify your business registration, operating capacity and references. You agree to give accurate information and to tell us promptly if your licence, capacity or ownership changes. We may suspend a listing pending re-verification.

## 3. Quotations

Quotations you submit are offers to the customer, presented through us. A submitted quotation is binding on you until its validity date, unless you withdraw it in writing before the customer accepts. Every version of a quotation is retained.

## 4. Bookings and delivery

When a customer accepts a proposal that includes your quotation, a booking is created. You agree to deliver the agreed scope, on time, to the standard represented in your profile and quotation, and to keep your booking status up to date in the dashboard.

If you cannot deliver a confirmed booking, tell us immediately. Repeated late cancellation is grounds for suspension.

## 5. Commission and pricing

We charge a commission on the value of completed bookings. Your rate is agreed with you in writing and is visible in your dashboard. Any platform fee charged to the customer is separate from your price and does not reduce your amount beyond the agreed commission.

You will always see the exact amount you will receive before submitting a quotation.

## 6. Payment and settlement

The platform collects payment from the customer. After the event is delivered and confirmed, we approve your payout and settle it to your registered bank or mobile financial service account, with a statement showing gross, commission, any adjustments and the net amount.

Adjustments may be applied where a documented service failure is attributed to you, following the dispute process and with notice to you.

## 7. Working through the platform

For customers introduced to you through the platform, you agree to transact through the platform for that event. This is how funds are protected and commitments documented. It does not restrict your business with customers you already had, or with customers you find independently.

## 8. Conduct and standards

You agree to maintain food safety and hygiene standards applicable to your business, hold the licences your operation requires, treat customers and our staff respectfully, and not misrepresent your capacity or past work.

## 9. Reviews

Customers with completed bookings may review you. You have a public right of reply. We remove reviews that are abusive or not about the delivered service, but we do not remove a review for being negative.

## 10. Suspension and termination

Either side may end this agreement with notice. Confirmed bookings must still be delivered. We may suspend immediately for safety issues, fraud, or serious misrepresentation.

## 11. Liability

You are responsible for the service you deliver. You agree to indemnify us against claims arising from your delivery, to the extent caused by you.

## 12. Governing law

Governed by the laws of ${brand.country}; the courts of ${brand.launchCity} have jurisdiction.

## 13. Contact

${brand.salesEmail} · ${brand.supportPhoneDisplay}
`;

const FALLBACKS: Record<LegalSlug, string> = {
  terms: TERMS,
  privacy: PRIVACY,
  'refund-policy': REFUNDS,
  'partner-agreement': PARTNER_AGREEMENT,
};

export function legalFallback(slug: string): string {
  return (FALLBACKS[slug as LegalSlug] ?? '').trim();
}
