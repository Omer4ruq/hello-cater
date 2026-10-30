# Operations runbook

**Audience:** the operations, finance and support team running the platform day to day.

---

## Daily rhythm

**Morning (first 30 minutes)**

1. **Admin → Requests**, filter *Unassigned*. Every overnight request should be triaged before lunch.
2. **Admin → Requests**, filter *Quotes received*. Anything with enough quotes is ready for a proposal.
3. **Admin → Events**, sort by date. Anything in the next 72 hours gets a confirmation call.
4. **Admin → Verification**. Partner applications waiting on review.

**Through the day**

- Respond to messages within two hours during office hours.
- Chase partners who have not responded as their deadline approaches.
- Send proposals the same day the last quote lands.

**Weekly**

- **Admin → Payouts** — run a payout batch for delivered events.
- **Admin → Reports** — check quote rate and win rate; a falling quote rate usually means the shortlist is wrong.
- Review declined requests for a pattern.

---

## Triaging a request

Open it from **Admin → Requests**.

**1. Is it real and complete?** Check the date is plausible, the guest count matches the venue, and the budget is not wildly off. If something is missing, message the customer before shortlisting — a vague brief produces vague quotes.

**2. Set the status.** Move it to *Under review* so the team knows it is being worked.

**3. Run matching.** **Partners** tab → **Recompute**. The engine scores every verified partner and shows why each one qualified or did not.

**4. Read the disqualifications.** If everyone is disqualified, the reason tells you what to fix — usually the date, the budget or missing supply in that category.

**5. Shortlist.** Three to five per service line is right. Fewer and the customer has nothing to compare; more and you burn partner goodwill on quotes that cannot win.

Consider: does the partner actually cover this area? Are they free that day? Is the budget realistic for them? Have they delivered this event type before? Is their response rate good?

**6. Add context.** The note goes to partners and is where you put what the brief does not carry: service style, a hard constraint, what the customer cares most about.

**7. Set a deadline.** 48 hours is the default. 24 for urgent, 72 for large multi-vendor events.

---

## Building a proposal

Once quotes are in: **Proposal** tab.

**1. Compare.** Quotes appear side by side with totals and per-head figures. Look past the headline: check inclusions, staff numbers and what is optional.

**2. Negotiate if needed.** Message the partner. If they revise, it becomes a new version and the history is kept.

**3. Select the winners.** One per service line. Cheapest is not automatic — reliability and fit usually matter more.

**4. Set the fees.** The service fee prefills from the pricing rule. Add a coordination fee for multi-vendor events; that is real work and should be charged for.

**5. Write the summary.** This is not optional. Three or four sentences: why this combination, what you checked, what happens next. It is a large part of what the platform fee buys.

**6. Set validity.** Two to three weeks is usual. Partners committed to a price; do not let it run stale.

**7. Save & send.** The customer is emailed and it appears in their dashboard.

**Follow up.** No response after three days: call. Most silence is a question they have not asked.

---

## When a customer requests changes

The proposal reopens. Common cases:

| They want | Do this |
|---|---|
| A lower price | Ask partners for a reduced-scope option rather than a discount. Protects partner margin. |
| Different menu | Message the partner; they revise, producing a new version. |
| Fewer or more guests | Confirm the new count, get revised quotes — per-head pricing often has thresholds. |
| A different date | Re-check availability with **every** partner, not just the caterer. |
| A different partner | Return to the shortlist. The other quotes are still on the request. |

Always send a revised proposal rather than editing the old one. The history is what protects both sides.

---

## Verifying a partner

**Admin → Verification** → open the application.

**Check:**

- [ ] Trade licence — current, matching the business name
- [ ] Owner NID — matches the licence holder
- [ ] Food licence — **required** for caterers and kitchens
- [ ] TIN — needed for settlement
- [ ] Bank account proof — name matches the business
- [ ] Capacity claim — call two references and ask what they actually delivered
- [ ] Service areas — plausible for where they are based

**Decide:**

