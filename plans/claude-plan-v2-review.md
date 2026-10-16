# Review of Claude's merged PLAN.md v2

October 15, 2026. **Recommendation: execute `PLAN.md` v2 after the corrections below.** Keep one execution plan. This review does not replace or edit it.

Reviewed baseline SHA-256: `41019f34c58f56bd89cd13e87a408eabb62f1f1f067d81c20f47335151954a54`. Line references below refer to that version. No Git commit exists. If `PLAN.md` changes, reconcile the findings before applying them.

## Verdict

Both proposals describe the same product: help service founders maintain warm relationships through a short daily queue. Claude's local SQLite build and Gmail compose handoff are the better implementation choices for today's hackathon. The merged plan correctly adopts explicit send confirmation, saved daily selections, local dates, evidence-grounded drafts, and honest empty states.

My earlier Supabase-first plan and multiple testing layers added unnecessary choices for a localhost prototype. One assert script can cover the important rules if it exercises the real selection and database paths. Exact-content approval records become necessary when Engine itself gains a sending API; for today, the owner's final review and Send action happen in their mail app.

Agreement between the plans demonstrates alignment with the same charter. It is not independent evidence of customer demand. Josh's repeated use during delivery weeks remains the first product test.

## Four corrections before implementation

All four findings are HIGH-confidence specification gaps, not defects in an existing application. No application has been built. Effort estimates are incremental planning/implementation work, not measured timings.

| Priority | Gap and evidence | Required correction | Effort / change risk |
| --- | --- | --- | --- |
| P1 | Ranking needs dates the schema cannot represent. `PLAN.md:62` has the relationship date; `PLAN.md:99` claims a quote-sent date. The call establishing a relationship and the later proposal are different events. The new-inbound exception also needs current incoming activity. | Add `quote_sent_at`, `last_inbound_at`, and `last_outbound_at` (nullable dated facts, maintained by import/manual activity and send confirmation). Do not substitute `signal_at` for a quote date. | Small / low |
| P1 | A completed overdue next step can keep overriding the seven-day spacing rule. `PLAN.md:93` permits the override; the send update at `PLAN.md:88` only changes the touch. | Confirming the touch completes its captured next step in the same transaction, or asks for a replacement. Clear only the step/date that generated that touch, never a newer step entered since. | Small / medium |
| P1 | Unique contact/day rows do not fully define a saved daily selection. `PLAN.md:82`, `PLAN.md:106`, and `PLAN.md:159` leave empty-day creation, simultaneous loads, and toggling after completion ambiguous. | Persist a day record even when no contacts qualify, create the day's selection atomically, and define the remaining-card rule below. | Small / medium |
| P1 | Schema provenance constraints do not replace current eligibility checks. `PLAN.md:86` calls the queue clean by construction; `PLAN.md:196` defers all database eligibility triggers. A queued person can subsequently be suppressed or snoozed. | Keep source/evidence/date constraints and foreign keys. Use one server-side eligibility function at queue creation and before presenting or opening a pending draft. Full database triggers are optional for this local build; the eligibility boundary is required today. | Small / low |

### Exact behavior to put in the plan

**Dates and evidence:** store normalized UTC timestamps; reject empty or invalid dates. Two-way provenance requires a valid exchange date, not merely a non-NULL string. Imported history must keep its original dates; importing a file is not a new conversation. For quoting, use `quote_sent_at` only when supplied, otherwise ask for it or rely on a dated next step. A quote follow-up becomes due seven days after the later of the recorded quote date or last recorded outgoing touch. A newer incoming message takes precedence. Suppression and snooze always win; `lost` is excluded until deliberately reactivated.

**Next steps:** a due touch captures the specific next-step text and date. On the first successful “I sent it” confirmation, record the outbound date and consume that captured step if it is still current. Retried confirmation is a no-op. Tomorrow's selection must not repeatedly surface the same completed promise.

