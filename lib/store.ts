import {
  emailValid,
  isDay,
  isTimestamp,
  localDay,
  parseContact,
  pickReason,
  rankContacts,
  shiftDay,
  type Contact,
  type ContactInput,
  type Kind,
} from "./rules.ts";
import { badges, isWorkday, replayStreak } from "./streak.ts";
import { TOUCHES } from "./schema.ts";

export type Profile = {
  owner_email: string;
  what_you_do: string;
  best_clients: string;
  result_they_want: string;
  voice_sample: string;
  never_say: string;
  timezone: string;
  // True until the browser reports the owner's timezone (see setTimezone).
  timezone_unset: boolean;
  busy_week: number;
  demo: number;
};
export type Touch = {
  id: number;
  contact_id: number;
  day: string;
  position: number;
  kind: Kind;
  reason: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "skipped";
  sent_at: string | null;
  next_step_snapshot: string | null;
  next_step_at_snapshot: string | null;
  outcome: string | null;
  contact: Contact;
};

// What the data functions need from SQLite. node:sqlite (tests) and the
// Durable Object (production) both satisfy it; `transaction` is optional
// because node:sqlite has none and uses BEGIN IMMEDIATE instead.
type Row = Record<string, unknown>;
export type Store = {
  prepare(q: string): {
    run(...a: unknown[]): unknown;
    get(...a: unknown[]): Row | undefined;
    all(...a: unknown[]): Row[];
  };
  exec(q: string): unknown;
  transaction?<T>(fn: () => T): T;
};
export function profile(db: Store): Profile {
  // node:sqlite returns null-prototype rows. Copy them into plain objects
  // before they reach React's Server Component serialization boundary.
  const row = db.prepare("SELECT * FROM profile WHERE id=1").get()!;
  return {
    ...row,
    timezone: row.timezone || "UTC",
    timezone_unset: !row.timezone,
  } as unknown as Profile;
}
export function contacts(db: Store): Contact[] {
  return db
    .prepare("SELECT * FROM contacts ORDER BY name,id")
    .all()
    .map((row) => ({ ...row })) as unknown as Contact[];
}
export function addContact(db: Store, input: ContactInput): number {
  const keys = Object.keys(input) as (keyof ContactInput)[];
  // The input contract is constructed by parseContact, never arbitrary request keys.
  const allowed = [
    "name",
    "email",
    "signal_source",
    "signal_evidence",
    "signal_at",
    "last_two_way_at",
    "last_inbound_at",
    "last_outbound_at",
    "quote_sent_at",
    "stage",
    "next_step",
    "next_step_at",
    "not_now_until",
    "do_not_contact",
  ];
  if (keys.length !== allowed.length || keys.some((k) => !allowed.includes(k)))
    throw new Error("Invalid contact fields.");
  const row = db
    .prepare(
      `INSERT INTO contacts(${keys.join(",")}) VALUES(${keys.map(() => "?").join(",")}) RETURNING id`,
    )
    .get(...keys.map((k) => input[k]));
  return Number(row!.id);
}