- **Approve** — verified. Tick *Publish* to list them publicly, or leave it off to verify privately first and let them start quoting before their listing is ready.
- **Under review** — waiting on something. Say what in the notes.
- **Reject** — the reason **is sent to them**. Be specific and actionable.
- **Suspend** — stops new requests immediately. Use for safety issues, fraud or serious misrepresentation.

Every decision is recorded with your name and is not editable afterwards.

> Partners cannot approve themselves. The database blocks it. If someone appears verified without a decision in their history, escalate — that would be a serious defect.

---

## Running a payout

**Admin → Payouts**. The top panel groups every delivered, unsettled booking by partner.

1. **Expand a partner.** Review each booking — date, event, gross, commission, net.
2. **Deselect anything disputed.** Do not pay out on a booking with an open complaint.
3. **Add an adjustment if needed.** Negative for an agreed penalty, positive for a bonus. **Always write the reason** — the partner sees it on their statement and will ask.
4. **Create payout.** This locks those bookings; they can never enter a second payout.
5. **Approve.** Separate from creating, so two people can be involved.
6. **Transfer the money** through your bank or MFS.
7. **Mark paid** with the method and the bank reference. Required — it is what reconciliation needs later.

Settlement posts to the ledger and cannot be reversed. Check before you confirm.

---

## Handling a complaint

1. **Acknowledge within two hours.** Even without an answer yet.
2. **Get the facts from both sides** on the platform, in writing.
3. **Check the record** — what did the accepted proposal actually promise?
4. **Decide the remedy:**

| Situation | Typical remedy |
|---|---|
| Partner did not deliver | Full refund of that line; deduct from partner settlement |
| Late or short delivery | Partial refund proportional to the shortfall |
| Quality below what was quoted | Partial refund or credit, depending on severity |
| Customer changed the brief late | Usually no refund; explain against the proposal |
| Genuinely ambiguous | Split it. Goodwill is cheaper than the argument. |

5. **Record it** on the dispute with the resolution kind and settlement amount.
6. **Apply it** — refund through **Admin → Payments**, deduction as a payout adjustment.
7. **Close the loop** with both parties in writing.

Target: a decision within five working days.

---

## Event day

For anything above ~200 guests or with three or more vendors:

**T-7 days** — confirm final headcount; confirm each vendor in writing; share the run sheet.
**T-2 days** — confirm delivery windows and venue access; check the balance is paid.
**T-1 day** — call every vendor; confirm the on-site contact; check the weather for outdoor events.
**On the day** — be reachable; check in when setup starts; confirm delivery; note anything that went wrong while it is fresh.
**T+1 day** — thank the customer; trigger the review request; log any issue against the booking.

---

## Escalation

| Situation | Who | When |
|---|---|---|
| Partner cancels within 48 hours of an event | Operations lead | Immediately |
| Payment dispute over ৳50,000 | Finance lead | Same day |
| Food safety incident | Everyone, plus the partner's suspension | Immediately |
| Data or access concern | Technical lead | Immediately |
| Legal threat | Do not reply. Escalate. | Immediately |

---

## Numbers to watch

Find them in **Admin → Reports**.

| Metric | Healthy | Meaning |
|---|---|---|
| Quote rate | > 70% | Requests reaching at least one quote. Low means bad shortlisting or thin supply. |
| Win rate | > 30% | Requests becoming events. Low means pricing or proposal quality. |
| Time to first quote | < 24h | Partner responsiveness. |
| Time to proposal | < 48h | Your own responsiveness. |
| Partner response rate | > 85% | Per partner. Falling means they are disengaging. |
| Cancellation rate | < 5% | Rising means expectations are being set wrong. |
| Average rating | > 4.5 | Below 4.0 for a partner warrants a conversation. |

---

## Things that should never happen

If you see any of these, it is a defect — report it, do not work around it:

- A partner appearing verified with no verification event in their history
- A booking in two payouts
- A ledger group where debits ≠ credits
- A customer seeing another customer's request, event or payment
- An internal note visible to a customer or partner
- A payment marked paid without a gateway reference or a manual record
- A submitted quote version changing after the fact

Each of these is blocked by a database constraint, and each has a test. If one occurs, something has been bypassed.