**Daily selection:** a small `daily_runs` table with a unique local day is sufficient. Within one transaction, record that the day was built and reserve up to three eligible contacts. Display up to `max(0, daily_target - handled_today)` pending cards, where handled means sent or skipped. Busy week sets the total target to one, not one extra after each completion. Hidden cards stay saved; explicitly switching back to normal can reveal the remaining reserved cards. Reloading or skipping never silently adds replacements. Revalidate pending cards without replacing newly ineligible ones. A newly imported person can wait until tomorrow for v0; an explicit rebuild action can be added later if needed.

**Server boundary:** call the same eligibility function for new selections and saved-card handoffs. Tests must prove that suppressing or snoozing a person after queue creation prevents another handoff. Retain historical sent records. Logging a real past send is reporting an event, not permission to contact someone again.

## Small corrections that improve the demo

1. **Keep one reliable floor metric; defer the extra “Live conversations” line.** `PLAN.md:128` still counts an open quote indefinitely. `PLAN.md:139` also treats a booking as a two-way exchange; a self-service booking does not establish that both sides spoke. Record booked as its own outcome. Record a two-way exchange only when the owner confirms an actual exchange and its date. A later conversation measure should exclude lost/stale items and identify actual sales conversations. Today's confirmed-touch floor already supplies the demo's meter.

2. **Use a consistent time window.** `PLAN.md:29` says trailing seven days while `PLAN.md:127` says “this week.” Label it “Follow-ups completed in the past 7 days: 2 of 5,” counting today and the preceding six owner-local dates. Mark it as owner-reported. Five is a trial target, not a validated sales benchmark. One per weekday explains the choice, but the counter is not a calendar-week reset.

3. **Add the missing sender field.** `PLAN.md:138` uses `{owner_email}`, which is absent from the profile schema. Add the business email to setup. Treat `authuser` as a convenience hint, not a verified sending identity. The owner checks the sending account and recipient in Gmail. Encode recipient, subject, and body, test punctuation/line breaks/Unicode, and keep Copy available. A Gmail window opening is neither a delivery receipt nor proof of its final content.

4. **Make the import evidence accurate per person.** A shared event/date can legitimately apply to a whole file. Offer shared defaults with row overrides; do not silently assign one client's call or one person's introduction to unrelated rows. Preserve existing evidence, suppression, and activity dates on re-import; simplest v0 behavior is to flag duplicates and let the owner resolve them. A ten-character field is an attestation, not proof.

5. **Let “Not now” accept a date.** Thirty days is a useful default, but an explicit request to return in three months should not be shortened. A native date input is enough. Set the contact-level suppression date, not only a touch outcome.

6. **Use one appropriate next step in the prompt.** A mandatory yes/no question is awkward for an inbound answer or referral thank-you. Allow a brief question when appropriate; don't force one. Treat a voice sample as untrusted example text too, and preserve the prohibition on invented facts.

7. **Protect source material while scaffolding.** `create-next-app --yes` may conflict with the nonempty folder and its existing `AGENTS.md`. Scaffold without overwriting the charter, RTFs, or plans. Ignore the local DB and SQLite `-wal`/`-shm` sidecars, local imports, and secret env files; retain an `.env.example` containing names only. Use synthetic fixtures in tests. Localhost binding remains required.

## Business-model findings: useful, but conditional