export function transaction<T>(db: Store, fn: () => T): T {
  if (db.transaction) return db.transaction(fn);
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// Runs once per store open. SQLite can't alter a CHECK, so an older touches
// table is rebuilt with the current kinds. Profiles that were never saved
// lose the old Honolulu default, so the browser's timezone is used instead.
export function migrate(db: Store) {
  const table = db
    .prepare("SELECT sql FROM sqlite_master WHERE name='touches'")
    .get();
  if (String(table?.sql).includes("event_followup")) return;
  transaction(db, () => {
    db.exec(`CREATE TABLE touches_next (${TOUCHES});
      INSERT INTO touches_next SELECT * FROM touches;
      DROP TABLE touches;
      ALTER TABLE touches_next RENAME TO touches;
      UPDATE profile SET timezone='' WHERE timezone='Pacific/Honolulu' AND owner_email='' AND what_you_do='';`);
  });
}

export function setTimezone(db: Store, timezone: string) {
  try {
    localDay(new Date(), timezone);
  } catch {
    throw new Error("Choose a valid timezone, such as Pacific/Honolulu.");
  }
  db.prepare("UPDATE profile SET timezone=? WHERE id=1 AND timezone=''").run(
    timezone,
  );
}

export function ensureDay(db: Store, now = new Date()): string {
  const prefs = profile(db),
    day = localDay(now, prefs.timezone);
  // No list until the browser reports the timezone, so a first visit can't
  // save one under the wrong date.
  if (prefs.timezone_unset) return day;
  return transaction(db, () => {
    db.prepare("INSERT OR IGNORE INTO daily_runs(day) VALUES(?)").run(day);
    // Fill open slots up to three, the same day. Sent, skipped and
    // suppressed cards keep their slot, so nobody is swapped in for them.
    const taken = db
      .prepare("SELECT contact_id,position FROM touches WHERE day=?")
      .all(day);
    if (taken.length >= 3) return day;
    const ids = new Set(taken.map((t) => Number(t.contact_id)));
    let position = Math.max(-1, ...taken.map((t) => Number(t.position))) + 1;
    rankContacts(contacts(db), now, prefs.timezone)
      .filter((pick) => !ids.has(pick.contact.id))
      .slice(0, 3 - taken.length)
      .forEach((pick) => {
        const c = pick.contact;
        db.prepare(
          `INSERT INTO touches(contact_id,day,position,kind,reason,next_step_snapshot,next_step_at_snapshot) VALUES(?,?,?,?,?,?,?)`,
        ).run(
          c.id,
          day,
          position++,
          pick.kind,
          pick.reason,
          c.next_step,
          c.next_step_at,
        );
      });
    return day;
  });
}

export function allTouches(db: Store, day: string): Touch[] {
  const map = new Map(contacts(db).map((c) => [c.id, c]));
  return (
    db
      .prepare("SELECT * FROM touches WHERE day=? ORDER BY position")
      .all(day) as unknown as Omit<Touch, "contact">[]
  ).map((t) => ({ ...t, contact: map.get(t.contact_id)! }));
}

export function today(db: Store, now = new Date()) {
  const prefs = profile(db),
    day = ensureDay(db, now),
    all = allTouches(db, day);
  const handled = all.filter((t) => t.status !== "queued").length;
  const target = prefs.busy_week ? 1 : 3;
  // Choose the reserved slots before rechecking eligibility. A suppressed card
  // must not silently reveal another reserved person during a busy day.
  const pending = all
    .filter((t) => t.status === "queued")
    .slice(0, Math.max(0, target - handled))
    .filter((t) => pickReason(t.contact, now, prefs.timezone));
  const sentDays = (
    db.prepare("SELECT sent_at FROM touches WHERE status='sent'").all() as {
      sent_at: string;
    }[]
  ).map((t) => localDay(new Date(t.sent_at), prefs.timezone));
  const count = sentDays.filter(
    (d) => d >= shiftDay(day, -6) && d <= day,
  ).length;
  const replies = Number(
    db
      .prepare(
        "SELECT count(*) AS n FROM touches WHERE outcome IN ('replied','booked')",
      )
      .get()!.n,
  );
  const streak = replayStreak(sentDays, day);
  return {
    profile: prefs,
    day,
    target,
    handled,
    cards: pending,
    history: all.filter((t) => t.status === "sent"),
    weeklyCount: count,
    streak,
    badges: badges(streak, sentDays.length, replies),
    totalContacts: contacts(db).length,
  };
}

export function pendingTouch(db: Store, id: number, now = new Date()): Touch {
  const touch = today(db, now).cards.find((t) => t.id === id);
  if (!touch)
    throw new Error(
      "This person is no longer in your remaining list. Refresh to see today's people.",
    );
  return touch;
}

export function saveDraft(
  db: Store,
  id: number,
  subject: string,
  body: string,
  now = new Date(),
) {
  const touch = pendingTouch(db, id, now);
  if (subject.length > 200 || body.length > 6000 || /[\r\n]/.test(subject))
    throw new Error(
      "Use a one-line subject and a message under 6,000 characters.",
    );
  db.prepare(
    "UPDATE touches SET subject=?,body=? WHERE id=? AND status='queued'",
  ).run(subject, body, touch.id);
  return { ...touch, subject, body };
}

export function confirmSent(db: Store, id: number, now = new Date()) {
  return transaction(db, () => {
    const touch = db
      .prepare("SELECT * FROM touches WHERE id=?")
      .get(id) as unknown as Touch | undefined;
    if (!touch) throw new Error("That follow-up was not found.");
    if (touch.status === "sent") return false;
    if (
      touch.status !== "queued" ||
      !touch.subject.trim() ||
      !touch.body.trim()
    )
      throw new Error("Save your message before confirming that you sent it.");
    db.prepare(
      "UPDATE touches SET status='sent',sent_at=? WHERE id=? AND status='queued'",
    ).run(now.toISOString(), id);
    db.prepare("UPDATE contacts SET last_outbound_at=? WHERE id=?").run(
      now.toISOString(),
      touch.contact_id,
    );
    if (touch.next_step_snapshot && touch.next_step_at_snapshot) {
      db.prepare(
        "UPDATE contacts SET next_step=NULL,next_step_at=NULL WHERE id=? AND next_step=? AND next_step_at=?",
      ).run(
        touch.contact_id,
        touch.next_step_snapshot,
        touch.next_step_at_snapshot,
      );
    }
    return true;
  });
}

export function skip(db: Store, id: number, now = new Date()) {
  pendingTouch(db, id, now);
  db.prepare(
    "UPDATE touches SET status='skipped' WHERE id=? AND status='queued'",
  ).run(id);
}

export function snooze(
  db: Store,
  contactId: number,
  until: string,
  now = new Date(),
) {
  if (!isDay(until) || until <= localDay(now, profile(db).timezone))
    throw new Error("Choose a future date to check back.");
  db.prepare("UPDATE contacts SET not_now_until=? WHERE id=?").run(
    until,
    contactId,
  );
}

export function saveProfile(db: Store, raw: Record<string, unknown>) {
  const text = (key: string) =>
    String(raw[key] ?? "")
      .trim()
      .slice(0, 2000);
  const email = text("owner_email").toLowerCase();
  if (email && !emailValid(email))
    throw new Error("Add a valid sending email address.");
  const timezone = text("timezone") || "UTC";
  try {
    localDay(new Date(), timezone);
  } catch {
    throw new Error("Choose a valid timezone, such as Pacific/Honolulu.");
  }
  db.prepare(
    "UPDATE profile SET owner_email=?,what_you_do=?,best_clients=?,result_they_want=?,voice_sample=?,never_say=?,timezone=? WHERE id=1",
  ).run(
    email,
    text("what_you_do"),
    text("best_clients"),
    text("result_they_want"),
    text("voice_sample"),
    text("never_say"),
    timezone,
  );
}

export function recordOutcome(
  db: Store,
  id: number,
  outcome: string,
  eventAt: string,
  nextStep: string,
  nextDay: string,
  now = new Date(),
) {
  if (!["replied", "booked", "no_response"].includes(outcome))
    throw new Error("Choose an outcome.");
  if (!isTimestamp(eventAt) || Date.parse(eventAt) > now.getTime())
    throw new Error("Choose when this happened.");
  if (
    Boolean(nextStep.trim()) !== Boolean(nextDay) ||
    (nextDay && !isDay(nextDay))
  )
    throw new Error("A next step needs both a description and a date.");
  transaction(db, () => {
    const t = db
      .prepare("SELECT * FROM touches WHERE id=? AND status='sent'")
      .get(id) as unknown as Touch | undefined;
    if (!t) throw new Error("Confirm your send before recording an outcome.");
    if (eventAt < t.sent_at!)
      throw new Error(
        "The outcome date cannot be before this follow-up was sent.",
      );
    db.prepare("UPDATE touches SET outcome=? WHERE id=?").run(outcome, id);
    if (outcome === "replied")
      db.prepare(
        "UPDATE contacts SET last_inbound_at=?,last_two_way_at=?,stage='talking' WHERE id=?",
      ).run(eventAt, eventAt, t.contact_id);
    if (outcome === "booked")
      db.prepare("UPDATE contacts SET stage='talking' WHERE id=?").run(
        t.contact_id,
      );
    if (nextStep.trim())
      db.prepare(
        "UPDATE contacts SET next_step=?,next_step_at=? WHERE id=?",
      ).run(nextStep.trim(), nextDay, t.contact_id);
  });
}

// The demo is fictional, so it is rebuilt each day: sample drafts and
// dates only make sense on the day they were written.
export function resetStaleDemo(db: Store, now = new Date()) {
  const prefs = profile(db);
  if (!prefs.demo) return;
  if (
    db
      .prepare("SELECT 1 FROM daily_runs WHERE day=?")
      .get(localDay(now, prefs.timezone))
  )
    return;
  transaction(db, () =>
    db.exec(
      "DELETE FROM touches; DELETE FROM daily_runs; DELETE FROM contacts;",
    ),
  );
}

export function seedDemo(db: Store, now = new Date()) {
  if (contacts(db).length) return;
  const ago = (days: number) =>
    new Date(now.getTime() - days * 86_400_000).toISOString();
  const samples = [
    {
      name: "Jordan Lee",
      email: "jordan@example.test",
      signal_source: "inbound",
      signal_evidence:
        "Jordan asked through our contact form about simplifying appointment bookings for their studio.",
      signal_at: ago(2),
    },
    {
      name: "Alex Rivera",
      email: "alex@example.test",
      signal_source: "two_way",
      signal_evidence:
        "In our discovery call, Alex explained that their booking website loses inquiries. We discussed a simpler booking flow and sent a quote.",
      signal_at: ago(24),
      last_two_way_at: ago(24),
      stage: "quote",
      quote_sent_at: ago(15),
      last_outbound_at: ago(15),
    },
    {
      name: "Sam Patel",
      email: "sam@example.test",
      signal_source: "client",
      signal_evidence:
        "We built Sam's studio website last season. At handoff, Sam said they wanted to spend less time answering booking questions.",
      signal_at: ago(110),
      last_two_way_at: ago(90),
      stage: "client",
    },
    {
      name: "Taylor Morgan",
      email: "taylor@example.test",
      signal_source: "two_way",
      signal_evidence:
        "Taylor and I talked about their consulting website at a scheduled discovery call.",
      signal_at: ago(90),
      last_two_way_at: ago(90),
      last_outbound_at: ago(3),
    },
  ];
  samples.forEach((s) => addContact(db, parseContact(s, now)));
  db.prepare(
    "UPDATE profile SET demo=1,what_you_do='We build straightforward websites for small service businesses.',best_clients='Independent studios and consultants',result_they_want='More inquiries and fewer hours handling bookings',never_say='Never promise a revenue increase or a deadline we have not agreed to.' WHERE id=1",
  ).run();
  const day = ensureDay(db, now);
  const drafts: Record<string, [string, string]> = {
    "jordan@example.test": [
      "Your studio's booking flow",
      "Hi Jordan,\n\nThanks for reaching out about simplifying bookings for your studio. I'd like to understand where the current process takes the most work before suggesting a change.\n\nWhat tends to happen between someone asking about an appointment and getting it booked?\n\nHappy to start there.",
    ],
    "alex@example.test": [
      "A next step for your booking site",
      "Hi Alex,\n\nI've been thinking about the inquiries slipping through your booking website. The quote we discussed was aimed at making that path simpler for your customers.\n\nWould a quick conversation about the proposal be useful? I'd be happy to hear what's changed or clarify any part of it.",
    ],
    "sam@example.test": [
      "How is the studio website working out?",
      "Hi Sam,\n\nAt our website handoff, you mentioned wanting to spend less time answering booking questions. I wanted to check in and hear how things are going at the studio.\n\nHas the booking side been easier to manage, or are there still questions coming up regularly?",
    ],
  };
  for (const touch of allTouches(db, day)) {
    const d = drafts[touch.contact.email];
    if (d)
      db.prepare("UPDATE touches SET subject=?,body=? WHERE id=?").run(
        d[0],
        d[1],
        touch.id,
      );
  }
}

// Sample confirmed sends on the last few workdays, so the fictional demo shows
// a streak. Runs once per demo workspace; safe to call on every view.
export function seedDemoHistory(db: Store, now = new Date()) {
  if (db.prepare("SELECT 1 FROM touches WHERE reason='Sample history'").get())
    return;
  const prefs = profile(db);
  const ids = ["taylor@example.test", "sam@example.test"].map(
    (email) =>
      db.prepare("SELECT id FROM contacts WHERE email=?").get(email)?.id,
  );
  if (ids.some((id) => id === undefined)) return;
  let day = localDay(now, prefs.timezone);
  [2, 2, 1, 1].forEach((sends) => {
    do day = shiftDay(day, -1);
    while (!isWorkday(day));
    db.prepare("INSERT OR IGNORE INTO daily_runs(day) VALUES(?)").run(day);
    for (let position = 0; position < sends; position++)
      db.prepare(
        "INSERT OR IGNORE INTO touches(contact_id,day,position,kind,reason,subject,body,status,sent_at) VALUES(?,?,?,'dormant','Sample history','Checking in','Sample message.','sent',?)",
      ).run(ids[position], day, position, `${day}T20:00:00.000Z`);
  });
}
