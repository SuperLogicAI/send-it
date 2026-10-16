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
