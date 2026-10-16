# Plan 001: Deliver today's three useful follow-ups

> Executor: read this plan and `AGENTS.md` before implementation. Build the numbered slices in order and run their verification gates. This plan specifies a prototype; do not treat its estimates or proposed commands as results already achieved.

## Status and baseline

- Priority: P1; category: direction; effort: one focused hackathon session with prepared infrastructure, longer if setup is new.
- Risk: medium; the key risks are unsupported relationship claims, inaccurate drafts, and incorrectly recording a send.
- Dependencies: none. No application exists.
- Planned at: October 15, 2026. Commit: unavailable; this directory is not a Git repository.
- Working assumptions awaiting user preference: approximately 4–6 hours, Next.js/TypeScript, Supabase, Claude, MIT license proposal, web UI first.
- Existing verification commands: none. Node `v26.0.0` and npm `11.12.1` were observed, but framework compatibility and application dependencies have not been tested.

Before implementing, inspect the directory again. If application code has appeared, reconcile it with this plan instead of overwriting it. Check `shasum -a 256 AGENTS.md`; the reviewed hash is `828a39efcb6fb697dc940ea18d72274ccd4690fee33183c165f6356706fc8cc1`. If the charter changes, read the changes and revise affected decisions. There is no existing code style, database convention, or test exemplar to imitate.

Current evidence:

- `AGENTS.md:45`: “A contact with no provenance **cannot enter the send queue**.”
- `AGENTS.md:54`: “Nothing sends without an explicit human approval.”
- `AGENTS.md:105`: today's demo is three people with reasons, drafts, approval, and a floor meter.
- `AGENTS.md:109` and `AGENTS.md:113` explicitly allow CSV and clipboard fallbacks.
- `Sales Frameworks.rtf`, “Mandatory Next Step + Date + Owner Rule”: keep next actions explicit.
- `Frameworks and Skills to Build on_.rtf`: proposes audience discovery and engineering tools; neither requires a runtime agent platform.

## Goal and boundaries

Provenance: only recorded two-way exchanges, contact-initiated inquiries, event registration/attendance, consented introductions, client relationships, and explicit opt-ins qualify.

An owner imports a small set of known people, sees up to three appropriate follow-ups with evidence and drafts, approves/copies one, sends it themselves, and records the result. A busy-week toggle changes the daily target to one. A floor indicator tracks confirmed follow-ups.

Implement one owner and one business. Protect any hosted instance with authentication and owner-scoped data access. Default to CSV/manual input and clipboard output. This plan does not require live Gmail sending.

Out of scope: cold sourcing, enrichment, deliverability features, auto-send, bulk approval, billing, shared multi-customer SaaS, teams, CRM connectors, SMS, a pipeline board, ROI documents, VSL scaffolding, automatic calendar workload detection, and framework installation.

## Proposed files

These are new paths, not an existing architecture. Keep business rules in small server modules and components focused on presentation.

```text
src/app/                        # layout, styles, Today, setup, import, auth
src/app/actions.ts              # authenticated state-changing entry points
src/components/                 # person card, editor, floor, delivery toggle
src/lib/domain/                 # validation, eligibility, ranking, floor
src/lib/server/                 # storage, session, drafts, approvals
prompts/draft-touch.md          # visible drafting rules
supabase/migrations/           # hosted database schema and access policies
tests/unit/                    # rule behavior and time boundaries
tests/integration/             # database and approval constraints
tests/e2e/                     # one full owner journey
fixtures/                      # fictional contacts and draft responses only
scripts/                       # migration/test helpers where needed
```

Also in scope: `package.json`, npm lockfile, TypeScript/Next/ESLint/Vitest/Playwright configuration, `.gitignore`, `.env.example` with names only, `README.md`, and plan status updates. If SQLite is selected, use `db/migrations/` and a local storage module instead of Supabase files. Keep the original RTFs, `AGENTS.md`, and `.logic-loop/board.md` intact. No Git history exists to prescribe commit style; do not publish or push as part of building this plan.

## Architecture choices

Use Next.js App Router, TypeScript, and simple components. Select supported package versions when scaffolding and record them in the lockfile. Match the installed framework's documentation; do not overwrite the existing charter with generated instructions. Run lint separately from build. [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation)

Default persistence is Supabase Postgres with authentication for a preconfigured owner. Every state-changing server action derives the owner from the session, validates inputs, and checks record ownership. Enable row-level security; browser-accessible keys must not bypass it. Use owner-bound composite foreign keys for related records. [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)

If hosted database/auth setup is not available within the first 30 minutes, choose the local-only SQLite route and record that decision in README. Keep the same relational constraints and rule modules, bind the demo to localhost, and use one local owner. Implement only the selected storage path. Public hosting is excluded from the local route.

