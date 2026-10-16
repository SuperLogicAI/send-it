import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DAY,
  isTimestamp,
  localDay,
  parseContact,
  rankContacts,
} from "../lib/rules.ts";
import {
  addContact,
  allTouches,
  confirmSent,
  contacts,
  ensureDay,
  openStore,
  pendingTouch,
  recordOutcome,
  saveDraft,
  seedDemo,
  skip,
  snooze,
  today,
} from "../lib/store.ts";
import { parseCsv } from "../lib/csv.ts";

const now = new Date("2026-10-15T21:00:00.000Z");
const ago = (days: number) =>
  new Date(now.getTime() - days * DAY).toISOString();
let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}
const base = {
  name: "Example Person",
  email: "person@example.test",
  signal_source: "two_way",
  signal_evidence: "We discussed their website in a two-way discovery call.",
  signal_at: ago(90),
  last_two_way_at: ago(90),
};
function setup() {
  const db = openStore();
  seedDemo(db, now);
  return db;
}

check(
  "database rejects missing provenance, invalid sources, blank dates and orphan touches",
  () => {
    const db = openStore();
    for (const [source, evidence, date, twoWay] of [
      ["client", "", ago(90), null],
      ["scraped", "A description", ago(90), null],
      ["two_way", "A description", ago(90), null],
      ["two_way", "A description", "", ""],
      ["two_way", "A description", "not-a-date", "not-a-date"],
    ]) {
      assert.throws(() =>
        db
          .prepare(
            "INSERT INTO contacts(name,email,signal_source,signal_evidence,signal_at,last_two_way_at) VALUES('Test','test@example.test',?,?,?,?)",
          )
          .run(source, evidence, date, twoWay),
      );
    }
    db.prepare("INSERT INTO daily_runs(day) VALUES('2026-10-15')").run();
    assert.throws(() =>
      db
        .prepare(
          "INSERT INTO touches(contact_id,day,position,kind,reason) VALUES(999,'2026-10-15',0,'inbound','Test')",
        )
        .run(),
    );
    db.close();
  },
);

check(
  "input validation rejects impossible dates and normalizes addresses",
  () => {
    assert.throws(() =>
      parseContact({ ...base, signal_at: "2026-02-30" }, now),
    );
    assert.throws(() =>
      parseContact({ ...base, signal_at: "2026-10-99" }, now),
    );
    assert.equal(isTimestamp("2026-02-30T00:00:00.000Z"), false);
    assert.equal(
      parseContact({ ...base, email: " PERSON@EXAMPLE.TEST " }, now).email,
      "person@example.test",
    );
  },
);

check(
  "sample picks inbound, stalled quote and past client; excludes recent touch",
  () => {
    const db = setup();
    const state = today(db, now);
    assert.deepEqual(
      state.cards.map((c) => c.contact.name),
      ["Jordan Lee", "Alex Rivera", "Sam Patel"],
    );
    assert.deepEqual(
      state.cards.map((c) => c.kind),
      ["inbound", "quote_followup", "dormant"],
    );
    assert.ok(state.cards[1].reason.includes("Sep 30"));
    db.close();
  },
);

check("page data contains plain objects across the server/client boundary", () => {
  function assertPlain(value: unknown, path = "initial") {
    if (value === null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertPlain(item, `${path}[${index}]`));
      return;
    }
    assert.equal(
      Object.getPrototypeOf(value),
      Object.prototype,
      `${path} must be a plain object`,
    );
    for (const [key, item] of Object.entries(value))
      assertPlain(item, `${path}.${key}`);
  }
  for (const demo of [false, true]) {
    const db = demo ? setup() : openStore();
    try {
      const initial = {
        state: today(db, now),
        contacts: contacts(db),
        workspace: demo ? "demo" : "local",
      };
      assertPlain(initial);
      if (demo) {
        confirmSent(db, initial.state.cards[0].id, now);
        const state = today(db, now);
        assert.equal(state.history.length, 1);
        assertPlain({ ...initial, state, contacts: contacts(db) });
      }
    } finally {
      db.close();
    }
  }
});