The Gmail permission issue is real. Google lists mailbox reading as restricted and sending as sensitive. For non-exempt apps, restricted data handled through servers can entail verification and an annual assessment. That is a reason to delay broad inbox integration, not proof that a hosted business cannot work. [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [restricted-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)

The internal-app exception requires an organization-owned Cloud project configured for internal use and restricted to that Workspace or Cloud Identity organization's users; administrator approval may be needed. Self-hosting by itself does not create this exception, and a personal Gmail customer does not automatically qualify. Google says its user-data policy still applies to unverified apps. The implementation's actual data flow matters. [Google's verification exceptions](https://support.google.com/cloud/answer/13464323?hl=en)

Therefore, **open-source core → paid setup/operation pilots → optional hosted service** is a reasonable commercial hypothesis. Test whether owners value the daily result enough to pay, and whether setup/support effort leaves a viable service. Avoid making OAuth configuration the main customer promise. A CSV-based hosted version remains possible; Gmail integration strategy can follow observed demand.

Separate future read and send decisions. Trouble handing messages to Gmail suggests a compose/send improvement; it does not automatically justify reading the whole mailbox (`PLAN.md:177`). Missing or stale relationship context is the signal to investigate ingestion.

## Checks to add to the existing single check script

Keep `node scripts/check.ts`; no extra test framework is necessary. Run it against disposable in-memory SQLite and the actual shared rule functions. It should establish:

- Missing evidence/source, empty or invalid required dates, and orphaned touches are rejected.
- Importing an old relationship today does not make it a recent conversation; a quote uses its recorded quote date.
- A due next step permits the intended spacing exception; confirming it prevents a repeat tomorrow.
- Suppression and future snooze block both selection and an already-saved pending handoff.
- Repeated and concurrent daily initialization preserve one selection, including an empty selection.
- With one card already handled, Busy week leaves zero remaining; normal mode exposes only remaining reserved cards.
- Opening/copying changes no send count; repeated confirmation counts once and preserves the first send timestamp.
- Seven-day counting and daily rollover work at the Hawaii date boundary using a fixed clock.
- Booking alone does not change `last_two_way_at`; actual exchange logging uses the event date rather than blindly setting it to now.

Also run explicit typecheck, lint, and production build. A successful native `.ts` run is not a typecheck. Retain manual browser checks for the SQLite bundling spike, Gmail handoff, reload persistence, and the three-card session. If the time budget breaks, cut the live-conversation line, onboarding polish, and live AI generation before cutting eligibility or honest send accounting.

## Verification performed for this review

- Read the complete merged plan and inventoried the folder. The substantive Claude output available is `PLAN.md`; there is still no app to test. Both task boards contain placeholders.
- Executed the embedded v2 SQL in an in-memory SQLite database with foreign keys enabled. Missing two-way dates are now rejected (fixed since v1), but empty and invalid date strings are accepted. This supports the date-validation correction above.
- Confirmed local Node v26.0.0 can load `node:sqlite`, and its connection reported foreign keys enabled. Next.js bundling remains untested, as Claude correctly states. [Node SQLite documentation](https://nodejs.org/api/sqlite.html)
- Verified that `claude-sonnet-5-5` is listed in the current official model documentation; it is not an invented model ID. Keeping it configurable is still appropriate. [Anthropic model documentation](https://platform.claude.com/docs/en/models/overview)
- CHASE workflows and the wiki are not present among the reviewed files, so their implementation and reusable prompts were not verified here. Treat them as future references, not dependencies for today's build. A sender/date inbox search alone cannot establish that a particular sales message received a reply; eventual detection must correlate the relevant conversation and timestamps.

Other overstatements to avoid: audience definition and truthful templates are not inherently cold outreach or fake personalization; a pipeline board and short qualification questions are scope choices, not automatic pillar violations. Also, SQLite migration to Postgres is not literally “the same SQL”: types/defaults, ID generation, database access, and auth policies will need translation. Neither correction adds work today.

## Handoff to Claude

Use PLAN.md v2 as the sole execution plan. Apply the four P1 corrections in this review, remove the misleading Live conversations line for v0, and include the small import/date/compose clarifications. Keep the local SQLite build, Gmail handoff with Copy fallback, single assert script, and confirmed-touch floor. Do not restore Supabase, a large testing stack, or an API-send approval state machine for this demo. Preserve the existing source documents. Mark reduced-scope work as a partial demo, and report actual verification results when implemented.
