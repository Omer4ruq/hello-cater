/**
 * Resilience fallbacks for the public marketing site.
 *
 * These mirror the rows inserted by supabase/seed.sql. They exist so the
 * homepage still renders — and `next build` still succeeds — when the
 * database is unreachable or Supabase credentials are not yet configured.
 * Live data always wins; this is the floor, not the source of truth.
 */
export const FALLBACK_HOME_SECTIONS = {
  hero: {
    heading: 'Plan your event. We handle the rest.',
    subheading:
      'Find trusted caterers and event professionals, compare proposals, book services and manage your entire event in one place.',
    cta_label: 'Plan an Event',
    cta_href: '/plan',
  },
  trust: [
    { value: 'Verified', label: 'Every partner checked before they quote' },
    { value: '1 request', label: 'Multiple comparable proposals' },
    { value: '1 invoice', label: 'Even when five vendors are involved' },
    { value: 'Dhaka', label: 'Live now, expanding across Bangladesh' },
  ],
  how_it_works: [
    { title: 'Tell us what you need', body: 'Share your date, guest count, location and budget. It takes about two minutes and commits you to nothing.' },
    { title: 'We shortlist partners', body: 'Our team matches your requirement against verified partners who actually cover your area, date and capacity.' },
    { title: 'Compare real quotations', body: 'Partners quote against your brief. You see menus, inclusions and totals side by side.' },
    { title: 'Accept one proposal', body: 'For multi-vendor events we combine everything into a single proposal with a single total.' },
    { title: 'We coordinate the day', body: 'Your event manager tracks every vendor, payment and deliverable until it is done.' },
  ],
  why_us: [
    { title: 'Verified partners only', body: 'Trade licence, capacity and references are checked before a partner can quote.' },
    { title: 'One point of contact', body: 'Five vendors, one coordinator, one invoice, one thread.' },
    { title: 'Written quotations', body: 'No verbal estimates that change on the day. Every line item is documented.' },
    { title: 'Corporate ready', body: 'Company accounts, approval limits, departmental billing and VAT-ready invoices.' },
    { title: 'Money held safely', body: 'Payments are collected by the platform and released to partners after delivery.' },
    { title: 'Recurring catering', body: 'Set up a weekly office lunch once and let it run.' },
  ],
} as const;

export const FALLBACK_FAQS = [
  { id: 'f1', question: 'Does it cost anything to submit a request?', answer: 'No. Submitting a requirement is free and non-binding. You only commit when you accept a proposal.', topic: 'pricing', audience: 'customer' },
  { id: 'f2', question: 'How quickly will I receive quotations?', answer: 'Most requests receive their first quotations within 24–48 hours. Large multi-vendor events can take a little longer because we coordinate several partners.', topic: 'process', audience: 'customer' },
  { id: 'f3', question: 'How do you verify partners?', answer: 'We check business registration and trade licence, confirm kitchen or operating capacity, review past work and collect client references. Partners who fail verification cannot quote.', topic: 'trust', audience: 'customer' },
  { id: 'f4', question: 'What payment methods do you accept?', answer: 'Card, mobile financial services and bank transfer through our payment gateway. Corporate accounts can also be invoiced on agreed terms.', topic: 'payments', audience: 'customer' },
  { id: 'f5', question: 'Do you cover areas outside Dhaka?', answer: 'We are live in Dhaka today. Other districts are opening progressively — tell us your location and we will confirm whether we can cover it.', topic: 'coverage', audience: 'customer' },
];

export const FALLBACK_TESTIMONIALS = [
  { id: 't1', author_name: 'Nusrat Jahan', author_title: 'Head of Administration', company: 'A national FMCG distributor', quote: 'We used to call four caterers for every town hall. Now one brief goes out and we get comparable written quotations the same week.', rating: 5, event_type: 'Corporate', avatar_url: null },
  { id: 't2', author_name: 'Tanvir Ahmed', author_title: 'Operations Manager', company: 'A Gulshan-based software firm', quote: 'Weekly office lunch for 60 people used to be a recurring headache. It now runs on a standing arrangement and a single monthly invoice.', rating: 5, event_type: 'Corporate', avatar_url: null },
  { id: 't3', author_name: 'Farhana & Rezaul', author_title: '', company: 'Wedding in Uttara', quote: 'Catering, decoration and photography came back as one proposal with one total. Having a single coordinator on the day was worth it by itself.', rating: 5, event_type: 'Wedding', avatar_url: null },
];
