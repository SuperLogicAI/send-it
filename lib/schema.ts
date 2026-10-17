// Shared by the Node store (node:sqlite) and the Durable Object store.
// Plain SQL only: no PRAGMA, no JavaScript SQL functions.

// Shared with migrate() in store.ts, which rebuilds older tables whose
// kind CHECK predates the event and introduction kinds.
export const TOUCHES = `
  id INTEGER PRIMARY KEY, contact_id INTEGER NOT NULL REFERENCES contacts(id),
  day TEXT NOT NULL REFERENCES daily_runs(day), position INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('inbound','next_step_due','quote_followup','event_followup','introduction','dormant')),
  reason TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','skipped')),
  sent_at TEXT CHECK(sent_at IS NULL OR strftime('%Y-%m-%dT%H:%M:%fZ',sent_at) IS sent_at),
  next_step_snapshot TEXT, next_step_at_snapshot TEXT,
  outcome TEXT CHECK(outcome IS NULL OR outcome IN ('replied','booked','no_response','not_now')),
  UNIQUE(contact_id,day), UNIQUE(day,position),
  CHECK((status='sent')=(sent_at IS NOT NULL))
`;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK(id=1), owner_email TEXT NOT NULL DEFAULT '',
  what_you_do TEXT NOT NULL DEFAULT '', best_clients TEXT NOT NULL DEFAULT '', result_they_want TEXT NOT NULL DEFAULT '',
  voice_sample TEXT NOT NULL DEFAULT '', never_say TEXT NOT NULL DEFAULT '', timezone TEXT NOT NULL DEFAULT '',
  busy_week INTEGER NOT NULL DEFAULT 0 CHECK(busy_week IN (0,1)), demo INTEGER NOT NULL DEFAULT 0 CHECK(demo IN (0,1))
);
INSERT OR IGNORE INTO profile(id) VALUES(1);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
  email TEXT NOT NULL UNIQUE CHECK(email LIKE '%_@_%._%' AND email=lower(trim(email))),
  signal_source TEXT NOT NULL CHECK(signal_source IN ('two_way','inbound','event','referral','client','opt_in')),
  signal_evidence TEXT NOT NULL CHECK(length(trim(signal_evidence)) BETWEEN 10 AND 4000),
  signal_at TEXT NOT NULL CHECK(strftime('%Y-%m-%dT%H:%M:%fZ',signal_at) IS signal_at),
  last_two_way_at TEXT CHECK(last_two_way_at IS NULL OR strftime('%Y-%m-%dT%H:%M:%fZ',last_two_way_at) IS last_two_way_at),
  last_inbound_at TEXT CHECK(last_inbound_at IS NULL OR strftime('%Y-%m-%dT%H:%M:%fZ',last_inbound_at) IS last_inbound_at),
  last_outbound_at TEXT CHECK(last_outbound_at IS NULL OR strftime('%Y-%m-%dT%H:%M:%fZ',last_outbound_at) IS last_outbound_at),
  quote_sent_at TEXT CHECK(quote_sent_at IS NULL OR strftime('%Y-%m-%dT%H:%M:%fZ',quote_sent_at) IS quote_sent_at),
  stage TEXT NOT NULL DEFAULT 'warm' CHECK(stage IN ('warm','talking','quote','client','lost')),
  next_step TEXT CHECK(next_step IS NULL OR length(trim(next_step))>0),
  next_step_at TEXT CHECK(next_step_at IS NULL OR date(next_step_at) IS next_step_at),
  not_now_until TEXT CHECK(not_now_until IS NULL OR date(not_now_until) IS not_now_until),
  do_not_contact INTEGER NOT NULL DEFAULT 0 CHECK(do_not_contact IN (0,1)),
  CHECK(signal_source!='two_way' OR last_two_way_at IS NOT NULL),
  CHECK((next_step IS NULL)=(next_step_at IS NULL))
);
CREATE TABLE IF NOT EXISTS daily_runs (day TEXT PRIMARY KEY CHECK(date(day) IS day));
CREATE TABLE IF NOT EXISTS touches (${TOUCHES});
`;
