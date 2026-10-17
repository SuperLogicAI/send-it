import assert from "node:assert/strict";
import type { Payload, Workspace } from "../lib/actions.ts";

// One end-to-end owner journey. check.ts runs it against an in-memory Node
// store; check-workers.ts runs it against the real Durable Object.
export type Call = (
  mode: Workspace,
  input: Record<string, unknown>,
) => Promise<Payload>;

export async function scenario(call: Call) {
  // The browser reports its timezone first; nothing is listed before that.
  const unset = await call("demo", { action: "workspace", workspace: "demo" });
  assert.equal(unset.state.cards.length, 0);
  const tz = { action: "timezone", timezone: "Pacific/Honolulu" };
  const loaded = await call("demo", tz);
  assert.equal(loaded.state.cards.length, 3);
  const first = loaded.state.cards[0];
  const subject = "A question & next step — café",
    body = "Hi Jordan,\n\nA note with commas, ampersands & real context.";
  const handed = await call("demo", {
    action: "handoff",
    id: first.id,
    subject,
    body,
  });
  const base = loaded.state.weeklyCount;
  const { streak } = loaded.state;
  assert.equal(streak.streak, 4, "the demo shows a sample streak");
  assert.ok(loaded.state.badges.find((b) => b.id === "first_send")!.earned);
  assert.equal(handed.state.weeklyCount, base, "a handoff is not a send");
  const compose = new URL(handed.url!);
  assert.equal(compose.hostname, "mail.google.com");
  assert.equal(compose.searchParams.get("su"), subject);
  assert.equal(compose.searchParams.get("body"), body);
  const sent = { action: "sent", id: first.id, subject, body };
  assert.equal((await call("demo", sent)).state.weeklyCount, base + 1);
  assert.equal(
    (await call("demo", sent)).state.weeklyCount,
    base + 1,
    "confirming twice counts once",
  );
  const after = (await call("demo", sent)).state.streak;
  assert.equal(
    after.streak,
    streak.workdayToday ? 5 : 4,
    "today's send extends the streak on a workday, not on a weekend",
  );
  assert.equal(after.todayDone, true);
  await call("local", { action: "workspace", workspace: "local" });
  const local = await call("local", tz);
  assert.equal(local.contacts.length, 0);
  const csv =
    'name,email,signal_source,signal_evidence,signal_at\nFictional Import,import@example.test,inbound,"Asked about a booking site",2026-01-01\nMissing Evidence,bad@example.test,inbound,,2026-01-01\n';
  const preview = await call("local", { action: "preview", csv });
  assert.equal(preview.accepted, 1);
  assert.equal(preview.contacts.length, 0);
  const imported = await call("local", { action: "import", csv });
  assert.equal(imported.contacts.length, 1);
  assert.equal(imported.state.cards.length, 1, "imports fill today's list");
  assert.equal((await call("local", { action: "import", csv })).accepted, 0);
}