check(
  "reloading preserves selection and edits, and skipping does not refill",
  () => {
    const db = setup();
    const original = today(db, now).cards;
    saveDraft(
      db,
      original[0].id,
      "Edited subject",
      "An owner-written message.",
      now,
    );
    assert.equal(today(db, now).cards[0].subject, "Edited subject");
    skip(db, original[0].id, now);
    assert.deepEqual(
      today(db, now).cards.map((c) => c.id),
      original.slice(1).map((c) => c.id),
    );
    assert.equal(allTouches(db, ensureDay(db, now)).length, 3);
    db.close();
  },
);

check(
  "busy week is a total target of one; restoring normal reveals saved cards",
  () => {
    const db = setup();
    db.prepare("UPDATE profile SET busy_week=1").run();
    const first = today(db, now).cards[0];
    assert.equal(today(db, now).cards.length, 1);
    confirmSent(db, first.id, now);
    assert.equal(today(db, now).cards.length, 0);
    db.prepare("UPDATE profile SET busy_week=0").run();
    assert.equal(today(db, now).cards.length, 2);
    db.close();
  },
);

check("empty days stay empty when new contacts are imported", () => {
  const db = openStore();
  assert.equal(today(db, now).cards.length, 0);
  addContact(db, parseContact(base, now));
  assert.equal(today(db, now).cards.length, 0);
  assert.equal(today(db, new Date(now.getTime() + DAY)).cards.length, 1);
  db.close();
});

