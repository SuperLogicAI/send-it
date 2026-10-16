# Plan 002: Send It, from local prototype to free public product on Cloudflare

> Executor: read `AGENTS.md`, `BUILD.md`, and this whole plan before starting, including **Handoff** and **Pre-flight results**. Work phase by phase. Each phase ends with a gate; stop there and report to the owner. Don't start the next phase until its gate passes or the owner explicitly waives it. Hour figures are estimates, not results.

## Handoff

**Start at:** Phase 0, step 0.2. The RTF decision in step 0.1 is done. The CHASE rights question blocks only a port of CHASE material, not Phase 0.

**Owner-only steps.** The executor prepares these and stops; the owner does them:

- Decide what happens to the two `.rtf` files, and confirm rights before porting "CHASE" content (0.1).
- Create the GitHub repo and make it public (0.2).
- Test on a real iPhone/Safari (0.5).
- Choose the drafting model (1.5).
- Buy the domain; set up the Cloudflare account, 2FA, and Access policy; create the Anthropic key and set its spend limit; file the OpenAI interest form (1.1, 1.4, 1.5).
- Have the privacy and terms pages reviewed (1.7).
- Create the Google OAuth client (2.1).
- File a trademark, if wanted.

**Executor rules:**

- Never open, copy, or print `data/engine.db`. It's the owner's personal workspace (0 contacts as of Oct 15, but treat it as private). Use only fictional data with `example.test` addresses.
- `AGENTS.md` is the product charter and stays hand-written: set `agentRules: false` (0.3) before running `next dev` on Next ≥16.4.
- Keep prompts in `/prompts` files. No mail-sending API and no auto-send code path, not even behind a flag. Use a stub transport (dry-run) in tests.
- Pin exact dependency versions (`--save-exact`).
- Before every commit run `npm run typecheck`, `npm run lint`, `npm run check`, `npm run build`, and `node scripts/check.ts --built-route`. After Phase 1.3, run the Workers test instead of `--built-route`.
- Record verified results in `BUILD.md`. Report test failures with their output.

## Decisions (October 15, 2026)

