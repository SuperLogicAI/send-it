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

export type Profile = {
  owner_email: string;
  what_you_do: string;
  best_clients: string;
  result_they_want: string;
  voice_sample: string;
  never_say: string;
  timezone: string;
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
  const row = db.prepare("SELECT * FROM profile WHERE id=1").get();
  return { ...row } as unknown as Profile;
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

export function ensureDay(db: Store, now = new Date()): string {
  const prefs = profile(db),
    day = localDay(now, prefs.timezone);
  return transaction(db, () => {
    if (db.prepare("SELECT day FROM daily_runs WHERE day=?").get(day))
      return day;
    db.prepare("INSERT INTO daily_runs(day) VALUES(?)").run(day);
    rankContacts(contacts(db), now, prefs.timezone)
      .slice(0, 3)
      .forEach((pick, index) => {
        const c = pick.contact;
        db.prepare(
          `INSERT INTO touches(contact_id,day,position,kind,reason,next_step_snapshot,next_step_at_snapshot) VALUES(?,?,?,?,?,?,?)`,
        ).run(
          c.id,
          day,
          index,
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
  const count = (
    db.prepare("SELECT sent_at FROM touches WHERE status='sent'").all() as {
      sent_at: string;
    }[]
  ).filter((t) => {
    const sentDay = localDay(new Date(t.sent_at), prefs.timezone);
    return sentDay >= shiftDay(day, -6) && sentDay <= day;
  }).length;
  return {
    profile: prefs,
    day,
    target,
    handled,
    cards: pending,
    history: all.filter((t) => t.status === "sent"),
    weeklyCount: count,
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
  const timezone = text("timezone") || "Pacific/Honolulu";
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
