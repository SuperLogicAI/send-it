# First increment — October 15, 2026

The local foundation and manual follow-up workflow are implemented. This is a partial MVP: live Claude drafting and a browser walkthrough remain outstanding. Use this status alongside [PLAN.md](PLAN.md) and its [review corrections](plans/claude-plan-v2-review.md); the original plan is preserved.

## Ready

| Area | Implemented behavior |
| --- | --- |
| App and storage | Next.js + TypeScript, native `node:sqlite`, local-only defaults, MIT license |
| Contacts | Required relationship evidence in schema and eligibility rules; manual entry and CSV preview/import |
| Today's people | Saved selection, deterministic reasons, owner-local dates, 3-person target or 1 in Busy week |
| Messages | Author-written fictional demo drafts; manual editor for real contacts; explicit saving |
| Handoff | Prefilled Gmail compose view and Copy fallback; neither records a send |
| Activity | Explicit, idempotent **I sent it**; five confirmed follow-ups over the trailing seven local dates |
| Follow-through | Skip, snooze, do-not-contact, reply/booking/no-response recording, dated next steps |
| Separation | Fictional demo and personal workspace use separate local database files |

There is no outbound mail transport or automatic sender. The owner presses Send in their own mailbox and then records the send in Send It. The meter measures self-reported activity, not pipeline health or revenue. An empty eligible list stays empty.

## Verified

Checked on Node **26.0.0**, npm **11.12.1**, Next.js **16.3.0**:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed; native SQLite bundled successfully |
| `node scripts/check.ts --built-route` | 19 checks passed, including 18 storage/rule/parser/page-data checks and the compiled API route |

The compiled-route check uses disposable databases in a temporary directory. It verifies rejected origins, Gmail URL encoding, handoff versus send accounting, duplicate confirmation, separate workspaces, CSV preview/import, and preparation of an initially empty selection. No real contact data or email services were used.

The first browser startup exposed a React serialization error: native SQLite rows have null prototypes. Profile and contact reads now copy rows into plain objects before returning them. A regression check first reproduced the failure, then passed for the complete page-data graph in empty and seeded workspaces, including sent history. Typecheck, lint, production build, and all 19 checks passed after the fix. The running local page could not be reached from the tool environment, so browser confirmation remains outstanding.

The two-connection storage check verifies repeated initialization against a shared file; it is not a concurrent-load test. No dependency security audit was completed. Dependencies came from an isolated copy of the existing npm cache because registry network access was unavailable.

## Browser walkthrough still needed

The environment denied binding `127.0.0.1:3000` (`EPERM`). The tool policy rejected an escalation because sandbox approvals are disabled. No browser was available for a static layout review either. Browser layout, clipboard permissions, popup handling, and the actual Gmail compose behavior have therefore **not** been verified.

From this folder in a normal terminal:

```sh
npm run dev
```

Open **http://127.0.0.1:3000**. Dependencies are already installed in this workspace; a fresh checkout needs `npm ci` first.

1. Start in the labeled fictional demo. Confirm three people, relationship evidence, and a reason for each.
2. Edit and save a message. Reload and confirm it is preserved.
3. Try Copy or Review in Gmail. Confirm the floor has not increased. Close any fictional compose window without sending it.
4. Use **I sent it** only in the fictional demo to simulate confirmation. Confirm the floor increases once and reload preserves it.
5. Toggle Busy week. If one card has already been completed, no additional card should be required that day.
6. Switch to **Use my own contacts**. Confirm this workspace starts empty. Add a real warm contact with accurate evidence and activity dates, or import an appropriate CSV. Use **Prepare today's people** when the selection is empty.

The sample CSV contains fictional people and fixed historical dates. Inspect it as a format example; avoid mixing its rows with your actual contacts.

## Next build increment

1. Complete the browser walkthrough and fix any interaction issues.
2. Connect Claude drafting on the server using `prompts/draft.md`. Verify the supported model ID, keep credentials in environment variables, validate output, preserve saved edits, and retain the manual editor on failure. Do not regenerate drafts on reload or overwrite owner edits.
3. Validate with the owner first, then 3–5 founders over five days using the study in the plan. Measure time to finish, useful sends, edits/skips, and whether the habit survives a busy day.