| Topic | Decision |
| --- | --- |
| Name and domain | **Send It** at **sendit.day**. Cloudflare Registrar lists `.day` (Google Registry); confirm at checkout. |
| Repository | Stays **public and MIT**. The hosted sendit.day site is the official copy of the same code. |
| Business model | A free tool for building credibility. Freemium only if users ask for more (Phase 4). No billing work in this plan. |
| Hosting | Cloudflare Workers. The web app runs on **vinext**, Cloudflare's recommended path for Next.js; `vinext check` scored this app 100% compatible. |
| Data | **One SQLite Durable Object per owner**, inside its own **`send-it-store` Worker** and bound to the app with `script_name`. Sign-in tables (Phase 2) live in D1. |
| Drafting | **Draft in ChatGPT / Claude** (free, uses the owner's own account) and server-side Claude (capped per owner per day). Both use one prompt builder. |
| Mail | Send It never sends to contacts. Handoff options: Gmail compose link, `mailto:` on mobile, and Copy. |

This supersedes the stack in `AGENTS.md` §6 (Vercel, Supabase). Update the charter in step 0.4.

## Pre-flight results (October 15, 2026)

Run before handoff, in a scratch copy of the repo, using fictional data only.

| Check | Result | Consequence |
| --- | --- | --- |
| Secrets scan (keys, tokens, private keys) | None found | — |
| Personal data scan | Sample CSV and demo data are fictional (`example.test`). `data/engine.db` has 0 contacts and 0 touches. `.gitignore` excludes `data/`, `.env*`, `*.db`, and `*.tsbuildinfo` (confirmed with a `git add --dry-run`). | — |
| `Sales Frameworks.rtf` | An AI-generated summary of third-party sales training, with citation markers to unnamed sources. It recommends outreach sequences, "breakup" email templates, and qualification gates, which conflict with Pillar 1 in a public repo. | Owner decision in 0.1 |
| `Frameworks and Skills to Build on_.rtf` | Personal brainstorming notes (ECC, Pocock skills, VSL tools). It describes finding leads in the user's network and sending them DMs, which conflicts with the pillars. | Owner decision in 0.1 |
| `PLAN.md:180` | Plans to "port the CHASE Pre-Call Deep Dive," a third-party framework. | Confirm the rights before any port |
| `app/ui.tsx:697,964` | Placeholder emails use real domains (`theirbusiness.com`, `yourbusiness.com`). | Change to `example.com` in 0.4 |
| Baseline (Next 16.3.0) | typecheck, lint, and 18 checks pass | — |
| Upgrade to Next 16.4.2 | With `--save-exact` and `npm audit fix`: production dependencies show **0 vulnerabilities**. typecheck, lint, 19 checks, build, and the compiled-route check pass. 5 high-severity issues remain in dev-only tooling (`braces` via `eslint-config-next`); the only fix offered is a breaking downgrade. | Step 0.3 |
| `next dev` on 16.4.2 | **Appends a "nextjs-agent-rules" block to `AGENTS.md`** and re-adds it if removed. The real charter hash is unchanged (`828a39…`). | `agentRules: false` in 0.3 |
| Plain-SQL CHECKs instead of JavaScript SQL functions | All 19 checks pass on `node:sqlite`. Probe: junk text, Feb 30, and `nope` as an email are rejected; a valid timestamp is accepted. | Step 0.3b |
| Durable Object spike (wrangler 4.151.0, local runtime) | The whole schema runs in one `sql.exec`. Plain-SQL and provenance CHECKs are enforced. **Foreign keys are enforced by default.** `BEGIN` is refused with a message pointing to the transaction API. `transactionSync` rolls back when it throws. `date()`/`strftime()` are available. RPC from the Worker works. **Owner A has 1 row; owner B sees 0.** | Step 1.3 is de-risked |
| `npx vinext check` (vinext 1.2.1) | **100% compatible**: 8 supported, 0 partial, 0 issues | Step 1.2 |
| vinext and a Durable Object class in the same Worker | Not documented | Store goes in its own Worker (Decisions) |
| Browser walkthrough (Chromium, Next 16.4.2 copy) | `BUILD.md` steps 1–6 pass: three cards with reasons, edits survive reload, Copy works, the Gmail compose URL is correctly encoded, the floor doesn't count handoffs, "I sent it" counts once and survives reload, Busy week stops at "You've done your part today," the personal workspace starts empty with its own floor, Prepare today's people works. Recording an outcome also works. At 390px wide there is no horizontal scroll. | Re-run quickly on the real repo after 0.3 |
| Walkthrough findings | `favicon.ico` 404. Copy was tested only in Chromium with clipboard permission; Safari's gesture rules are untested. "About 10 minutes" shows even for one person. | Fixes in 0.4 and 0.6 |
| `chatgpt.com/?q=` and `claude.ai/new?q=` | Undocumented. One report says the Claude parameter stopped working; third-party guidance keeps URLs under ~2,000 characters; links may auto-submit. | **Not used.** The button copies the prompt and opens a new chat (0.6) |
| Cloudflare limits | Workers Free: 10 ms CPU per request, 100k requests a day (official docs). Zero Trust free for 50 users (third-party sources only). | $5/month Workers Paid from Phase 1 |

## Pillar check

| Feature | Provenance relied on | Notes |
| --- | --- | --- |
| Draft in ChatGPT / Claude | The contact's existing recorded signal | Produces a draft only; the owner sends it from their own mailbox |
| Server-side Claude drafts | Same | Same |
| Daily email | None needed | Goes to the **owner only**, never to contacts |
| Forward-to-log inbox (Phase 3) | Prior two-way exchange: the forwarded thread is the evidence | Opt-in, per owner |
| Calendar read (Phase 3) | Meetings the contact accepted, which count as two-way exchanges | The owner confirms before any signal is saved |

Rejected and never built: Gmail send API, auto-send, bought or scraped lists, deliverability tooling.

## Why one Durable Object per owner

- **Isolation by construction.** Each owner has their own SQLite database. There's no `owner_id` filter to forget; the spike confirmed owner B can't see owner A's rows.
- **The current schema ports almost unchanged.** `profile` with `id=1`, `UNIQUE(email)`, and the `daily_runs` primary key are all correct inside a per-owner database.
- **Built-in recovery and deletion.** Point-in-time recovery covers the last 30 days. Deleting an account is `ctx.storage.deleteAll()`.
- **Works on the free plan.** SQLite-backed Durable Objects are available on Workers Free (100k rows written a day, 5 GB total).
- **A separate Worker.** It keeps the data layer independent of vinext's maturity: if the web app later moves to OpenNext or a plain single-page app, the store doesn't change.
- **Limitation:** queries across owners, such as stats, need a separate counts-only table (2.8).

## Running costs

| Item | Cost |
| --- | --- |
| Domain | Cloudflare Registrar charges cost price, with no markup |
| Workers Paid | $5/month from Phase 1. The free plan's 10 ms CPU limit per request is too tight for server-rendered React |
| Durable Objects | Included in Paid: 1M requests and 50M rows written per month |
| Cloudflare Access (beta gate) | Free for up to 50 users |
| Turnstile, Email Routing, Web Analytics | Free |
| Claude drafts (3 per owner per day) | About $0.04 per owner per month on Haiku 5.5, about $0.72 on Sonnet 5.5. Hard-capped per owner per day |

---

## Phase 0: Validate locally and go public (~8–12 h, plus 2 weeks of use)

Phase 0 stays on Next.js and `node:sqlite`. Cloudflare starts in Phase 1.

| # | Step | Check |
| --- | --- | --- |
| 0.1 | **Owner decisions.** **Done Oct 15:** both `.rtf` files moved to the owner's private wiki vault; `"./*.rtf"` removed from `next.config.ts`; the existing citations in `plans/` now refer to privately kept notes. **Still open:** confirm the rights before porting CHASE material (doesn't block Phase 0). The secrets and personal-data review is **done** (see Pre-flight results). | Done; CHASE rights open |
| 0.2 | Run `git init`. Make the first commit, push to `SuperLogicAI/send-it`, and make it public (owner). Turn on GitHub secret-scanning push protection and Dependabot. | `git ls-files` matches the dry-run list, minus anything removed in 0.1 |
| 0.3 | Run `npm install --save-exact next@16.4.2 eslint-config-next@16.4.2`, then `npm audit fix`. In the same commit, add `agentRules: false` to `next.config.ts`. | `npm audit --omit=dev` shows 0 vulnerabilities; all checks pass; `AGENTS.md` is unchanged after running `next dev` |
| 0.3b | **Plain-SQL schema** in `lib/store.ts`. Details below. | All 19 checks pass (shown in pre-flight) |
| 0.4 | Rename and cleanup: `package.json` name → `send-it`; title `AGENTS.md` "Send It"; update §6 (stack in this plan) and §9 (name, MIT, hosting decided). Use `example.com` for placeholder emails; add `app/icon.png`; say "About 5 minutes" when there's one card. | No user-visible "Engine" text. The `/api/engine` path and `engine-workspace` cookie may stay |
| 0.5 | Quickly re-run the walkthrough on the real repo. **Owner:** try Copy and Review in Gmail in Safari and on an iPhone. | Results recorded in `BUILD.md` |
| 0.6 | Build **Draft in ChatGPT / Claude** (spec below). | New assert cases for `buildPrompt` in `scripts/check.ts`; manual test in Chrome and Safari |
| 0.7 | Use it yourself for 10 workdays. 2–3 technical founders run it on their own machines. Post about it publicly. | Daily notes on what you skipped and why |