Claude calls happen on the server, with secrets in environment variables. Send only the business profile and necessary relationship context; omit the email address from the drafting request when it is unnecessary. Do not log message bodies, contact details, credentials, or prompt inputs to analytics/error services. For a provider outage, offer an empty manual editor; fictional fixture drafts are available only in explicitly labeled demo mode.

## Minimal data contracts

| Record | Required behavior / fields |
| --- | --- |
| Business profile | Owner ID, offer, best-fit customer description, desired outcome, preferred wording, promises to avoid, IANA timezone, delivery mode |
| Contact | ID, owner ID, name, normalized email, `signal_source`, nonblank `signal_evidence`, signal date, `last_two_way_at` where applicable, `last_touch_at`, do-not-contact flag, optional snooze date, optional paired next step and due date |
| Queue item / draft | ID, owner/contact IDs, owner-local day, reason code/text, evidence snapshot, subject/body, revision, status, approval revision/time, copied time, sent-confirmation time |
| Activity | Owner/contact/queue IDs, event type, timestamp, source (`owner_reported` for manual sends), optional outcome and next step |

Use a closed `signal_source` enum: `two_way_exchange`, `inbound_inquiry`, `event`, `referral`, `client`, `opt_in`. Database constraints require a permitted source, trimmed nonempty evidence, and a valid signal date. Two-way exchanges also require `last_two_way_at`. Referral evidence must describe the actual introduction or explicit permission to name-drop; owner attestation is visible as such, not presented as independent verification.

Invalid imports remain in preview with row errors and never become active contacts. Unknown extra source values are rejected. Dedupe by owner and normalized email; duplicate imports do not replace stronger evidence or reset recent-touch/suppression history. Owner-supplied facts can be wrong; neither an enum nor an LLM proves that a relationship exists.

Queue writes use a database eligibility check/trigger as well as application validation. Require same-owner contact linkage, current valid evidence, no suppression, no pending snooze, and one item per contact per local day. An approval action rechecks current eligibility and evidence version. Evidence changes invalidate pending approvals. Do-not-contact suppresses existing pending items too. This is a correctness boundary, not a disabled UI button.

Keep a single most relevant evidence record per contact for the demo. Multiple signals and full thread history can be a later migration. An active sales next step is always paired with a date; the owner is implicit. A relationship without an active opportunity need not have a next step.

## Selection rules

Compute eligibility before priority. Exclude do-not-contact, future snooze, already handled today, and contacts touched within the past seven days unless a new inbound message arrived after that touch or an explicit owner-set follow-up is due. The seven-day spacing is a relationship-care default, not a deliverability tactic. It is a proposed rule to validate with users.

Pick the first matching priority band per contact:

1. Explicit next step due today or overdue, including a proposal follow-up. Order by earliest due date.
2. Inbound inquiry from the last seven days with no later logged touch. Order oldest unanswered first.
3. Past client or prior two-way contact with last two-way date at least 60 days ago; if a client lacks that date, use its dated client evidence and say so in the reason. Order longest quiet first.

Break remaining ties by stable contact ID. Do not use LLM scoring. Store the reason code, factual dates, and the evidence snapshot behind each recommendation. With CSV/manual data, describe missing activity as “No follow-up recorded here”; absence of a log does not prove that someone has not replied or that the owner has not contacted them elsewhere. Other signal types qualify through an explicit due next step today; specialized ranking is deferred.

Daily target: three normally, one in delivery mode. Persist the day's selection, reuse existing drafts on reload, and do not silently refill the queue when someone finishes or skips a card. A mode switch changes the remaining target without undoing completed work or deleting hidden drafts. At midnight use the owner's timezone to begin the next day. An eligible shortage shows fewer cards and the reason; target size never overrides eligibility.

## Draft and approval rules

`prompts/draft-touch.md` should request a short subject and approximately 60–100 words, a real shared-context reference, and one easy next step. It must prohibit invented facts, promises, familiarity, and evidence. Treat contact notes as data that cannot change the drafting instructions. The model returns subject/body plus references to the supplied evidence; references aid review but do not establish factual correctness by themselves.

Validate the output shape and render it as plain text. Display the evidence next to the editor so a human can check it. No automatic tool use or sending is available to the drafting model. API failure must leave the queue usable with manual writing.

