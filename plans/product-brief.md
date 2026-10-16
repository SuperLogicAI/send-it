# Engine: a daily sales habit for busy founders

Planning draft — October 15, 2026. Product choices below are recommendations; the supplied charter remains authoritative.

## The product in one sentence

**Engine helps a busy founder keep warm business relationships moving by choosing a few people to follow up with, explaining why, and preparing messages the founder reviews.**

The daily promise: “Here are today's three people. Here's why each matters. Your messages are ready to review.”

## What is in this folder

| File | Contribution | How it informs the MVP |
| --- | --- | --- |
| `AGENTS.md` | Product charter, five pillars, proposed stack, hackathon scope | Governs the build: warm relationships, human approval, simple daily workflow |
| `Sales Frameworks.rtf` | Discovery, business cases, next steps, pipeline discipline | Supplies useful sales behaviors; its broader CRM scope needs trimming |
| `Frameworks and Skills to Build on_.rtf` | ECC, Matt Pocock skills, audience selection, video tools | Separates tools for building Engine from capabilities owners might eventually use |
| `.logic-loop/board.md` | Three example task cards | Placeholder only; there is no existing backlog |

There is no application, package manifest, database schema, test suite, or Git repository at this path as of this review. This is a concept-to-prototype plan, not a code audit. The numbered citations in `Sales Frameworks.rtf` have no accompanying bibliography, so treat those assertions as design inputs, not verified research.

## First customer and first job

Start with **solo consultants, small agencies, and service founders who sell and deliver their own work**, already have clients or warm conversations, and lose selling momentum during delivery. The documents support this audience more directly than the broad category “all startups.”

Their job: “When I'm busy serving clients, help me take one useful sales action without rebuilding the context from my inbox.”

The first release assumes there are existing relationships to work. Someone with no customers, inquiries, subscribers, event contacts, or prior conversations needs a different starting point; Engine should explain an empty queue honestly.

The value hypothesis is that choosing the right next person and reducing preparation time will improve follow-through. AI writing supports that job. We have not yet validated demand, retention, willingness to pay, or superiority over existing products.

## Reconcile the source concepts

| Source concept | Decision | Reason |
| --- | --- | --- |
| Find → See → ROI → Close | Use as a future product map | Today addresses finding the next appropriate action among known people and following through |
| Audience / “ICP” discovery | Five short setup questions | Helps owners explain their business without adding a strategy workshop |
| Next step + date + owner | Keep a simple next-step field and date | There is one owner; no assignments or team permissions UI |
| Seven-stage pipeline | Defer the board | Today's queue proves the central behavior with less administration |
| Thirty-minute sales block | Use the charter's ≤15-minute target | The habit must survive busy delivery days |
| Automated follow-up | Automate selection and drafting only | Every actual send still needs fresh human approval |
| Qualification gates | Defer budget/authority checklists | Provenance is the eligibility gate; a warm relationship need not already be a qualified deal |
| Breakup emails | Defer | Start with useful, truthful check-ins and respect “not now” and “don't contact” |
| ROI one-pager and discovery guidance | Consider after the daily loop works | Relevant next modules, but neither establishes the daily habit |
| Video sales letters | Park pending Josh's context | The charter explicitly leaves this separate and undefined |

## Owner experience

**Setup:** ask “What do you help people do?”, “Who do you do your best work for?”, “What result do they want?”, “How would you normally describe your offer?”, and “Anything we should avoid saying or promising?” Save concise editable answers. They guide wording; they never establish a relationship or authorize contacting someone.

**Add people:** import a small CSV or add someone manually. Require “How do you know them?” and a concrete note about that relationship. Show row errors before saving; a guessed address or generic “lead” label does not qualify. A labeled fictional sample makes the product demonstrable immediately.

**Today:** show up to three cards, each containing a person, the real shared context, why now, and an editable draft. Buttons: “Approve & copy,” “Edit,” and “Skip today.” Once connected sending exists, the approval button becomes “Approve & send.”

**Finish:** with copying, the owner sends from their own mailbox and selects “I sent it.” Later they can record “Replied,” “Booked,” “No response,” or “Not now,” plus a next step and date. Copying alone must never be counted as a sent message.

**Busy with client work:** a manual delivery-mode toggle reduces the target from three to one per day. It never sets the target to zero. If no appropriate contact is eligible, show an empty state and help the owner add relationship evidence; never manufacture a follow-up to fill the target.

