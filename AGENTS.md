# CLAUDE.md — engine by Super Logic AI

> An open-source sales engine for solo founders and lean teams that keeps the pipeline moving while the owner is busy delivering. It does this without a single cold email.

---

## 1. The problem we're solving

Solo founders and lean teams run a **boom/bust sales cycle**:

1. Pipeline is empty, so they sell hard.
2. Deals close, so they go heads-down delivering.
3. Selling stops during delivery.
4. Delivery ends and the pipeline is empty again. Back to step 1.

The usual fix is cold outbound: bought lists, warmed domains, inbox rotation, sequences. It's saturated and it damages trust. It also burns the founder's reputation in a market they will have to keep selling into.

**Our thesis:** for lean teams the money is already sitting in warm signal they aren't working. That means past conversations, stalled deals, event attendees, inbound inquiries, referral sources, and past clients. The fix is a small, steady habit of human-approved touches to people who already know you. The habit has to survive delivery weeks.

This maps to the **Grow** pillar of Logic.IO.

---

## 2. Non-negotiable pillars

These are product rules. Any feature, PR, or suggestion that violates one is wrong by definition. Flag it; don't build it.

### Pillar 1 — No cold email. Ever.
Every outbound touch must trace to a **provenance signal**: a recorded reason this person has a relationship with or opted in to the sender.

**Allowed signal sources:**
- Prior two-way exchange: email thread, call, meeting, or DM where *both* sides spoke
- Inbound inquiry: form, call, booking, or chat started by the contact
- Event registration or attendance
- Referral where the introducer made the connection or explicitly consented to the name-drop
- Past or current client
- Opt-in subscriber, such as a newsletter or lead magnet download

**Forbidden, and never to be built, suggested, or "made optional":**
- Purchased, scraped, or enriched-to-email lead lists
- First-touch email messages to anyone without a provenance signal
- Deliverability tooling: domain warming, inbox rotation, send throttling to dodge filters. **If a feature needs deliverability tricks, it's cold. Stop.**
- Fake personalization, such as templated "saw your post about X" lines

**Enforcement in code:** every contact record carries `signal_source` and `signal_evidence`, plus `last_two_way_at` where applicable. A contact with no provenance **cannot enter the send queue**. Enforce this at the schema and queue layer, not just in the UI.

### Pillar 2 — Sell while delivering
The product's job is to keep a **pipeline floor** during busy weeks.
- A daily queue of a small number of drafted touches (default 3–5), finishable in **≤15 minutes**
- **Delivery mode:** when the owner's calendar or workload is heavy, the queue shrinks to the floor (default 1–2/day) but **never drops to zero**
- A visible **pipeline health / floor meter** so the owner sees a bust coming weeks before it lands

### Pillar 3 — Human approves every send
The tool drafts, prioritizes, and queues. The owner approves, edits, or skips. **Nothing sends without an explicit human approval.** Sends go from the owner's own account, under their own name, at human volume.

### Pillar 4 — Built for non-technical owners
The day-to-day user is a **non-technical business owner**.
- No terminal, no API keys, and no workflow editors in the daily experience
- Plain-language copy everywhere. No "sequences," "enrichment," "ICP," or "cadence" in the UI.
- Opinionated defaults. Settings only where the owner genuinely differs.
- The daily touchpoint should feel like **"here are today's 3 people, tap to send,"** not a CRM

### Pillar 5 — Radical transparency (open source)
This is a public Super Logic AI repo. The code, prompts, and logic are all visible. Trust and reach are the moat, not secrecy. Write it so a curious owner or developer can read it and understand *why* each person was picked for today.

---

## 3. Known tension: open source vs. non-technical user

An open-source repo is natively a developer artifact. Our user is not a developer.

**Default resolution (adjust if needed):**
- The **repo** is the engine, and it's built so setup can be done *for* the owner.
- The **owner** only ever touches a simple web UI and/or a daily email/SMS digest with approve buttons.
- **Setup path:** a guided setup flow (connect Google account, then answer about 5 plain questions), plus a Super Logic AI done-for-you install as the paid path. This is the open-source-as-lead-magnet model.
- One-click deploy (e.g., Vercel button) for the technical-founder audience. It's secondary, not the design target.

