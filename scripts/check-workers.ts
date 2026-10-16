import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unstable_startWorker } from "wrangler";
import type { Payload, Workspace } from "../lib/actions.ts";
import { scenario } from "./scenario.ts";

// Runs the real OwnerStore in local workerd. Replaces --built-route.
const dir = mkdtempSync(join(tmpdir(), "send-it-workers-"));
// Fixed default ports (8787) are often taken locally, which hangs startup.
const freePort = () =>
  new Promise<number>((resolve) => {
    const server = createServer().listen(0, () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
const worker = await unstable_startWorker({
  config: "scripts/store-test/wrangler.jsonc",
  dev: {
    persist: dir,
    server: { port: await freePort() },
    inspector: { port: await freePort() },
  },
});
let passed = 0;
const run = Math.random().toString(36).slice(2, 8);
async function rpc(key: string, method: string, ...args: unknown[]) {
  const response = await worker.fetch(
    `http://example.test/?key=${encodeURIComponent(key)}`,
    { method: "POST", body: JSON.stringify({ method, args }) },
  );
  const data = (await response.json()) as { ok?: unknown; error?: string };
  if (data.error !== undefined) throw new Error(data.error);
  return data.ok;
}
const owner = (name: string, mode: Workspace = "local") =>
  `${mode === "demo" ? "demo" : "owner"}:${name}-${run}@example.test`;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`✓ ${name}`);
}

try {
  await worker.ready;
  await check("owner journey on the Durable Object", () =>
    scenario(
      async (mode, input) =>
        (await rpc(owner("journey", mode), "act", mode, input)) as Payload,
    ),
  );

  await check("owner B cannot see owner A's contacts", async () => {
    const csv =
      'name,email,signal_source,signal_evidence,signal_at\nIsolated Person,iso@example.test,inbound,"Asked about a booking site",2026-01-01\n';
    const a = (await rpc(owner("a"), "act", "local", {
      action: "import",
      csv,
    })) as Payload;
    assert.equal(a.contacts.length, 1);
    const again = (await rpc(owner("a"), "view", "local")) as Payload;
    assert.equal(again.contacts.length, 1);
    const b = (await rpc(owner("b"), "view", "local")) as Payload;
    assert.equal(b.contacts.length, 0);
    const bd = (await rpc(owner("b", "demo"), "view", "demo")) as Payload;
    assert.notEqual(bd.contacts.length, 1, "demo workspace is separate");
  });

  await check("database CHECKs and foreign keys hold inside the Durable Object", async () => {
    const key = owner("checks");
    const insert = (email: string, source: string, evidence: string, at: string, twoWay: string | null, next = "2026-10-20") =>
      rpc(
        key,
        "sql",
        "INSERT INTO contacts(name,email,signal_source,signal_evidence,signal_at,last_two_way_at,next_step,next_step_at) VALUES('Test',?,?,?,?,?,'Call',?)",
        email, source, evidence, at, twoWay, next,
      );
    const good = "2026-10-01T00:00:00.000Z";
    const text = "A two-way discovery call.";
    for (const bad of [
      () => insert("a@example.test", "scraped", text, good, good),
      () => insert("a@example.test", "client", "", good, good),
      () => insert("a@example.test", "two_way", text, good, null),
      () => insert("nope", "two_way", text, good, good),
      () => insert("a@example.test", "two_way", text, "2026-02-30T00:00:00.000Z", good),
      () => insert("a@example.test", "two_way", text, good, good, "2026-02-30"),
      () => rpc(key, "sql", "INSERT INTO touches(contact_id,day,position,kind,reason) VALUES(999,'2026-10-15',0,'inbound','x')"),
    ])
      await assert.rejects(bad);
    await insert("a@example.test", "two_way", text, good, good);
    assert.deepEqual(await rpc(key, "sql", "SELECT count(*) AS n FROM contacts"), [{ n: 1 }]);
  });

  await check("a failed transaction rolls back", async () => {
    assert.deepEqual(await rpc(owner("rollback"), "rollbackProbe"), { n: 0 });
  });

  console.log(`\n${passed} Workers checks passed. No real contacts or email services were used.`);
} finally {
  await worker.dispose();
  rmSync(dir, { recursive: true, force: true });
}