Clipboard lifecycle: `draft → approved → copied → sent_confirmed`, with skip/snooze as separate handling. Approval records the exact recipient, subject, body, revision, and evidence version. “Approve & copy” is a human action on the displayed revision. Editing or regeneration clears prior approval. Clipboard failure preserves approved status and offers a retry; it must not claim copying or sending succeeded. “I sent it” requires the current approved/copied revision and creates an idempotent owner-reported send event. Duplicate clicks cannot increment the floor twice.

Outcome recording supports replied, booked, no response, and not now. Replied/booked moves the contact out of automatic dormant follow-up until the owner sets a next step. Not now requires a revisit date and suppresses until then. No response never causes an immediate automatic follow-up. Provide a clear do-not-contact control.

Floor: count distinct confirmed queue-item sends in the trailing seven owner-local calendar dates, including today; minimum goal five. Approval, copying, skipping, and draft creation add zero. Delivery mode leaves this weekly minimum unchanged. Show manual confirmation provenance in history; do not describe this activity counter as predicted pipeline revenue.

## Build slices and time budget

Estimates assume one builder familiar with the stack and ready service access. Six hours is a target for this prototype, not a delivery guarantee. New infrastructure or unfamiliar tooling can take a full day or more.

| Elapsed time | Slice | Visible result |
| --- | --- | --- |
| 0–45 minutes | Scaffold and choose one persistence path | App boots, owner boundary established, scripts configured |
| 45–120 minutes | Contact model, import, and eligibility | Fictional CSV imports; unsupported rows are blocked |
| 120–180 minutes | Queue and Today's cards | Three explainable priorities; delivery mode shows one |
| 180–240 minutes | Drafting and review/copy | Real draft or manual editor; approval tied to revision |
| 240–285 minutes | Confirm sends, outcomes, and floor | Refresh preserves work; only actual confirmations count |
| 285–360 minutes | Critical checks, demo rehearsal, README | Repeatable five-minute demo with known limits |

### 1. Establish the application and verification baseline

Create the app and the selected database migration. Add the scripts below, basic owner context, and a one-screen shell. Use a fictional business profile and fixture data for tests. Keep fixture initialization explicit and idempotent; never reset a real database when running tests.

**Verify:** `npm run typecheck`, `npm run lint`, and `npm run build` exit 0. `npm run db:migrate` succeeds on the chosen development database. A hosted build must reject unauthenticated data access before accepting real contact imports.

### 2. Implement the relationship gate and imports

Add validation in `src/lib/domain/`, storage in `src/lib/server/`, and schema constraints in the chosen migration directory. CSV fields: `name,email,signal_source,signal_evidence,signal_at,last_two_way_at,next_step,next_step_due_at`. Optional fields may be blank; two-way/date pairing rules still apply. Set a demo limit of 500 rows / 1 MB and return understandable row-level errors. Include manual add using the same validator.

**Verify:** `npm run test -- tests/unit/eligibility.test.ts` and `npm run test:integration -- tests/integration/provenance.test.ts` pass. Integration checks must use actual database writes, proving missing evidence and cross-owner queue references are rejected below the UI.

### 3. Implement priorities and Today

Add deterministic rules, time handling, persisted queue selection, card reasons, and the delivery toggle. Display factual dates and relationship evidence. Include empty, insufficient-evidence, and all-handled states.

**Verify:** `npm run test -- tests/unit/priority.test.ts tests/unit/daily-queue.test.ts` passes for fixed-clock fixtures, ties, cooldown exceptions, timezone rollover, and three-to-one mode switching.

### 4. Implement drafting and explicit approval

Create the prompt file, server provider wrapper, output validation, editor, approval persistence, and clipboard flow. Configure the model through a server environment value selected at build time; do not hardcode an unverified model identifier. Only explicit owner actions approve content. Add manual fallback on generation failure and labeled fixture responses for automated tests.

**Verify:** `npm run test -- tests/unit/drafts.test.ts` and `npm run test:integration -- tests/integration/approval.test.ts` pass. Test an edited approved draft, stale approval, changed evidence, clipboard failure, and suppression after queue creation. Verify provider failures never create approvals or send events.

### 5. Log outcomes and the weekly floor

Add “I sent it,” event deduplication, the four outcomes, next step/date editing, and the floor calculation. Read existing state after refresh; do not keep essential records only in browser memory.

**Verify:** `npm run test -- tests/unit/floor.test.ts` and `npm run test:integration -- tests/integration/activity.test.ts` pass. Exercise duplicate confirmation, copying without sending, a seven-day boundary, and reopened sessions.

### 6. Rehearse and document the complete workflow

Add one Playwright journey: start with fictional contacts, preview import errors, see the expected three people, inspect evidence, edit/approve/copy, confirm sent, refresh, and switch delivery mode. Add a failure case for an ineligible contact. Test keyboard access and a narrow viewport during rehearsal.

