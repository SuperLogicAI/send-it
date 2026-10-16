import type { Contact } from "./rules.ts";
import type { Profile } from "./store.ts";

// Pure and browser-safe: the click handler builds the prompt synchronously so
// Safari's clipboard and pop-up rules are satisfied. Instructions live in
// prompts/draft.md; this file only arranges data around them.

// A closing tag inside pasted data must not end the untrusted block early.
const clean = (v: string | null | undefined) =>
  (v ?? "").trim().replaceAll("</", "‹/") || "(not provided)";
const day = (v: string | null) => (v ? v.slice(0, 10) : "(none recorded)");

export function buildPrompt(
  instructions: string,
  profile: Pick<
    Profile,
    | "what_you_do"
    | "best_clients"
    | "result_they_want"
    | "voice_sample"
    | "never_say"
  >,
  touch: { reason: string; contact: Contact },
) {
  const c = touch.contact;
  return `${instructions.trim()}

<business_facts>
What I do: ${clean(profile.what_you_do)}
Best clients: ${clean(profile.best_clients)}
Result they want: ${clean(profile.result_they_want)}
Never say: ${clean(profile.never_say)}
Voice sample:
${clean(profile.voice_sample)}
</business_facts>

<contact>
Name: ${clean(c.name)}
How I know them: ${c.signal_source}
Shared context: ${clean(c.signal_evidence)}
Context recorded: ${day(c.signal_at)}
Last two-way exchange: ${day(c.last_two_way_at)}
Last message from them: ${day(c.last_inbound_at)}
Last message from me: ${day(c.last_outbound_at)}
Quote sent: ${day(c.quote_sent_at)}
Next step: ${c.next_step ? `${clean(c.next_step)} (${day(c.next_step_at)})` : "(none)"}
Why they are on today's list: ${clean(touch.reason)}
</contact>`;
}

// Chat apps answer in plain text. A leading "Subject:" line becomes the subject.
export function parseReply(text: string): { subject: string; body: string } {
  const m = text.match(/^\s*Subject:[ \t]*(.*)(?:\r?\n|$)/i);
  if (!m) return { subject: "", body: text };
  return {
    subject: m[1].trim().slice(0, 200),
    body: text.slice(m[0].length).trim(),
  };
}
