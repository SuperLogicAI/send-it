export const SOURCES = [
  "two_way",
  "inbound",
  "event",
  "referral",
  "client",
  "opt_in",
] as const;
export type Source = (typeof SOURCES)[number];
export type Stage = "warm" | "talking" | "quote" | "client" | "lost";
export type Contact = {
  id: number;
  name: string;
  email: string;
  signal_source: Source;
  signal_evidence: string;
  signal_at: string;
  last_two_way_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  quote_sent_at: string | null;
  stage: Stage;
  next_step: string | null;
  next_step_at: string | null;
  not_now_until: string | null;
  do_not_contact: number;
};
export type ContactInput = Omit<Contact, "id">;
export type Kind =
  | "inbound"
  | "next_step_due"
  | "quote_followup"
  | "event_followup"
  | "introduction"
  | "dormant";
export type Pick = {
  kind: Kind;
  reason: string;
  priority: number;
  since: string;
};
export const DAY = 86_400_000;

export function isTimestamp(value: unknown): boolean {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  )
    return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

export function isDay(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    isTimestamp(`${value}T00:00:00.000Z`)
  );
}

export function localDay(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}

export function emailValid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value)
  );
}

export function parseContact(
  raw: Record<string, unknown>,
  now = new Date(),
): ContactInput {
  const text = (key: string) =>
    typeof raw[key] === "string" ? raw[key].trim() : "";
  const timestamp = (key: string, required = false): string | null => {
    let value = text(key);
    if (!value && !required) return null;
    if (isDay(value)) value = `${value}T00:00:00.000Z`;
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value))
      value = value.replace(/Z$/, ".000Z");
    if (!isTimestamp(value))
      throw new Error(`Enter a valid date for ${key.replaceAll("_", " ")}.`);
    if (Date.parse(value) > now.getTime())
      throw new Error(
        "Relationship and activity dates cannot be in the future.",
      );
    return value;
  };
  const day = (key: string) => {
    const value = text(key);
    if (!value) return null;
    if (!isDay(value))
      throw new Error(`Enter a valid date for ${key.replaceAll("_", " ")}.`);
    return value;
  };
  const name = text("name"),
    email = text("email").toLowerCase();
  if (!name || name.length > 120)
    throw new Error("Add a name of up to 120 characters.");
  if (!emailValid(email)) throw new Error("Add a valid email address.");
  const source = text("signal_source") as Source;
  if (!SOURCES.includes(source))
    throw new Error("Choose how you know this person.");
  const evidence = text("signal_evidence");
  if (evidence.length < 10 || evidence.length > 4000)
    throw new Error("Describe your real connection in 10–4,000 characters.");
  const signal_at = timestamp("signal_at", true)!;
  const last_two_way_at = timestamp("last_two_way_at", source === "two_way");
  const stage = (text("stage") || "warm") as Stage;
  if (!["warm", "talking", "quote", "client", "lost"].includes(stage))
    throw new Error("Choose a valid relationship stage.");
  const next_step = text("next_step") || null,
    next_step_at = day("next_step_at");
  if (Boolean(next_step) !== Boolean(next_step_at))
    throw new Error("Add both a next step and its date, or leave both empty.");
  return {
    name,
    email,
    signal_source: source,
    signal_evidence: evidence,
    signal_at,
    last_two_way_at,
    last_inbound_at:
      timestamp("last_inbound_at") ?? (source === "inbound" ? signal_at : null),
    last_outbound_at: timestamp("last_outbound_at"),
    quote_sent_at: timestamp("quote_sent_at"),
    stage,
    next_step,
    next_step_at,
    not_now_until: day("not_now_until"),
    do_not_contact: 0,
  };
}

export function pickReason(
  c: Contact,
  now: Date,
  timezone: string,
): Pick | null {
  const today = localDay(now, timezone);
  if (
    !SOURCES.includes(c.signal_source) ||
    c.signal_evidence.trim().length < 10 ||
    !isTimestamp(c.signal_at)
  )
    return null;
  if (c.signal_source === "two_way" && !isTimestamp(c.last_two_way_at))
    return null;
  if (
    c.do_not_contact ||
    c.stage === "lost" ||
    (c.not_now_until && c.not_now_until > today)
  )
    return null;
  const inbound =
    c.last_inbound_at &&
    (!c.last_outbound_at || c.last_inbound_at > c.last_outbound_at);
  const due = c.next_step && c.next_step_at && c.next_step_at <= today;
  const recent =
    c.last_outbound_at &&
    now.getTime() - Date.parse(c.last_outbound_at) < 7 * DAY;
  if (recent && !inbound && !due) return null;
  if (inbound)
    return {
      kind: "inbound",
      priority: 0,
      since: c.last_inbound_at!,
      reason: `Reached out ${dateLabel(c.last_inbound_at!)}. No follow-up recorded here.`,
    };
  if (due)
    return {
      kind: "next_step_due",
      priority: 1,
      since: c.next_step_at!,
      reason: `You planned to ${c.next_step!.replace(/[.!]$/, "")} by ${dateLabel(c.next_step_at!)}.`,
    };
  if (c.stage === "quote" && c.quote_sent_at) {
    const latest = [c.quote_sent_at, c.last_outbound_at]
      .filter(Boolean)
      .sort()
      .at(-1)!;
    if (now.getTime() - Date.parse(latest) >= 7 * DAY)
      return {
        kind: "quote_followup",
        priority: 2,
        since: latest,
        reason: `Quote sent ${dateLabel(c.quote_sent_at)}. No later follow-up recorded since ${dateLabel(latest)}.`,
      };
  }
  // Event and introduction contacts often have no two-way date yet, so the
  // familiar-face rule below never reaches them. Give each its own window.
  const age = now.getTime() - Date.parse(c.signal_at);
  if (
    c.signal_source === "event" &&
    !c.last_outbound_at &&
    age >= 3 * DAY &&
    age <= 21 * DAY
  )
    return {
      kind: "event_followup",
      priority: 2,
      since: c.signal_at,
      reason: `You connected through an event on ${dateLabel(c.signal_at)}. No follow-up recorded yet.`,
    };
  if (
    c.signal_source === "referral" &&
    !c.last_outbound_at &&
    !c.last_two_way_at
  )
    return {
      kind: "introduction",
      priority: 2,
      since: c.signal_at,
      reason: `You were introduced on ${dateLabel(c.signal_at)}. No follow-up recorded yet.`,
    };
  const latest = [
    c.signal_at,
    c.last_two_way_at,
    c.last_inbound_at,
    c.last_outbound_at,
  ]
    .filter(Boolean)
    .sort()
    .at(-1)!;
  if (
    ["warm", "client"].includes(c.stage) &&
    (c.signal_source === "client" || c.last_two_way_at) &&
    now.getTime() - Date.parse(latest) >= 60 * DAY
  ) {
    return {
      kind: "dormant",
      priority: 3,
      since: latest,
      reason: `Your last recorded contact was ${dateLabel(latest)}. A good time for a thoughtful check-in.`,
    };
  }
  return null;
}

export function rankContacts(contacts: Contact[], now: Date, timezone: string) {
  return contacts
    .flatMap((contact) => {
      const pick = pickReason(contact, now, timezone);
      return pick ? [{ contact, ...pick }] : [];
    })
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.since.localeCompare(b.since) ||
        a.contact.id - b.contact.id,
    );
}