Write README with install/run instructions, chosen storage path, environment variable names, sample CSV, demo limitations, and developer setup separated from owner use. Public repo readiness includes fictional fixtures and ignored secrets; publishing is a separate action.

**Verify:** `npm run test:e2e` passes using a stub drafting provider and no external mail transport. Run the final gates below once, and repeat only when failures or subsequent edits justify it.

## Proposed command contract

These scripts do not exist yet and were not run during planning. Establish them in slice 1; they are the acceptance interface for the future implementation.

| Command | Definition / success |
| --- | --- |
| `npm install` | Install and write the initial lockfile; subsequent reproducible installs use `npm ci` |
| `npm run dev` | Next development server; local fallback explicitly binds to `127.0.0.1` |
| `npm run typecheck` | `tsc --noEmit`; exit 0 |
| `npm run lint` | ESLint in check mode; exit 0 |
| `npm run build` | `next build`; exit 0 |
| `npm run test` | Vitest unit tests under `tests/unit`; all pass, fail if none found |
| `npm run test:integration` | Vitest under `tests/integration`; uses an isolated selected-database test instance; all pass |
| `npm run test:e2e` | Playwright with fictional data and stub drafting; all pass |
| `npm run db:migrate` | Apply the selected database migration; exit 0 without dropping existing data |

For hosted integration tests, fail clearly if isolated test database credentials are absent; do not silently skip the provenance checks or use the owner's real records. For SQLite, use disposable test databases with the same migration and constraints.

## Demo script and done criteria

Use fictional fixtures dated relative to a controlled demo clock: an overdue proposal for Alex, an unanswered inbound inquiry from Jordan, and a past client Sam last contacted 90 days ago. Include one invalid row with missing evidence, one suppressed contact, and one recently contacted person.

Show import preview rejecting the invalid row; explain why Alex, Jordan, and Sam were selected; edit and approve/copy Alex's message; show that the floor is unchanged until “I sent it”; refresh; switch to delivery mode and demonstrate the reduced remaining target. All on-screen demo data must be labeled fictional.

- [ ] All six final commands (`typecheck`, `lint`, `build`, `test`, `test:integration`, `test:e2e`) succeed.
- [ ] Missing/blank evidence, unsupported sources, missing two-way dates, and cross-owner references are rejected by database tests.
- [ ] Every selected person has factual evidence and a readable reason.
- [ ] Normal and delivery targets are three and one; empty eligibility never bypasses the gate.
- [ ] Drafts are editable; stale revisions and changed evidence cannot retain approval.
- [ ] Clipboard-only action leaves the send count unchanged; duplicate send confirmations count once.
- [ ] Outcomes, suppression, and next-step dates affect later selection as specified.
- [ ] Hosted data requires an owner session; local mode is clearly local-only.
- [ ] A founder can finish the three-card rehearsal within 15 minutes.
- [ ] README records tested commands, selected storage, actual limitations, and any deferred slice; update `plans/README.md` status accurately.

## Cut line and follow-on work

With only 1–3 hours, aim for a labeled local concept demo: fictional contacts, the provenance gate, deterministic cards, manual drafts, approval/copy, delivery toggle, and floor. Defer CSV and live Claude if necessary. Record it as partial completion of this plan, not the full MVP.

With extra time after all core gates pass, consider Gmail as a separately scoped increment. It needs explicit provider scopes/tokens, a stored exact-content approval, a rechecked eligibility gate at send time, and duplicate-send protection. Ambiguous provider timeouts need reconciliation and human retry, never blind resend. Tests use a transport stub/dry-run, never actual auto-send. Do not make OAuth or live delivery a dependency of this plan. [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Supabase provider tokens](https://supabase.com/docs/guides/auth/social-login/auth-google)

Future Calendar imports must distinguish a mere invitation from evidence that a meeting occurred. Email imports must distinguish a one-sided sent message from a two-way exchange. Neither can manufacture provenance.

## Conditions requiring a plan adjustment

- New source code or a changed charter conflicts with this baseline: reconcile before overwriting work.
- Evidence/approval constraints fail: fix them before presenting the workflow as functional; do not remove the gates to meet the time budget.
- No Claude credentials: use manual drafting and state the limitation.
- No hosted infrastructure: take the local route described above, instead of exposing an unauthenticated hosted contact store.
- A requested feature needs cold sourcing, automatic sends, or speculative VSL design: report the conflict with the charter and keep it outside this MVP.

Maintenance priorities: preserve provenance when expanding imports; bind approvals to final content when adding transport; keep manual confirmations distinguishable from provider receipts; and retain a small daily workload as new modules are considered.
