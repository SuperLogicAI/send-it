# Send It

A few thoughtful follow-ups, then back to your client work.

Send It is an open-source sales companion for solo consultants and small service teams. It suggests up to three people you already know, explains why each matters today, and keeps the shared context beside your message. Busy week reduces the daily target to one. It never sends email: you send from your own mailbox.

**Status:** an invite-only beta runs at [sendit.day](https://sendit.day) (the public page) and `app.sendit.day` (the signed-in app, behind Cloudflare Access). Request access from the landing page. The plan and what is built are in [plans/002-send-it-cloudflare.md](plans/002-send-it-cloudflare.md) and [BUILD.md](BUILD.md).

## Run it locally

Requires Node 24 or newer (developed and checked with Node 26).

```sh
npm ci
npm run dev:store   # terminal 1: the data store (a local Cloudflare Worker)
npm run dev         # terminal 2: the app
```

Open **http://localhost:3000** (the public page is previewed at `/landing`). Both processes run only on this computer. A development build uses a fixed development owner and skips sign-in; any other build requires a valid Cloudflare Access token and refuses everything else.

The first screen is a labeled fictional demo with a sample streak. Choose **Use my own contacts** to open a separate, initially empty workspace. No email account connection is needed.

Developer setup belongs here, not in the owner's daily workflow. Once running, the owner uses the web page.

## How it is hosted

Two Cloudflare Workers: the app (Next.js on [vinext](https://github.com/cloudflare/vinext)) and `send-it-store`, which holds one SQLite Durable Object per owner and workspace, so there is no owner column to forget. The app reaches the store by binding only; the store has no public address. Sign-in is Cloudflare Access (one-time email codes for the beta); the Worker verifies the Access token itself and keys each owner by their verified email. The bare domain serves a public landing page and has no access to owner data. A one-click "deploy your own" guide is planned (plan step 2.7).

## What works

- A persistent SQLite contact model requiring an allowed relationship source, real context, and valid dates.
- Manual contact entry and CSV preview/import. Invalid rows are explained, and duplicate addresses do not overwrite history.
- Deterministic ranking: unanswered recorded inbound activity, due next steps, stalled quotes, and dormant warm/client relationships.
- A saved daily selection with no automatic replacements after skipping, snoozing, or suppression. Days follow the owner's timezone.
- Editable messages, explicit saving, **Review in Gmail**, and a **Copy** fallback.
- **I sent it** records an owner-confirmed send once. Opening Gmail or copying does not count. Send It has no mail-sending API or background sender.
- Busy-week mode, snooze dates, and do-not-contact.
- A gentle streak: one confirmed follow-up on a workday keeps it going, weekends never break it, five in a week banks a skip (up to five, a full work week) that covers a missed workday automatically, and four badges (first follow-up, 5-day streak, 4 strong weeks, first reply).
- Reply/booking/no-response recording with a next step and date. Booking alone never creates a two-way-exchange record.
- Separate fictional and personal workspaces, each its own Durable Object database.

After adding or importing your first people, use **Prepare today's people** if the daily list is empty. Once a nonempty selection is saved, additional imports can appear the next day. Switching mode does not undo completed work or discard reserved cards.

## What's next

**Drafting without an API key.** Each card has **Draft in ChatGPT**, **Draft in Claude**, and **Copy prompt**. They build one prompt from `prompts/draft.md`, your profile, and the person's recorded context, copy it, and open a new chat. Paste the reply into the message box; a leading `Subject:` line fills the subject. Nothing is sent and the card's status doesn't change. Server-side Claude drafting is not connected yet; the demo contains authored sample messages for fictional contacts.

Also not built yet: open sign-up, the daily email to owners, Calendar ingestion, sharing badges, billing, and VSL modules. Gmail read or send permissions are not planned, and Send It will not gain a sending path. The [current plan](plans/002-send-it-cloudflare.md) lists what comes next; the original [execution plan](PLAN.md) and [review corrections](plans/claude-plan-v2-review.md) are kept for history. The implementation applies the review's corrected date, queue, suppression, and send-accounting behavior.

## Why someone is picked

Eligibility comes first: valid relationship evidence; no do-not-contact flag, lost relationship, or future snooze. A recorded outgoing touch within seven days normally prevents another suggestion. A newer incoming message or a due owner-set next step can override that spacing, but never suppression.

Then `lib/rules.ts` applies four priority bands and sorts by the relevant date, then contact ID. Quote follow-ups use the recorded quote date and last outgoing activity, not the date the relationship began. Reasons say what is recorded here; they do not claim to know everything in your mailbox.

When you confirm a follow-up, its captured next step is consumed only if it is still current. A newer next step is preserved. Every message remains under human control: Gmail opens a compose view, you review the recipient/sending account and press Send there, then confirm back in Send It. Gmail can change this unofficial compose-link behavior; Copy remains available.

The streak and the weekly goal of five are self-reported activity indicators, not a pipeline or revenue forecast. They are computed from the days you confirmed sends, so nothing extra is stored. The goal of five is a working default to validate through use.

## CSV format

Download the fictional example from **Your people**, or use `public/sample-contacts.csv`.

Required columns: `name,email,signal_source,signal_evidence,signal_at`.

`signal_source` accepts `two_way`, `inbound`, `event`, `referral`, `client`, or `opt_in`. Two-way contacts also require `last_two_way_at`. Dates accept `YYYY-MM-DD` or UTC ISO timestamps. Keep original event dates; an import is not a new conversation.

Optional columns: `stage`, `quote_sent_at`, `last_inbound_at`, `last_outbound_at`, `next_step`, `next_step_at`, `not_now_until`. Next-step text and date must be provided together. Stages are `warm`, `talking`, `quote`, `client`, and `lost`.

Limit: 500 rows and 1 MB. A description is owner-attested evidence; software cannot prove it is true. Purchased, scraped, or guessed lists are prohibited even if supplied as CSV. A shared event can be described on each actual registrant's row; never copy one person's relationship onto unrelated contacts.

## Checks

```sh
npm run check
npm run typecheck
npm run lint
npm run build
npm run check:workers
```

`npm run check` tests the rules and the whole owner journey on disposable in-memory SQLite. `npm run check:workers` runs the real per-owner Durable Object in local workerd: the same journey, owner isolation, database CHECKs and foreign keys, and transaction rollback. Tests never use real contacts or send email. Results are recorded in [BUILD.md](BUILD.md).

## Local data and development

Each owner's data lives in its own SQLite Durable Object (`store/`); locally it is kept under `.wrangler/state`, which is ignored along with secrets and build output. Sample fixtures use `example.test` addresses. No analytics, remote fonts, or third-party logging are included. The existing research documents and product charter are preserved.

Dependencies are pinned to exact versions in `package-lock.json`. `npm audit --omit=dev` currently reports 10 advisories (4 moderate, 6 high). All are transitive through vinext's build tooling (`vite-plugin-commonjs` to `braces`, `@vercel/og` to `fflate`) or through `eslint-config-next`. None of that code is in the built Worker (checked by searching `dist/`), and the only fix offered is a breaking change. Recheck when vinext or `eslint-config-next` updates. The scoped `ignore` override pins a compatible v7 release for development tooling.

MIT licensed. See [LICENSE](LICENSE). The Super Logic AI name and logo are not covered by the MIT license.