---

## 4. Core loop (MVP)

```
Signals in  →  Provenance check  →  Prioritize  →  Draft  →  Owner approves  →  Send from own account  →  Log outcome
```

1. **Ingest signals.** Gmail threads, Google Calendar meetings, CSV import (event registrants, past clients), and manual add (with a required "how do you know them?").
2. **Provenance check.** No signal means not eligible. Store the evidence.
3. **Prioritize** today's people. Examples: stalled deals, warm contacts quiet for more than 60 days, recent inbound not followed up, event attendees with no next step, referral sources due for a thank-you or ask.
4. **Draft** a short, specific message per person that references the *real* shared context from the signal evidence. No templates pretending to be personal.
5. **Approve / edit / skip.** One tap each.
6. **Send** via the owner's own Gmail.
7. **Log** the outcome: replied, booked, no response, or not now. The outcome feeds the next prioritization.

### Touch types (initial set)
- Check-in with a dormant warm contact
- Follow-up on a stalled proposal or quote
- Event follow-up (attended or registered but no-show)
- Referral thank-you / referral ask
- Past-client check-in (reviews, expansions, referrals)

---

## 5. Hackathon scope (today)

**Demo goal:** an owner connects their account and sees "today's 3 people." Each person has a reason, a drafted message, and an approve button. A pipeline floor meter shows on screen.

**In scope today:**
- Single user, single business
- Gmail and Calendar read, or **CSV import as a fallback** if OAuth eats the day
- Provenance-enforced contact model
- Prioritization v0 (simple rules, not ML)
- Claude-drafted messages grounded in signal evidence
- Approve → send (or "copy to clipboard" fallback for the demo)
- Floor meter + delivery mode toggle (manual toggle is fine for v0)

**Out of scope today:** multi-tenant, billing, team/SDR handoffs, Attio/HubSpot sync, SMS, analytics dashboards, VSL generator (see §7).

---

## 6. Proposed stack (confirm at session start)

- **App:** Next.js (TypeScript) on Vercel
- **DB/Auth:** Supabase (Postgres + Google OAuth); SQLite acceptable for a local-only demo
- **LLM:** Claude API for drafting and prioritization reasoning; prompts live in `/prompts` as plain files (transparency)
- **Integrations v0:** Gmail API, Google Calendar API, CSV import
- **Later:** Attio, HubSpot, Outlook/M365, n8n templates for technical users
- **License:** MIT (default; confirm)

Secrets live only in env vars. Never commit keys. Never log message bodies or contact data to third-party services beyond the LLM call itself.

---

## 7. Planned module: VSL generator

Josh will provide full context in a later session. Until then:
- Treat this as a **separate module**, not part of the MVP loop
- It must respect the same pillars: the VSL goes to warm or opted-in audiences, the owner reviews before anything is published or sent, and copy is in plain language
- Don't scaffold or speculate on its design until that context is provided

---

## 8. Working rules for Claude in this repo

- **Run the pillar check first.** Before adding any outbound or contact-sourcing feature, state in one line which provenance signals it relies on. If the answer is "none," don't build it.
- **Write for the owner, not a sales ops person.** If UI copy needs jargon, rewrite it.
- **Explain the "why."** Every prioritized person shows a human-readable reason ("You last talked Aug 12 about the booking site; no reply since your quote").
- **Use small, demo-able increments.** Today is a hackathon, so working end-to-end beats polished halves.
- **Use opinionated defaults.** Pick a sensible default and note it rather than adding a setting.
- **Keep prompts in files.** No buried prompt strings in components.
- **No auto-send code paths.** Not even behind a flag, not even for testing. Use a dry-run mode instead.

---

## 9. Open decisions

- [ ] Product name
- [ ] Daily touchpoint: web UI first, or daily email/SMS digest with approve links first?
- [ ] How "delivery mode" is detected: manual toggle (v0) vs. calendar load heuristic
- [ ] Pipeline floor definition: touches/week, open conversations, or booked calls?
- [ ] License confirmation (MIT default)
- [ ] VSL generator scope (pending Josh's context)
