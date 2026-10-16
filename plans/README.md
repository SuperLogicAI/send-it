# Engine planning package

Created October 15, 2026 using the improve skill for the initial folder review, concept synthesis, and MVP plan. The user subsequently authorized implementation. The first local increment is now built; see [BUILD.md](../BUILD.md) for verified behavior and outstanding work. Nothing has been deployed.

Read [the product brief](product-brief.md) for positioning, source synthesis, scope, commercial direction, and validation. **For today's build, use Claude's merged [PLAN.md v2](../PLAN.md), with the corrections in [the v2 review](claude-plan-v2-review.md).** The earlier [plan 001](001-hackathon-mvp.md) is reference material, superseded for hackathon execution. Claude's PLAN.md has not been edited by this review.

## Execution order and status

| Plan | Title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 001 | Today's three useful follow-ups | P1 | Earlier 4–6 hour proposal | None | REFERENCE — superseded by root PLAN.md v2 |
| 002 | [Send It on Cloudflare: validation to free public product](002-send-it-cloudflare.md) | P1 | Phased; ~8–12 h for Phase 0 | BUILD.md first increment | READY — pre-flight checks run Oct 15; RTFs moved out; Phase 0 starts at 0.2 |

Implemented direction: local Next.js + SQLite, Gmail compose handoff, Copy fallback, owner-confirmed sends, and one focused assert script. The implementation applies the review's date, queue, suppression, and send-accounting corrections. Live Claude drafting and browser verification remain outstanding.

The user requested the MVP plan directly, so this package uses one focused implementation plan rather than an unselected audit backlog. The authorized first increment uses the merged plan's defaults: Engine, web first, manual Busy week, a confirmed-follow-up floor, MIT, and local SQLite.

## Review scope

The initial planning review read all four then-existing content files: `AGENTS.md`, both RTF documents, and `.logic-loop/board.md`. It checked the referenced framework repositories and official Next.js, Supabase, and Gmail documentation. At that time the folder had no application code, Git history, database, dependency manifest, or working test commands, so there was no implementation to audit or test. The referenced third-party repositories were reviewed for relevance, not audited for security. Current implementation checks are recorded separately in [BUILD.md](../BUILD.md).

On October 15, 2026 the two RTF research notes (`Sales Frameworks.rtf`, `Frameworks and Skills to Build on_.rtf`) were moved out of this repository into the owner's private notes before publication. Citations to them in these plans refer to those privately kept source notes.

## Considered and deferred or rejected

- Full CRM, seven-stage board, and qualification checklist: deferred to preserve a short daily workflow.
- Automatic outbound follow-ups and cold sourcing: rejected because they conflict with the charter.
- Heavy engineering-framework adoption as an MVP prerequisite: unnecessary to validate the owner workflow.
- VSL generator, Hyperframes, and Brag integration: deferred pending Josh's context; no module design or scaffolding.
- Gmail/Calendar as day-one dependencies: deferred so provider setup cannot block the core demo.
- Calling an activity floor a revenue forecast: rejected; the proposed measure does not support that claim.
- Shared SaaS, billing, and team permissions: deferred until owner usage validates the core loop.

Status values for implementation: TODO, IN PROGRESS, DONE, or BLOCKED with a specific reason; REFERENCE identifies a superseded proposal. Planning and review artifacts are complete. The application has a working local foundation and manual workflow; the full MVP remains in progress.