check(
  "shared file connections do not create duplicate daily selections",
  () => {
    const dir = mkdtempSync(join(tmpdir(), "engine-check-"));
    try {
      const db = openStore(join(dir, "test.db"));
      seedDemo(db, now);
      const db2 = openStore(join(dir, "test.db"));
      ensureDay(db, now);
      ensureDay(db2, now);
      assert.equal(
        allTouches(db2, localDay(now, "Pacific/Honolulu")).length,
        3,
      );
      db2.close();
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

check("suppression and snooze stop saved-card handoffs immediately", () => {
  const db = setup();
  const [first, second] = today(db, now).cards;
  db.prepare("UPDATE contacts SET do_not_contact=1 WHERE id=?").run(
    first.contact_id,
  );
  assert.throws(() => pendingTouch(db, first.id, now));
  snooze(db, second.contact_id, "2027-01-15", now);
  assert.throws(() => pendingTouch(db, second.id, now));
  assert.equal(today(db, now).cards.length, 1);
  db.close();
});

check(
  "drafting and handoff validation do not count sends; confirmation is idempotent",
  () => {
    const db = setup(),
      first = today(db, now).cards[0];
    pendingTouch(db, first.id, now);
    saveDraft(db, first.id, first.subject, first.body, now);
    assert.equal(today(db, now).weeklyCount, 0);
    assert.equal(confirmSent(db, first.id, now), true);
    assert.equal(
      confirmSent(db, first.id, new Date(now.getTime() + 1000)),
      false,
    );
    assert.equal(today(db, now).weeklyCount, 1);
    assert.equal(today(db, now).history[0].sent_at, now.toISOString());
    db.close();
  },
);

check("a completed next step does not override spacing again tomorrow", () => {
  const db = openStore();
  addContact(
    db,
    parseContact(
      {
        ...base,
        last_outbound_at: ago(3),
        next_step: "send the case study",
        next_step_at: "2026-10-14",
      },
      now,
    ),
  );
  const touch = today(db, now).cards[0];
  assert.equal(touch.kind, "next_step_due");
  saveDraft(
    db,
    touch.id,
    "The case study",
    "Here's the case study we discussed.",
    now,
  );
  confirmSent(db, touch.id, now);
  assert.equal(contacts(db)[0].next_step, null);
  assert.equal(today(db, new Date(now.getTime() + DAY)).cards.length, 0);
  db.close();
});

check(
  "confirmation preserves a newer next step entered after selection",
  () => {
    const db = openStore();
    const id = addContact(
      db,
      parseContact(
        {
          ...base,
          next_step: "send the case study",
          next_step_at: "2026-10-14",
        },
        now,
      ),
    );
    const touch = today(db, now).cards[0];
    saveDraft(db, touch.id, "A note", "Owner message", now);
    db.prepare(
      "UPDATE contacts SET next_step='review the proposal',next_step_at='2026-11-01' WHERE id=?",
    ).run(id);
    confirmSent(db, touch.id, now);
    assert.equal(contacts(db)[0].next_step_at, "2026-11-01");
    db.close();
  },
);

check("booking alone does not manufacture a two-way exchange", () => {
  const db = setup(),
    touch = today(db, now).cards[0];
  confirmSent(db, touch.id, now);
  recordOutcome(
    db,
    touch.id,
    "booked",
    now.toISOString(),
    "prepare for the meeting",
    "2026-10-22",
    now,
  );
  assert.equal(
    contacts(db).find((c) => c.id === touch.contact_id)!.last_two_way_at,
    null,
  );
  db.close();
});

check(
  "a logged reply records its event date and rejects events before the send",
  () => {
    const db = setup(),
      touch = today(db, now).cards[0];
    confirmSent(db, touch.id, now);
    assert.throws(() =>
      recordOutcome(db, touch.id, "replied", ago(1), "", "", now),
    );
    const later = new Date(now.getTime() + 3600000);
    recordOutcome(db, touch.id, "replied", later.toISOString(), "", "", later);
    assert.equal(
      contacts(db).find((c) => c.id === touch.contact_id)!.last_two_way_at,
      later.toISOString(),
    );
    db.close();
  },
);

check(
  "Hawaii day rollover and the trailing seven local dates are correct",
  () => {
    assert.equal(
      localDay(new Date("2026-10-16T09:59:59Z"), "Pacific/Honolulu"),
      "2026-10-15",
    );
    assert.equal(
      localDay(new Date("2026-10-16T10:00:00Z"), "Pacific/Honolulu"),
      "2026-10-16",
    );
    const db = setup(),
      touch = today(db, now).cards[0];
    confirmSent(db, touch.id, now);
    assert.equal(today(db, new Date(now.getTime() + 6 * DAY)).weeklyCount, 1);
    assert.equal(today(db, new Date(now.getTime() + 7 * DAY)).weeklyCount, 0);
    db.close();
  },
);

check(
  "old imports retain their real dates; lost relationships remain excluded",
  () => {
    const db = openStore();
    addContact(db, parseContact({ ...base, stage: "lost" }, now));
    assert.equal(contacts(db)[0].signal_at, ago(90));
    assert.equal(rankContacts(contacts(db), now, "Pacific/Honolulu").length, 0);
    db.close();
  },
);

check("snoozing a busy-day card does not reveal a hidden replacement", () => {
  const db = setup();
  db.prepare("UPDATE profile SET busy_week=1").run();
  const touch = today(db, now).cards[0];
  snooze(db, touch.contact_id, "2026-11-15", now);
  assert.equal(today(db, now).cards.length, 0);
  db.close();
});

check("CSV handles quoted commas, escaped quotes and multiline notes", () => {
  const [row] = parseCsv(
    'name,email,signal_evidence\r\n"Alex, Jr.",alex@example.test,"We discussed ""booking""\non a call."\r\n',
  );
  assert.equal(row.name, "Alex, Jr.");
  assert.equal(row.signal_evidence, 'We discussed "booking"\non a call.');
  assert.throws(() => parseCsv('name,email\n"Unclosed,test@example.test'));
  assert.throws(() => parseCsv("name,name\nAlex,Alex"));
  assert.throws(() => parseCsv("name,email\nAlex,test@example.test,extra"));
});

if (process.argv.includes("--built-route")) {
  // Match the normal Next server bootstrap without opening a listening port.
  Object.assign(globalThis, { AsyncLocalStorage });
  const { NextRequest } = await import("next/server.js");
  const routeUrl = new URL(
    "../.next/server/app/api/engine/route.js",
    import.meta.url,
  ).href;
  const built = (await import(routeUrl)) as {
    default: {
      routeModule: {
        userland: { POST: (request: Request) => Promise<Response> };
      };
    };
  };
  const handler = built.default.routeModule.userland.POST;
  const oldCwd = process.cwd(),
    dir = mkdtempSync(join(tmpdir(), "engine-route-check-"));
  const invoke = async (
    body: Record<string, unknown>,
    mode = "demo",
    origin = "http://127.0.0.1:3000",
  ) => {
    const response = await handler(
      new NextRequest("http://127.0.0.1:3000/api/engine", {
        method: "POST",
        headers: {
          origin,
          host: "127.0.0.1:3000",
          "content-type": "application/json",
          cookie: `engine-workspace=${mode}`,
        },
        body: JSON.stringify(body),
      }),
    );
    return { status: response.status, data: await response.json() };
  };
  try {
    process.chdir(dir);
    assert.equal(
      (
        await invoke(
          { action: "busy", enabled: true },
          "demo",
          "https://example.test",
        )
      ).status,
      403,
    );
    assert.equal(
      (await invoke({ action: "busy", enabled: true }, "demo", "malformed"))
        .status,
      403,
    );
    const loaded = await invoke({ action: "workspace", workspace: "demo" });
    assert.equal(loaded.status, 200);
    assert.equal(loaded.data.state.cards.length, 3);
    const first = loaded.data.state.cards[0];
    const subject = "A question & next step — café",
      body = "Hi Jordan,\n\nA note with commas, ampersands & real context.";
    const handed = await invoke({
      action: "handoff",
      id: first.id,
      subject,
      body,
    });
    assert.equal(handed.status, 200);
    assert.equal(handed.data.state.weeklyCount, 0);
    const compose = new URL(handed.data.url);
    assert.equal(compose.hostname, "mail.google.com");
    assert.equal(compose.searchParams.get("su"), subject);
    assert.equal(compose.searchParams.get("body"), body);
    assert.equal(
      (await invoke({ action: "sent", id: first.id, subject, body })).data.state
        .weeklyCount,
      1,
    );
    assert.equal(
      (await invoke({ action: "sent", id: first.id, subject, body })).data.state
        .weeklyCount,
      1,
    );
    const local = await invoke({ action: "workspace", workspace: "local" });
    assert.equal(local.data.contacts.length, 0);
    const csv =
      'name,email,signal_source,signal_evidence,signal_at\nFictional Import,import@example.test,inbound,"Asked about a booking site",2026-01-01\nMissing Evidence,bad@example.test,inbound,,2026-01-01\n';
    const preview = await invoke({ action: "preview", csv }, "local");
    assert.equal(preview.data.accepted, 1);
    assert.equal(preview.data.contacts.length, 0);
    const imported = await invoke({ action: "import", csv }, "local");
    assert.equal(imported.data.contacts.length, 1);
    assert.equal(
      (await invoke({ action: "import", csv }, "local")).data.accepted,
      0,
    );
    assert.equal(
      (await invoke({ action: "prepare" }, "local")).data.state.cards.length,
      1,
    );
    passed++;
    console.log(
      "✓ compiled Next route: origin checks, SQLite, Gmail encoding, confirmation, separate workspaces and CSV import",
    );
  } finally {
    const shared = globalThis as typeof globalThis & {
      engineStores?: Map<string, ReturnType<typeof openStore>>;
    };
    for (const [path, db] of shared.engineStores ?? []) {
      if (path.startsWith(dir)) {
        db.close();
        shared.engineStores!.delete(path);
      }
    }
    process.chdir(oldCwd);
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(
  `\n${passed} checks passed. No real contacts or email services were used.`,
);
