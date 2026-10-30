# Business flow

**Audience:** anyone who needs to understand what the product does — operations staff, a new developer, an investor, or you six months from now.

---

## The proposition

Arranging an event in Dhaka normally means calling five caterers, chasing quotes on WhatsApp, and hoping the price holds. Evently BD replaces that with one requirement, comparable written quotations, one proposal and one invoice.

Not *"here are some vendors, good luck"*. Closer to *"tell us what you need and we will organise it"*.

---

## The end-to-end flow

```
1  Requirement      Customer submits a brief                     free, non-binding
2  Triage           Operations reviews it
3  Matching         Engine ranks verified partners               explainable, rule-based
4  Shortlist        Operations chooses who to invite             a human decides
5  Invitation       Partners receive the brief
6  Response         Partner accepts or declines
7  Quotation        Partner builds an itemised quote             versioned, immutable once sent
8  Review           Operations compares and negotiates
9  Proposal         Several quotes → one customer document       one total
10 Decision         Customer accepts, asks for changes, declines
11 Booking          Event + one booking per partner              single transaction
12 Payment          Deposit collected by the platform
13 Coordination     Tasks, timeline, vendor communication
14 Delivery         Partners mark fulfilment progress
15 Completion       Event delivered
16 Review           Customer reviews; partner may reply
17 Settlement       Finance approves and pays partners
```

---

## 1–2 · Requirement and triage

A ten-step wizard captures event type, date, guest count, location, services needed, cuisine, budget, requirements and contact details. It saves a draft to session storage, so a phone call mid-way does not cost the customer their answers.

**No account is required to start.** Requiring a sign-up before a non-binding enquiry would cost most of the demand. On submission, if the email is new, an account is created so the customer has somewhere to track proposals.

The request is explicitly non-binding. Nothing is committed until a proposal is accepted.

Operations sees it immediately in **Admin → Requests**, with unassigned items flagged.

---

## 3–4 · Matching and shortlisting

The engine scores every verified partner against the brief.

**Hard gates** remove a partner outright: unverified, not accepting orders, wrong category, outside the service area, date blocked, already at capacity, insufficient lead time, guest count outside their range.

**Weighted signals** score the rest: location precision, service coverage, capacity fit, budget fit, day availability, cuisine, event type, rating, response reliability, experience.

Output is a 0–100 score with a breakdown and plain-language reasons. Disqualified partners stay on the list **with their reason**, so an operator can see the whole consideration set and override the engine when they know something it does not.

> This is rule-based, not machine learning, and the product never claims otherwise. Weights are configurable. The interface is shaped so a model could re-rank the same candidates later without changing anything else.

Operations selects partners, optionally adds context the brief does not carry, sets a response deadline and sends invitations. **Auto-invite is off by default** — at this stage a curated shortlist is more reliable than a broadcast, and it protects partner goodwill.

---

## 5–7 · Partner response and quotation

Invited partners see the full brief in their dashboard: date, headcount, venue, budget, dietary notes, requirements. Customer contact details are held by the platform.

Accept unlocks the quote builder. Declining is one click and costs nothing, though response rate feeds back into matching.

The quote builder produces an itemised document: food, beverage, delivery, setup, service staff, equipment, decoration, venue, transport, rental. Any line can be marked an optional add-on, excluded from the total. Partners can import a saved menu in one click, set a discount, tax, payment terms, cancellation policy and validity date.

**Versioning is the point.** Submitting freezes the version. A change creates version 2, with a summary of what changed. Nobody can later argue about what was agreed — the database rejects edits to a submitted version.

The partner always sees exactly what they will receive after commission, before submitting.

---

## 8–9 · The master proposal

This is the differentiator.

A wedding might need catering, decoration, photography, sound and a venue. Arranged alone that is five negotiations, five contracts and five invoices.

Operations selects the winning quote per line and combines them into **one proposal with one total**:

```
Catering ................. ৳242,400
Decoration ............... ৳107,000
Photography ..............  ৳45,000
Platform service fee .....  ৳12,000
Event coordination .......  ৳15,000
Delivery & setup .........   ৳3,000
                          ──────────
Total .................... ৳424,400
Deposit (50%) ............ ৳212,200
```

Each line carries a **commission snapshot** taken at build time, so changing a rate next month never rewrites an accepted proposal.

Operations can also add platform-owned lines — coordination, staffing the platform provides — which carry no partner commission.

The proposal includes a summary from the event manager: why this combination, what was checked, what happens next. That human paragraph is much of what the platform fee buys.