**Floor indicator:** “Follow-ups completed: 2 of 5 minimum in the past 7 days.” Five is a proposed starting floor, not an established sales benchmark. Count confirmed sends, label manually confirmed sends, and keep the floor stable when delivery mode changes. This is an activity measure, not a forecast of revenue or booked work. A credible pipeline-health forecast needs more outcome history.

## Today's scope

Build one complete loop: **CSV/manual input → relationship check → three priorities → grounded drafts → review/copy → manual send confirmation → activity floor.**

Prioritize three common situations first: an overdue agreed next step or proposal follow-up; a recent inbound inquiry needing a response; a past client or two-way contact quiet for at least 60 days. Other permitted sources can be stored and used when the owner supplies a dated next step. Specialized event and referral prioritization can follow.

Keep setup, import, and Today as the primary screens. A contact detail drawer can hold evidence and next steps. No separate analytics dashboard, team management, billing, SMS, CRM sync, video module, outreach sequences, or workflow builder today.

## Open source and SaaS

Recommend **one open-source engine with an optional hosted service**. The repository contains readable prioritization rules, prompts, sample data, and setup instructions. Non-technical owners use the web UI; a technical helper or Super Logic AI handles installation and service credentials.

The first commercial hypothesis is paid setup and ongoing operation for an owner. A hosted subscription can follow if repeated use supports it. Keep hosting, mailbox connection reliability, and support as practical reasons to pay. Do not build billing or shared multi-customer infrastructure to test the first workflow.

Use “Engine” as the working name and MIT as the proposed license, both subject to confirmation. No licensing or publication action is part of this planning task.

## Role of the referenced tools

- **ECC:** its repository describes an engineering system for planning, implementation, review, and verification. Treat it as optional help for building Engine. The concept document's claims of rapid autonomous customer acquisition are not a validated product capability. Do not adopt network scraping or unapproved outreach. [ECC repository](https://github.com/affaan-m/ECC)
- **Matt Pocock's skills:** the repository includes question-driven planning and engineering workflows. Borrow the principle of asking clear questions before committing to a build; the owner should get a short guided form, not a developer skill interface. [Skills repository](https://github.com/mattpocock/skills)
- **Hyperframes and Brag:** these are video creation tools. Retain the references for later discussion; make neither a dependency of today's product. [Hyperframes](https://github.com/heygen-com/hyperframes), [Brag](https://github.com/latent-spaces/brag)

No framework installation is required to execute the MVP plan.

## Stack and integration decision

Working assumption: Next.js with TypeScript, Supabase Postgres/Auth, and server-side Claude drafting with prompts stored in `/prompts`. Use npm and a lockfile. Vercel is the proposed hosted target. The developer configures credentials; owners do not see API keys in daily use.

Start with CSV and copying. Google classifies `gmail.readonly` as restricted and `gmail.send` as sensitive; public use involves additional verification considerations. That makes Gmail a meaningful follow-on integration, rather than a prerequisite for validating the habit. [Google's scope documentation](https://developers.google.com/workspace/gmail/api/auth/scopes)

Google sign-in and access to Gmail are separate concerns: Supabase documents distinct Google provider tokens for accessing Google services. A successful login alone does not establish mailbox access. [Supabase Google auth documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)

For a local-only demo when hosted infrastructure is unavailable, SQLite is the charter-approved fallback. Choose one database for the build; do not implement both adapters today. A local SQLite build is not the Vercel deployment path.

## Validate before broadening

After the hackathon, invite 3–5 service founders from existing relationships to try the core loop for five working days. This is a proposed study; no invitations have been sent.

Proposed continuation criteria:

- At least three participants complete the queue on three separate days, including a busy day.
- A three-person session takes at most 15 minutes, and at least two of the three recommendations are judged appropriate.
- Drafts require no factual corrections; owners can edit tone freely.
- No unsupported contact enters the queue and no unapproved message is sent.
- Record replies and booked conversations as early observations, without attributing causality from such a small sample.
- Ask whether they would use it next week and pay for setup or hosting; test actual commitments before selecting pricing.

If selection is poor, improve relationship evidence and prioritization. If people use it but avoid copying, prioritize Gmail. If they need discovery or proposal support, investigate those modules next. Expand based on observed friction.
