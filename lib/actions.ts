import { parseContact, type ContactInput } from "./rules.ts";
import {
  addContact,
  allTouches,
  confirmSent,
  contacts,
  pendingTouch,
  recordOutcome,
  saveDraft,
  saveProfile,
  seedDemo,
  seedDemoHistory,
  skip,
  snooze,
  today,
  transaction,
  type Store,
} from "./store.ts";
import { parseCsv } from "./csv.ts";

export type Workspace = "demo" | "local";
export function workspace(value: string | undefined): Workspace {
  return value === "local" ? "local" : "demo";
}

export type Payload = {
  state: ReturnType<typeof today>;
  contacts: ReturnType<typeof contacts>;
  workspace: Workspace;
  url?: string;
  text?: string;
  accepted?: number;
  preview?: { row: number; name: string; error: string | null }[];
};

function prepareDemo(db: Store, now: Date) {
  seedDemo(db, now);
  seedDemoHistory(db, now);
}

// Runs inside the owner's Durable Object (or a Node test store), so every
// action is one round trip and one atomic unit of work.
export function view(db: Store, mode: Workspace, now = new Date()): Payload {
  if (mode === "demo") prepareDemo(db, now);
  return { state: today(db, now), contacts: contacts(db), workspace: mode };
}

export function act(
  db: Store,
  mode: Workspace,
  input: Record<string, unknown>,
  now = new Date(),
): Payload {
  if (mode === "demo") prepareDemo(db, now);
  const action = String(input.action ?? "");
  const id = Number(input.id);
  const str = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string) : "";
  let extra: Record<string, unknown> = {};
  switch (action) {
    case "workspace":
      break;
    case "busy":
      db.prepare("UPDATE profile SET busy_week=? WHERE id=1").run(
        input.enabled === true ? 1 : 0,
      );
      break;
    case "profile":
      saveProfile(db, input);
      break;
    case "add": {
      if (mode === "demo")
        throw new Error(
          "Switch to your workspace before adding real people.",
        );
      const c = parseContact(input, now);
      if (contacts(db).some((v) => v.email === c.email))
        throw new Error(
          "This person is already saved. Their existing history has been kept.",
        );
      addContact(db, c);
      break;
    }
    case "preview":
    case "import": {
      if (mode === "demo")
        throw new Error("Switch to your workspace before importing people.");
      const existing = new Set(contacts(db).map((c) => c.email)),
        valid: ContactInput[] = [],
        rows: { row: number; name: string; error: string | null }[] = [];
      parseCsv(str("csv")).forEach((row, index) => {
        try {
          const c = parseContact(
            {
              ...row,
              signal_source: row.signal_source || str("signal_source"),
              signal_evidence: row.signal_evidence || str("signal_evidence"),
              signal_at: row.signal_at || str("signal_at"),
            },
            now,
          );
          if (existing.has(c.email))
            throw new Error(
              "Already saved or repeated in this file; existing history will be kept.",
            );
          existing.add(c.email);
          valid.push(c);
          rows.push({ row: index + 2, name: c.name, error: null });
        } catch (error) {
          rows.push({
            row: index + 2,
            name: row.name || "Unnamed",
            error: error instanceof Error ? error.message : "Check this row.",
          });
        }
      });
      if (action === "import") {
  transaction(db, () => valid.forEach((c) => addContact(db, c)));
      }
      extra = { preview: rows, accepted: valid.length };
      break;
    }
    case "prepare": {
      const state = today(db, now);
      if (allTouches(db, state.day).length)
        throw new Error(
          "Today's list is already saved. Your new people can appear tomorrow.",
        );
      db.prepare("DELETE FROM daily_runs WHERE day=?").run(state.day);
      break;
    }
    case "draft":
      saveDraft(db, id, str("subject"), str("body"), now);
      break;
    case "handoff": {
      const touch = saveDraft(db, id, str("subject"), str("body"), now);
      if (!touch.subject.trim() || !touch.body.trim())
        throw new Error("Write a subject and message first.");
      const sender = today(db, now).profile.owner_email;
      const params = new URLSearchParams({
        view: "cm",
        fs: "1",
        to: touch.contact.email,
        su: touch.subject,
        body: touch.body,
      });
      if (sender) params.set("authuser", sender);
      extra = {
        url: `https://mail.google.com/mail/?${params}`,
        text: `Subject: ${touch.subject}\n\n${touch.body}`,
      };
      break;
    }
    case "sent": {
      const prior = db
        .prepare("SELECT status FROM touches WHERE id=?")
        .get(id);
      if (prior?.status !== "sent")
        saveDraft(db, id, str("subject"), str("body"), now);
      confirmSent(db, id, now);
      break;
    }
    case "skip":
      skip(db, id, now);
      break;
    case "snooze": {
      const touch = pendingTouch(db, id, now);
      snooze(db, touch.contact_id, str("until"), now);
      break;
    }
    case "suppress":
      db.prepare("UPDATE contacts SET do_not_contact=1 WHERE id=?").run(id);
      break;
    case "outcome":
      recordOutcome(
        db,
        id,
        str("outcome"),
        str("eventAt"),
        str("next_step"),
        str("next_step_at"),
        now,
      );
      break;
    default:
      throw new Error("Choose an available action.");
  }
  return { ...view(db, mode, now), ...extra };
}