Gmail/Calendar ingestion, hosted authentication and persistence, billing, multi-customer operation, a live-conversation metric, and VSL remain deferred. Local SQLite and a loopback-only server are not a deployment configuration for Vercel or a shared SaaS.

## Phase 0 progress — October 15, 2026

Node 26.0.0, Next.js 16.4.2. Done: 0.2 (local git; push is the owner's), 0.3, 0.3b, 0.4, 0.6.

| Check | Result |
| --- | --- |
| `npm audit --omit=dev` | 0 vulnerabilities (5 dev-only `braces` advisories remain via `eslint-config-next`) |
| `AGENTS.md` after `next dev` | Hash unchanged (`agentRules: false`) |
| typecheck, lint, build | Passed |
| `npm run check` / `--built-route` | 21 / 22 checks passed, including plain-SQL CHECKs (Feb 30, bad email) and `buildPrompt`/`parseReply` |
| Browser (Chromium, demo workspace) | Draft in Claude opens `claude.ai/new` and copies the prompt; the once-only privacy notice shows; pasting `Subject: …` fills the subject; no horizontal scroll at 390px |

Not verified: Safari and iPhone clipboard/pop-up behavior (step 0.5, owner). Existing `data/*.db` files created before 0.3b still carry the old function-based CHECKs; delete and recreate them (`demo.db` reseeds; `engine.db` is the owner's).

## Phase 1.2 spike — vinext + store Worker (branch `spike/vinext-wrangler`)

| Check | Result |
| --- | --- |
| `vinext init --platform cloudflare` | Default now sets up the **beta `cf` CLI** (`cloudflare.config.ts`), not Wrangler. Used `--legacy-wrangler-cloudflare-init` to match the plan (`wrangler.jsonc`, `script_name` bindings). The `cf` attempt is kept as a WIP commit on `spike/vinext`. |
| `vite build` (vinext) | Passes. Worker is ~1 MiB (325 KiB gzip) |
| Local, app Worker → store Worker (`wrangler dev` store + `vite dev` app, `script_name` binding) | Works. Owner A: 0 → add → 1 row; owner B sees 0. `INSERT … RETURNING id` works. A row with no provenance is rejected by the CHECK. The real `lib/schema.ts` runs in one `sql.exec` |
| `/` (the demo page) on workerd | **500 "operation not permitted"**: `node:sqlite` and `mkdirSync` can't run in workerd. Expected; fixed by step 1.3 |
| `wrangler deploy --dry-run` (store and app) | Both bundle; bindings resolve |
| Deployed preview | **Not done.** The Cloudflare account has no `workers.dev` subdomain, and Wrangler couldn't register one |

Side effects: `vinext init` raised React to 19.3.1 (needed by `react-server-dom-webpack`); `vite dev`/`next build` both rewrite `next-env.d.ts`, so expect churn until Next is removed; ESLint now ignores `dist/`, `.vinext/`, `.wrangler/`.

## Phase 1.3 — storage in a per-owner Durable Object (branch `phase1/cloudflare`)

| Area | Change |
| --- | --- |
| `lib/store.ts` | No Node imports. `Store` is a small interface; `transaction()` uses `db.transaction` when present, else `BEGIN IMMEDIATE`; `addContact` uses `RETURNING id` |
| `lib/node-store.ts` | Node-only `openStore`, used by `npm run check` |
| `lib/schema.ts` | One schema string shared by Node and the Durable Object |
| `lib/actions.ts` | The route's action switch, moved so it runs inside the Durable Object: one RPC per request |
| `store/` | `send-it-store` Worker, `OwnerStore` class (`view`, `act`), no public HTTP surface |
| Storage keys | `owner:<email>` and `demo:<email>`; the `engine-workspace` cookie only picks between them. The owner is a fixed development value and production builds refuse to run until step 1.4 |

| Check | Result |
| --- | --- |
| typecheck, lint, build (`vite build`) | Passed |
| `npm run check` | 23 passed, including the owner journey on in-memory SQLite |
| `npm run check:workers` | 4 passed in local workerd: owner journey, owner isolation, CHECKs and foreign keys, transaction rollback |
| Browser (Chromium, `vite dev` + `wrangler dev` store) | 1.2 gate met locally: the demo renders on Workers from the Durable Object. Three cards with reasons; edits survive reload; Copy leaves the floor at 0; "I sent it" gives "1 handled today"; own-contacts workspace opens; no horizontal scroll at 390px |

Found and fixed: Durable Object RPC results carry `Symbol.dispose`, which React refuses to pass to client components; `page.tsx` copies the payload to plain JSON.

Gotchas: wrangler's default dev port 8787 can be held by another process and `unstable_startWorker` then hangs silently, so the Workers check picks free ports. The Next toolchain no longer builds this app (`next build` fails on `cloudflare:workers`). Local runs now need two terminals (`dev:store`, `dev`). Not merged into `main` so the 10-day trial testers keep the single-command Node version.

Not verified: a deployed preview (no `workers.dev` subdomain; skipped by decision), Safari/iPhone (0.5).

## Phase 1.4 — Cloudflare Access sign-in (code; not yet deployed)

| Area | Change |
| --- | --- |
| `lib/access.ts` | Verifies the `Cf-Access-Jwt-Assertion` RS256 JWT with Web Crypto: signature against the team's JWKS, issuer, audience, `exp`, `nbf`, and an `email` claim. Fails closed when the team or AUD is not configured |
| `lib/owner.ts` | Owner key = verified, lowercased email. Only `NODE_ENV === "development"` skips sign-in; an unset `NODE_ENV` behaves like production |
| `lib/origin.ts` | Production accepts only `Origin: https://sendit.day`; a development build also accepts same-host localhost |
| `wrangler.jsonc` | `ACCESS_TEAM=broad-wave-65e1`, `ACCESS_AUD` still empty, custom domain `sendit.day`, `workers_dev` and `preview_urls` off |

| Check | Result |
| --- | --- |
| `npm run check` | 24 passed, including Access JWT: valid token accepted; forged signature, swapped payload, wrong audience or issuer, expired, not-yet-valid, missing email, `HS256`, `none`, unknown key, and unconfigured team/AUD all rejected |
| Development run | Page renders, API works, a foreign origin gets 403 |
| Production build run locally (`wrangler dev` on `dist`) | Page shows "Please sign in"; API with no token → 403 "Sign in to continue."; with the site origin and a forged token → 403; localhost origin → 403 |
| `check:workers`, typecheck, lint, build | Passed |

Not verified: a real Access token. That needs the deployed site and the AUD tag. Remaining owner input: `ACCESS_AUD`. Also still open: the first deploy (custom domain, Access application hostname).

## Streaks and badges (v1) and the public landing page

| Area | Change |
| --- | --- |
| `lib/streak.ts` | Replays confirmed-send days: workday streak, calendar-week count, one skip per 5 sends in a Mon-Sun week (cap 5), skips spent on missed workdays, derived badges. Nothing stored |
| `lib/store.ts` | `today()` returns `streak` and `badges`; `seedDemoHistory` seeds sample sends for the fictional demo |
| UI | The momentum card shows the daily streak, the week's progress and the skip bank; a badges panel; "On your computer" is now "Private to you" |
| Landing | Public page on the bare domain (`sendit.day`); the app moves to `app.sendit.day` |

| Check | Result |
| --- | --- |
| `npm run check` | 26 passed, including streak replay: weekends neutral, a skip spent on a missed day, cap at 5, a vacation week covered, the week reset, and badges |
| `npm run check:workers` | 4 passed; the journey also asserts the demo streak (4) and that a send extends it |
| Browser (Chromium) | The demo shows a 4-day streak; "I sent it" makes it 5 and unlocks the 5-day badge; the landing page and the app have no horizontal scroll at 390px |

## Dependency audit correction (after adding vinext)

The Phase 0 line "`npm audit --omit=dev` shows 0 vulnerabilities" no longer holds. With vinext 1.2.1, `npm audit --omit=dev` reports 10 advisories (4 moderate, 6 high): `vite-plugin-commonjs` → `vite-plugin-dynamic-import` → `fast-glob` → `micromatch` → `braces`, and `@vercel/og` → `satori` → `fflate`, plus `eslint-config-next`'s `braces`. Searching `dist/` finds none of that code in the built Worker (`unzipSync`, `satori`, `micromatch`, `fast-glob`, `braces`: 0 files each), so they are build-time only. vinext 1.2.1 is the latest release; recheck on updates.