---

## 10–11 · Acceptance

The customer sees the full breakdown, every partner's rating and inclusions, the deposit schedule and the cancellation terms. Three responses: **Accept**, **Request changes** (with a note, which reopens the proposal for revision), or **Decline** (with a reason, which feeds back into matching).

Accepting runs one database transaction that creates:

- **One event** — the customer's commercial agreement
- **One booking per partner line** — the fulfilment record, with frozen commercial terms
- Losing quotes closed out
- A customer↔platform message thread

All of it, or none of it. A customer with an accepted proposal and no bookings would be a support incident every single time.

---

## 12 · Payment

The deposit is collected by the platform. The amount is **always derived server-side** from the event's outstanding balance — never accepted from the browser.

A payment is marked paid only after a server-to-server verification call confirms the gateway captured that exact amount in BDT. Settlement then:

- Increases the event's paid total
- Moves bookings from `pending_payment` to `confirmed`
- Writes a balanced pair of ledger entries splitting the cash between partner payable and platform revenue
- Emails a receipt and alerts operations

Corporate customers can pay by bank transfer instead; finance records receipt in the admin, which runs the identical path.

Full detail in [PAYMENTS.md](./PAYMENTS.md).

---

## 13–15 · Coordination and delivery

The event workspace is where operations run the event:

- Vendors, each with their booking status
- A task checklist — some items internal, some visible to the customer
- Timeline of everything that happened, with per-audience visibility
- Documents, with the same visibility control
- Payments and outstanding balance
- Internal notes, which customers and partners can never read

Partners advance their own booking through delivery: **Confirmed → In preparation → Ready → On site → Delivered**. They cannot cancel or refund — those go through the platform so both sides have a record and the money is handled correctly.

Customers see a simplified view: their vendors, what is confirmed, what is outstanding, and anything the team needs from them.

---

## 16 · Reviews

Only a customer with a **completed booking** can review, and only the partner who delivered it. The database enforces this — it is not a UI check. That is what makes a rating here mean something.

Ratings cover overall, food and service quality, communication, punctuality and value. Partners have a public right of reply. Moderation removes abuse and off-topic content, never negativity.

---

## 17 · Settlement

Once delivered, a booking becomes payable.

**Admin → Payouts** groups every delivered, unsettled booking by partner. Finance reviews, optionally applies an adjustment with a documented reason, and creates a payout run — which locks those bookings so they can never be paid twice.

Approval and settlement are separate steps. Marking paid requires the method and a bank reference, because that is what reconciliation needs later. It posts to the ledger, notifies the partner and issues a statement showing gross, commission, adjustments and net.

---

## Revenue

Every number is configurable in `pricing_rules` — nothing is hardcoded.

| Stream | Default | Notes |
|---|---|---|
| Partner commission | 12% | Overridable per category, per partner, per organisation |
| Customer service fee | 3% | Clamped between ৳500 and ৳50,000 |
| Event coordination fee | ৳0 | Set per proposal for managed events |
| Delivery / setup | Pass-through | As quoted |
| Featured placement | — | Structure exists; not yet monetised |
| Subscriptions | — | Not built |

Worked example — a ৳210,000 catering booking at defaults:

```
Partner quotes                    ৳210,000
Platform service fee (3%)         +  ৳6,300
Customer pays                     ৳216,300

Commission from partner (12%)     − ৳25,200
Partner receives                  ৳184,800

Platform revenue                   ৳31,500
```

The books always balance: *customer total = partner payable + platform revenue*. A unit test asserts exactly that, and the ledger enforces it.

---

## Deliberately manual for now

These stay human until the volume justifies automating them, and the data model is already shaped to automate each one:

| Step | Why manual |
|---|---|
| Partner shortlisting | Judgement beats a score at low volume, and protects partner goodwill |
| Quote review | Catches mispricing before a customer sees it |
| Proposal assembly | The combination and the narrative are the product |
| Payout approval | A wrong payout is expensive and awkward to unwind |
| Dispute resolution | Needs judgement, not rules |

---

## Corporate accounts

Company accounts add:

- Multiple users with roles (owner, admin, manager, staff)
- Per-member spending limits and approval requirements
- Department and cost-centre tagging
- Consolidated, VAT-ready invoicing
- Company-wide visibility of every event

The architecture also supports a private company portal — approved partners, approved menus, approved price points — so an office manager ordering lunch for 25 picks from options procurement already signed off. The data model is in place; the dedicated UI is not yet built.
