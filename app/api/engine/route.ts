import { NextRequest, NextResponse } from "next/server";
import { parseContact, type ContactInput } from "../../../lib/rules.ts";
import {
  addContact,
  allTouches,
  confirmSent,
  contacts,
  pendingTouch,
  recordOutcome,
  saveDraft,
  saveProfile,
  skip,
  snooze,
  today,
} from "../../../lib/store.ts";
import { getStore, workspace } from "../../../lib/runtime.ts";
import { parseCsv } from "../../../lib/csv.ts";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin"),
    host = request.headers.get("host");
  let originUrl: URL | undefined;
  try {
    if (origin) originUrl = new URL(origin);
  } catch {
    /* Invalid origins are rejected below. */
  }
  if (
    !originUrl ||
    originUrl.host !== host ||
    !["127.0.0.1", "localhost"].includes(originUrl.hostname)
  ) {
    return NextResponse.json(
      { error: "Open Send It on this computer to make changes." },
      { status: 403 },
    );
  }
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1_200_000)
      throw new Error("This request is too large.");
    const input = JSON.parse(raw) as Record<string, unknown>;
    const action = String(input.action ?? ""),
      now = new Date();
    const mode =
      action === "workspace"
        ? workspace(String(input.workspace))
        : workspace(request.cookies.get("engine-workspace")?.value);
    const db = getStore(mode);
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
          db.exec("BEGIN IMMEDIATE");
          try {
            valid.forEach((c) => addContact(db, c));
            db.exec("COMMIT");
          } catch (error) {
            db.exec("ROLLBACK");
            throw error;
          }
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
    const response = NextResponse.json({
      state: today(db, now),
      contacts: contacts(db),
      workspace: mode,
      ...extra,
    });
    if (action === "workspace")
      response.cookies.set("engine-workspace", mode, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "That change could not be saved.";
    const safe = /SQLITE|constraint|UNIQUE|CHECK|JSON|syntax/i.test(message)
      ? "Check the required fields and dates. Existing contacts are never replaced by an import."
      : message;
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