**0.3b schema changes:**

- Delete the three `db.function(...)` registrations.
- Replace the JavaScript functions used in CHECK constraints:
  - `valid_timestamp(c)=1` → `strftime('%Y-%m-%dT%H:%M:%fZ',c) IS c`
  - `valid_day(c)=1` → `date(c) IS c`
  - `valid_email(email)=1` → `email LIKE '%_@_%._%'` (`parseContact` still does full validation)
- **Use `IS`, not `=`.** SQLite lets a CHECK pass when the expression is NULL, and junk input produces NULL.
- Leave the provenance CHECKs exactly as they are.

**Gate:** used on ≥8 of 10 workdays; ≥1 reply or booking traced to a Send It follow-up; ≥2 testers still using it in week 2; median session ≤15 minutes.

### Spec: Draft in ChatGPT / Claude

- **Placement:** on each card, beside the message editor: **Draft in ChatGPT**, **Draft in Claude**, **Copy prompt**.
- **One prompt builder:** `lib/prompt.ts` exports a pure `buildPrompt(instructions, profile, touch)`.
  - Inputs: the instructions from `prompts/draft.md`; profile fields (what you do, best clients, the result they want, voice sample, never say); contact fields (name, `signal_source`, `signal_evidence`, dated activity, next step, today's reason).
  - Wrap the untrusted fields in clear delimiters, matching draft.md's "untrusted data" rule.
  - Ask the model for plain text starting with a `Subject:` line. The chat apps don't return JSON; server drafting in 1.5 asks for JSON through structured output instead.
  - Move draft.md's "Implementation note" into `README.md` so it's never sent to a model.
  - Phase 1.5 reuses `buildPrompt`, so the two drafting paths never drift apart.
- **Build it on the client so the click is synchronous.**
  - `app/page.tsx` reads `prompts/draft.md` and passes its text to `Dashboard` as a prop. In Phase 1, Vite imports it with `?raw`.
  - The click handler then calls `buildPrompt` and `navigator.clipboard.writeText(prompt)`, and opens `https://chatgpt.com/` or `https://claude.ai/new` with `window.open(url, "_blank", "noopener")`, all within the click.
  - There's no server round trip, so Safari's clipboard and pop-up gesture rules are satisfied.
- **Fallback:** if the clipboard write fails, show the prompt in a read-only, pre-selected textarea with the message "Copy this, then paste it into ChatGPT or Claude."
- **Hint after copying:** "Prompt copied. Paste it into the new chat (⌘V / Ctrl+V), then paste the reply back here."
- **No `?q=` links.** They're undocumented and limited in length, and they would put contact details into URLs, browser history, and server logs.
- **Getting the draft back:** the owner pastes the reply into the body field. If the first line starts with `Subject:`, move it into the subject field. Then Save as usual.
- **Privacy notice, shown once:** "This shares the person's details with your ChatGPT or Claude account. If this is client information, turn off model training in that app's settings."
- **Status:** never counts as sent and never changes the card's status. Works with no API key, so it's the default drafting path for anyone running their own copy.

---

## Phase 1: Private beta hosted on Cloudflare (~25–35 h)

| # | Step | Check |
| --- | --- | --- |
| 1.1 | **Owner:** buy `sendit.day` through Cloudflare Registrar; turn on 2FA for the account; add DNS records `v=spf1 -all` and DMARC `p=reject` until Phase 2 sends email; file OpenAI's Sign in with ChatGPT interest form. | `dig TXT sendit.day` and `_dmarc` show both records |
| 1.2 | Run `vinext init` (the compatibility check already passed) and deploy a preview. **Spike:** the app Worker calls the store Worker's Durable Object through a `script_name` binding, both locally and when deployed. For local dev, use the Cloudflare Vite plugin's auxiliary Workers, or run the store with `wrangler dev` alongside so the two connect through Wrangler's local dev registry. Fallback if vinext blocks: OpenNext; record why. | The demo renders on Workers; a call to the store succeeds locally and in preview |
| 1.3 | **Move storage into the Durable Object.** Details below. | `npm run check` passes on Node; `scripts/check-workers.ts` passes |
| 1.4 | **Beta sign-in with Cloudflare Access (owner configures it).** Google as the identity provider, an email allowlist, free for ≤50 users. On every request the app verifies the `Cf-Access-Jwt-Assertion` header against Cloudflare's public keys (JWKS) and the application's audience tag (AUD). The header merely being present is not enough. Turn off `workers.dev` and preview URLs on the production Worker. The owner key is the verified, lowercased email. Replace the localhost origin check with two checks: a valid token, and an `Origin` of `https://sendit.day`. | No token or a forged token returns 403; the `workers.dev` URL is unreachable |
| 1.5 | **Server-side drafting.** Details below. | Assert tests with a stub transport: the quota holds, owner edits are never overwritten, a refusal or error falls back cleanly |
| 1.6 | **Security baseline:** a CSP and security headers via the `next.config.ts` `headers()` function (vinext reads it); the Workers Rate Limiting binding on the API, per owner; keep the existing request size limits; never log contact data or message bodies; secrets only through `wrangler secret put`. | Headers checked with `curl -I`; a log review finds no personal data |
| 1.7 | **Account controls:** export (CSV in the import format, plus JSON) and delete everything (`deleteAll()` behind a typed confirmation). Plain-language privacy and terms pages (owner reviews): what's stored, that drafts go to Anthropic, no selling of data, retention, how to delete. | Export, delete, and re-import round trip succeeds |
| 1.8 | **CI:** GitHub Actions runs typecheck, lint, both check scripts, and build, then deploys `main` with a scoped Cloudflare API token stored as a GitHub secret. | Green run on a test PR |

**1.3 moving storage into the Durable Object.** All patterns below were verified in the spike.

- Create `store/` containing its own `wrangler.jsonc` and the `OwnerStore` class, using `new_sqlite_classes`. Its RPC methods mirror the route's actions.
- Move the schema into `lib/schema.ts` and import it from both `openStore` (Node, which keeps `PRAGMA journal_mode=WAL`) and `OwnerStore` (no PRAGMA).
- Add a small shim so `lib/store.ts` keeps its query calls:

  ```ts
  prepare(q: string) {
    return {
      run: (...a: SqlStorageValue[]) => this.ctx.storage.sql.exec(q, ...a),
      get: (...a: SqlStorageValue[]) => this.ctx.storage.sql.exec(q, ...a).toArray()[0],
      all: (...a: SqlStorageValue[]) => this.ctx.storage.sql.exec(q, ...a).toArray(),
    };
  }
  transaction<T>(fn: () => T) { return this.ctx.storage.transactionSync(fn); }
  ```

- Transactions: `lib/store.ts` `transaction()` uses `db.transaction(fn)` when it exists, and the current `BEGIN IMMEDIATE` path otherwise. Move the `BEGIN` import block in `route.ts` into that helper too.
- `addContact` changes to `INSERT … RETURNING id`, because a Durable Object cursor has no `lastInsertRowid`.
- Storage keys: `owner:<email>` for real contacts and `demo:<email>` for the demo workspace. The `engine-workspace` cookie now only chooses between the owner's two keys.
- Workers test: `scripts/check-workers.ts` starts the store with `unstable_startWorker` from `wrangler`. Use that rather than raw Miniflare, whose constructor changed in v5. The test proves owner isolation, the CHECK constraints, and transaction rollback. It replaces `--built-route`.

**1.5 server-side drafting:**

- A **Write a draft** button calls the route, and the store reserves quota atomically: at most 5 generations per owner per day.
- The Worker calls Claude using the model in the `ENGINE_MODEL` secret, with `buildPrompt` plus structured output `{subject, body}`. Check `stop_reason`, including `refusal`.
- The draft is saved only if the card is still queued and the owner hasn't saved edits since the request.
- Never regenerate on reload. On failure, fall back to the manual editor and Draft in ChatGPT / Claude.
- **Owner:** set a monthly spend limit in the Anthropic Console, and choose the model after comparing 20 real drafts from Haiku 5.5 and Sonnet 5.5.

**Gate:** 10–20 invited non-technical owners; ≥40% still active in week 4; zero incidents of one owner seeing another's data; Claude cost per owner measured; top 3 friction points written down.

---

## Phase 2: Free public launch (~35–50 h)

| # | Step | Check |
| --- | --- | --- |
| 2.1 | **Open sign-up:** replace Access with Better Auth. Google only, scopes `openid email profile`, no Gmail scopes. Sign-in tables in D1. Keep verified email as the owner key so beta data carries over. Turnstile on sign-up. Test Better Auth on vinext in a small spike first. | Beta owners sign in and see their existing data |
| 2.2 | **Landing page on sendit.day:** the one-line promise, a 30-second demo (a README hero GIF doubles as the demo), **Start free**, the GitHub link, and "How we pick your 3 people" linking to `lib/rules.ts` (Pillar 5). | Visitor-to-sign-up rate measured |
| 2.3 | **Onboarding:** 5 plain questions, then add 3 people or import a CSV, then see the first daily list. | A new owner reaches their list in under 5 minutes, timed |
| 2.4 | **Daily email to the owner (opt-in):** a Durable Object alarm at the owner's local morning sends "Today's 3 people" with a link to the app. Send through Cloudflare Email Service (check availability and price) from `mail.sendit.day`; update SPF, DKIM, and DMARC; one-click unsubscribe. | Arrives at 7am owner-local; passes mail-tester |
| 2.5 | **Mobile:** a PWA manifest so it installs as an app. On phones, add a `mailto:` handoff that opens the native mail app. Add Outlook's web compose link for Microsoft 365 users (check it works). | Tap-to-send works on iOS and Android |
| 2.6 | **Abuse limits:** 2,000 contacts per owner, the existing 500-row import limit, the daily draft quota, and sign-up rate limits by IP. | Limits return plain-language errors |
| 2.7 | **Open-source housekeeping:** `SECURITY.md` (how to report a vulnerability privately), `CONTRIBUTING.md`, "Deploy your own" docs with a Deploy to Cloudflare button, issue templates. | A fresh fork deploys from the docs alone |
| 2.8 | **Metrics, counts only:** a daily D1 rollup of active owners, drafts, confirmed sends, and replies, with no names, emails, or text. A public `/stats` page feeds build-in-public posts. Cloudflare Web Analytics on the landing page only. | Rollup tables contain no personal data |

**Gate:** ≥100 owners; week-4 retention measured; Phase 3 bets chosen from the most-requested items.

---

## Phase 3: High-value features, picked by evidence (~10–25 h each)

- **3.1 Forward-to-log, with no Google permissions.**
  - Each owner gets an unguessable address, `<token>@in.sendit.day`, handled by Cloudflare Email Routing and an Email Worker.
  - When the owner BCCs or forwards a thread, the matching contact's last-exchange dates are updated and a short evidence line is added. An unknown sender becomes an "Add this person?" suggestion, with the thread as the evidence.
  - Accept mail only when the From address matches the owner's verified email and the message passes SPF/DKIM (check the `Authentication-Results` header).
  - Store dates and a snippet of at most 280 characters, never full message bodies.
  - **Compliance flag:** set a retention policy for third-party email content before building this.
- **3.2 Google Calendar.** Its read scope is classed as sensitive: it needs Google's verification, but not the paid annual security assessment. Uses:
  - Busy week switches on automatically based on meeting load.
  - An accepted meeting with a contact counts as a two-way exchange.
  - The owner confirms each signal before it's saved.
- **3.3 Floor history and slump warning.** An 8-week trend of confirmed follow-ups, with a warning when the 3-week average drops below the floor.
- **3.4 Sign in with ChatGPT plan usage**, only if OpenAI opens it to hosted apps.
- **Not planned:** Gmail read or send permissions. Google classes them as restricted, which means a paid annual security assessment, and that doesn't fit a free tool. Revisit only if a paid tier covers it.

## Phase 4: Monetize (optional, only if users ask for it)

**Triggers:** owners ask to pay, Claude costs pass a set monthly threshold, or owners request done-for-you setup.

**Shape:**

- The free tier stays generous: daily list, ChatGPT/Claude drafting, and capped server drafts.
- Pro adds a stronger model and calendar automation.
- Super Logic AI's done-for-you setup is the high-touch offer.

Nothing moves out of free. No billing code is written before a trigger fires.

---

## What's public and what's private

- **Public:** code, prompts, ranking rules, schema, plans, and aggregated counts.
- **Private:** Wrangler secrets (Anthropic key, auth secrets, the Cloudflare API token), owner data in Durable Objects and D1, the invite list, Access policies, and the research notes moved in 0.1.
- **Fine to commit:** `wrangler.jsonc` binding IDs and the account ID. They're identifiers, not credentials.
- **License: MIT.** Anyone can host their own copy, and for a credibility play that's extra reach. The moat is the brand (Send It, sendit.day) and the hosted convenience. Consider a trademark filing before the Phase 2 launch.

## Risks

| Risk | Mitigation |
| --- | --- |
| vinext is "under active development" and its own docs say to use it in production "with caution" | Compatibility check passed at 100%; the store lives in its own Worker; OpenNext is the fallback for the web app |
| `next dev` on Next ≥16.4 rewrites `AGENTS.md` | `agentRules: false` (0.3) |
| The Gmail compose link is unofficial | Copy is always available |
| Clipboard behavior varies by browser | Synchronous copy within the click, a textarea fallback, and an owner test in Safari (0.5) |
| Using email as the owner key: changing the account email orphans that owner's data | Add an alias migration if this ever happens |
| Owners can claim a relationship that isn't real (provenance is self-reported) | Send It has no sending ability; mail goes from the owner's own account; per-owner contact caps; terms prohibit bought lists |
| Dev-only `braces` advisory via `eslint-config-next` | Not shipped to production; recheck when `eslint-config-next` updates |
