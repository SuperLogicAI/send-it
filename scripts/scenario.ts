import assert from "node:assert/strict";
import type { Payload, Workspace } from "../lib/actions.ts";

// One end-to-end owner journey. check.ts runs it against an in-memory Node
// store; check-workers.ts runs it against the real Durable Object.
export type Call = (
  mode: Workspace,
  input: Record<string, unknown>,
) => Promise<Payload>;

export async function scenario(call: Call) {
  const loaded = await call("demo", { action: "workspace", workspace: "demo" });
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
  assert.equal(handed.state.weeklyCount, 0, "a handoff is not a send");
  const compose = new URL(handed.url!);
  assert.equal(compose.hostname, "mail.google.com");
  assert.equal(compose.searchParams.get("su"), subject);
  assert.equal(compose.searchParams.get("body"), body);
  const sent = { action: "sent", id: first.id, subject, body };
  assert.equal((await call("demo", sent)).state.weeklyCount, 1);
  assert.equal(
    (await call("demo", sent)).state.weeklyCount,
    1,
    "confirming twice counts once",
  );
  const local = await call("local", { action: "workspace", workspace: "local" });
  assert.equal(local.contacts.length, 0);
  const csv =
    'name,email,signal_source,signal_evidence,signal_at\nFictional Import,import@example.test,inbound,"Asked about a booking site",2026-01-01\nMissing Evidence,bad@example.test,inbound,,2026-01-01\n';
  const preview = await call("local", { action: "preview", csv });
  assert.equal(preview.accepted, 1);
  assert.equal(preview.contacts.length, 0);
  const imported = await call("local", { action: "import", csv });
  assert.equal(imported.contacts.length, 1);
  assert.equal((await call("local", { action: "import", csv })).accepted, 0);
  assert.equal(
    (await call("local", { action: "prepare" })).state.cards.length,
    1,
  );
}
