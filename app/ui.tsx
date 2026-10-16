"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import type { Contact } from "../lib/rules.ts";
import { dateLabel, shiftDay } from "../lib/rules.ts";
import type { Profile, Touch, today } from "../lib/store.ts";

type Data = {
  state: ReturnType<typeof today>;
  contacts: Contact[];
  workspace: "demo" | "local";
};
type ResponseData = Data & {
  url?: string;
  text?: string;
  accepted?: number;
  preview?: { row: number; name: string; error: string | null }[];
};
type Mutate = (
  input: Record<string, unknown>,
  message?: string,
) => Promise<ResponseData>;
const labels: Record<string, string> = {
  two_way: "A two-way conversation",
  inbound: "They reached out",
  event: "An event",
  referral: "A personal introduction",
  client: "A client relationship",
  opt_in: "They opted in",
};
const kinds: Record<string, string> = {
  inbound: "A recent inquiry",
  next_step_due: "A promise to keep",
  quote_followup: "A quote to revisit",
  dormant: "A familiar face",
};

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function values(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget));
}

export default function Dashboard({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial),
    [tab, setTab] = useState("today"),
    [activeId, setActiveId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
      null,
    );
  const mutate: Mutate = async (input, message = "Saved.") => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "That change could not be saved.");
      setData(result);
      if (message) setNotice({ text: message, error: false });
      return result;
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : "That change could not be saved.",
        error: true,
      });
      throw error;
    } finally {
      setBusy(false);
    }
  };
  const state = data.state,
    demo = data.workspace === "demo";
  const active = state.cards.find((c) => c.id === activeId) || state.cards[0];
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${state.day}T12:00:00Z`));
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Send It home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          send it<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          {[
            ["today", "Today"],
            ["people", "Your people"],
            ["profile", "Your business"],
          ].map(([id, name]) => (
            <button
              key={id}
              className={tab === id ? "nav-active" : ""}
              onClick={() => setTab(id)}
            >
              {name}
            </button>
          ))}
        </nav>
        <span className="local-status">
          <span /> On your computer
        </span>
      </header>

      <div className={`workspace-strip ${demo ? "" : "personal"}`}>
        <span>
          <strong>{demo ? "TAKE A LOOK AROUND" : "YOUR WORKSPACE"}</strong>{" "}
          {demo
            ? "Fictional people. Sample messages. A real feel for your day."
            : "Your contacts stay separate from the fictional demo."}
        </span>
        <button
          disabled={busy}
          onClick={() => {
            setActiveId(null);
            void mutate(
              { action: "workspace", workspace: demo ? "local" : "demo" },
              "",
            ).catch(() => {});
          }}
        >
          {demo ? "Use my own contacts" : "View the demo"} <Arrow />
        </button>
      </div>

      <main>
        <section className="page-heading">
          <div>
            <p className="eyebrow">
              {tab === "today" ? day : "YOUR RELATIONSHIPS, WITH CONTEXT"}
            </p>
            <h1>
              {tab === "today" ? (
                <>
                  A few people today.
                  <br />
                  <em>Send it.</em>
                </>
              ) : tab === "people" ? (
                <>
                  Good work starts
                  <br />
                  <em>with people you know.</em>
                </>
              ) : (
                <>
                  Make it sound
                  <br />
                  <em>like you.</em>
                </>
              )}
            </h1>
            <p className="intro">
              {tab === "today"
                ? "A few thoughtful messages. Then back to the work you love."
                : tab === "people"
                  ? "Keep the real connection behind every conversation."
                  : "A few details to keep your future drafts grounded in your business."}
            </p>
          </div>
          <div className="heading-note">
            <span className="small-orbit" aria-hidden="true">
              ↗
            </span>
            <span>
              Small steps.
              <br />
              Taken consistently.
            </span>
          </div>
        </section>

        {notice && (
          <div
            role={notice.error ? "alert" : "status"}
            className={`notice ${notice.error ? "error" : ""}`}
          >
            <span>{notice.text}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
            >
              ×
            </button>
          </div>
        )}

        {tab === "today" && (
          <>
            <div className="section-heading">
              <h2>
                Your people for today{" "}
                <span className="count">{state.cards.length}</span>
              </h2>
              <span>
                {state.handled > 0
                  ? `${state.handled} handled today`
                  : state.cards.length === 1
                    ? "About 5 minutes"
                    : "About 10 minutes"}
              </span>
            </div>
            {state.cards.length > 0 && (
              <div
                className="people-tabs"
                role="group"
                aria-label="Today's people"
              >
                {state.cards.map((touch, index) => (
                  <button
                    key={touch.id}
                    className={`person-tab ${active?.id === touch.id ? "selected" : ""}`}
                    onClick={() => setActiveId(touch.id)}
                  >
                    <span className={`avatar tone-${index}`}>
                      {touch.contact.name
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span className="person-tab-text">
                      <strong>{touch.contact.name}</strong>
                      <small>{kinds[touch.kind]}</small>
                    </span>
                    <span className="tab-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="workspace-grid">
              <div>
                {active ? (
                  <Editor
                    key={`${data.workspace}-${active.id}`}
                    touch={active}
                    day={state.day}
                    mutate={mutate}
                    busy={busy}
                    demo={demo}
                  />
                ) : (
                  <section className="empty panel">
                    <div className="empty-symbol" aria-hidden="true">
                      ✓
                    </div>
                    <p className="eyebrow">A LITTLE SPACE IN YOUR DAY</p>
                    <h2>
                      {state.handled >= state.target
                        ? "You've done your part today."
                        : "Your next conversation starts here."}
                    </h2>
                    <p>
                      {state.handled >= state.target
                        ? "Back to your client work. Your next list will be here tomorrow."
                        : state.totalContacts
                          ? "There are no remaining people to follow up with right now. We only suggest a message when the relationship and timing fit."
                          : "Add a few people you already know, with a note about your connection."}
                    </p>
                    {state.totalContacts === 0 && (
                      <button
                        className="primary"
                        onClick={() => setTab("people")}
                      >
                        Add your first person <Arrow />
                      </button>
                    )}
                    {state.handled === 0 && state.totalContacts > 0 && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void mutate(
                            { action: "prepare" },
                            "Today's people are ready if any relationships are due.",
                          ).catch(() => {})
                        }
                      >
                        Prepare today&apos;s people
                      </button>
                    )}
                  </section>
                )}
                {state.history.length > 0 && (
                  <section className="history">
                    <div className="section-heading">
                      <h2>Followed through</h2>
                      <span>Confirmed by you</span>
                    </div>
                    {state.history.map((t) => (
                      <Outcome
                        key={t.id}
                        touch={t}
                        day={state.day}
                        mutate={mutate}
                        busy={busy}
                      />
                    ))}
                  </section>
                )}
              </div>
              <aside className="sidebar">
                <section className="floor panel">
                  <p className="eyebrow">KEEP A LITTLE MOMENTUM</p>
                  <div className="floor-number">
                    {state.weeklyCount}
                    <span> / 5</span>
                    <span className="floor-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                  <h3>Follow-ups completed</h3>
                  <p>In the past 7 days · confirmed by you</p>
                  <div
                    className="meter"
                    role="progressbar"
                    aria-label="Weekly follow-up floor"
                    aria-valuenow={Math.min(state.weeklyCount, 5)}
                    aria-valuemin={0}
                    aria-valuemax={5}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className={i < state.weeklyCount ? "filled" : ""}
                      />
                    ))}
                  </div>
                  <small>
                    {state.weeklyCount >= 5
                      ? "Your weekly floor is covered. Keep it thoughtful."
                      : `${Math.max(0, 5 - state.weeklyCount)} more to reach your weekly minimum.`}
                  </small>
                </section>
                <section className="busy-panel panel">
                  <div className="switch-row">
                    <h3>Busy with client work?</h3>
                    <button
                      className={`switch ${state.profile.busy_week ? "on" : ""}`}
                      role="switch"
                      aria-checked={Boolean(state.profile.busy_week)}
                      aria-label="Busy week"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          { action: "busy", enabled: !state.profile.busy_week },
                          "Your daily target has been updated.",
                        ).catch(() => {})
                      }
                    >
                      <span />
                    </button>
                  </div>
                  <p>
                    {state.profile.busy_week
                      ? "One person today. A small habit that fits a full calendar."
                      : "Turn it on for one person a day, instead of three."}
                  </p>
                  <span className="mode-label">
                    {state.profile.busy_week
                      ? "DELIVERY MODE · 1 A DAY"
                      : "STEADY MODE · 3 A DAY"}
                  </span>
                </section>
                <div className="quiet-note">
                  <span aria-hidden="true">✳</span>
                  <p>
                    Real relationships.
                    <br />
                    Your words. Your final say.
                    <small>
                      Every message starts with a reason you know this person.
                    </small>
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}

        {tab === "people" && (
          <People
            key={data.workspace}
            data={data}
            mutate={mutate}
            busy={busy}
          />
        )}
        {tab === "profile" && (
          <ProfileForm
            key={data.workspace}
            profile={state.profile}
            mutate={mutate}
            busy={busy}
          />
        )}
        <footer>
          <span>SEND IT BY SUPER LOGIC AI</span>
          <span>Good relationships deserve a little attention.</span>
        </footer>
      </main>
    </div>
  );
}

function Editor({
  touch,
  day,
  mutate,
  busy,
  demo,
}: {
  touch: Touch;
  day: string;
  mutate: Mutate;
  busy: boolean;
  demo: boolean;
}) {
  const [subject, setSubject] = useState(touch.subject),
    [body, setBody] = useState(touch.body),
    [snoozing, setSnoozing] = useState(false),
    [until, setUntil] = useState(shiftDay(day, 30)),
    [localNote, setLocalNote] = useState("");
  const [saved, setSaved] = useState({
    subject: touch.subject,
    body: touch.body,
  });
  const dirty = subject !== saved.subject || body !== saved.body;
  const payload = { id: touch.id, subject, body };
  const handoff = async (copy: boolean) => {
    setLocalNote("");
    const popup = !copy ? window.open("about:blank", "_blank") : null;
    if (popup) popup.opener = null;
    try {
      const result = await mutate({ action: "handoff", ...payload }, "");
      setSaved({ subject, body });
      if (copy) {
        try {
          await navigator.clipboard.writeText(result.text!);
          setLocalNote(
            "Copied. Send it from your mailbox, then choose ‘I sent it’.",
          );
        } catch {
          setLocalNote(
            "Copy isn't available in this browser. Select the message below and copy it manually.",
          );
        }
      } else if (popup) {
        popup.location.href = result.url!;
        setLocalNote(
          "Review the recipient and sending account in Gmail. Send there, then confirm here.",
        );
      } else {
        setLocalNote(
          "Your browser blocked the new tab. Allow pop-ups here, or use Copy.",
        );
      }
    } catch {
      popup?.close();
    }
  };
  return (
    <section className="editor panel">
      <div className="editor-topline">
        <span className="tag">{kinds[touch.kind]}</span>
        <span className="muted">
          {demo ? "Fictional example" : "Ready for your attention"}
        </span>
      </div>
      <h2>{touch.contact.name}</h2>
      <p className="contact-email">{touch.contact.email}</p>
      <div className="why">
        <span aria-hidden="true">↗</span>
        <div>
          <strong>Why today</strong>
          <p>{touch.reason}</p>
        </div>
      </div>
      <details className="evidence" open>
        <summary>
          Your shared context <span>{labels[touch.contact.signal_source]}</span>
        </summary>
        <p>{touch.contact.signal_evidence}</p>
        <small>Recorded {dateLabel(touch.contact.signal_at)}</small>
      </details>
      <div className="draft-heading">
        <span className="eyebrow">
          {demo ? "SAMPLE DRAFT · MAKE IT YOURS" : "YOUR MESSAGE"}
        </span>
        <button
          className="text-button"
          disabled={busy || !dirty}
          onClick={() =>
            void mutate({ action: "draft", ...payload }, "Draft saved.")
              .then(() => setSaved({ subject, body }))
              .catch(() => {})
          }
        >
          {dirty ? "Save changes" : "Saved"}
        </button>
      </div>
      {!demo && !body && (
        <p className="editor-tip">
          Start with the shared context above. Write a short note and one useful
          next step.
        </p>
      )}
      <label className="subject-row">
        <span>Subject</span>
        <input
          aria-label="Message subject"
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="A subject that sounds like you"
        />
      </label>
      <textarea
        className="message-body"
        aria-label="Message body"
        value={body}
        maxLength={6000}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Hi…"
      />
      <div className="message-actions">
        <button
          className="primary"
          disabled={busy || !subject.trim() || !body.trim()}
          onClick={() => void handoff(false)}
        >
          Review in Gmail <Arrow />
        </button>
        <button
          className="secondary"
          disabled={busy || !subject.trim() || !body.trim()}
          onClick={() => void handoff(true)}
        >
          Copy
        </button>
        <button
          className="sent-button"
          disabled={busy || !subject.trim() || !body.trim()}
          onClick={() =>
            void mutate(
              { action: "sent", ...payload },
              demo
                ? "Demo send recorded. No email was sent by Send It."
                : "Your follow-up is recorded as sent by you.",
            ).catch(() => {})
          }
        >
          I sent it <span aria-hidden="true">✓</span>
        </button>
      </div>
      <p className="send-note">
        Gmail opens a draft. You review and press Send there.
      </p>
      {localNote && (
        <p className="inline-note" role="status">
          {localNote}
        </p>
      )}
      <div className="card-bottom">
        <button
          disabled={busy}
          onClick={() =>
            void mutate(
              { action: "skip", id: touch.id },
              "Skipped for today. No replacement added.",
            ).catch(() => {})
          }
        >
          Skip today
        </button>
        <span>·</span>
        <button disabled={busy} onClick={() => setSnoozing(!snoozing)}>
          Not now
        </button>
      </div>
      {snoozing && (
        <div className="snooze">
          <label>
            Check back on{" "}
            <input
              aria-label="Check back date"
              type="date"
              min={shiftDay(day, 1)}
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void mutate(
                { action: "snooze", id: touch.id, until },
                "Saved. We'll leave this person out until that date.",
              ).catch(() => {})
            }
          >
            Save date
          </button>
        </div>
      )}
    </section>
  );
}

function People({
  data,
  mutate,
  busy,
}: {
  data: Data;
  mutate: Mutate;
  busy: boolean;
}) {
  const [source, setSource] = useState("two_way"),
    [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<ResponseData["preview"]>(),
    [accepted, setAccepted] = useState(0);
  const demo = data.workspace === "demo";
  return (
    <div className="people-layout">
      <section className="panel form-panel">
        <h2>Add someone you know</h2>
        <p className="muted">A real connection is required for every person.</p>
        {demo ? (
          <div className="soft-callout">
            You’re viewing fictional examples. Choose “Use my own contacts”
            above to add your people.
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              const input = values(event);
              const form = event.currentTarget;
              void mutate(
                { action: "add", ...input },
                "Person saved. Prepare today's people if your list is empty.",
              )
                .then(() => form.reset())
                .catch(() => {});
            }}
          >
            <div className="field-grid">
              <Field label="Name">
                <input
                  name="name"
                  required
                  maxLength={120}
                  placeholder="Alex Rivera"
                />
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="alex@example.com"
                />
              </Field>
            </div>
            <Field label="How do you know them?">
              <select
                name="signal_source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {Object.entries(labels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="What happened?"
              hint={
                source === "referral"
                  ? "Name the introduction or explicit permission to mention the referrer."
                  : "Include concrete shared context. A name in a list is not a relationship."
              }
            >
              <textarea
                name="signal_evidence"
                required
                minLength={10}
                maxLength={4000}
                rows={3}
                placeholder="We met on a discovery call and discussed…"
              />
            </Field>
            <div className="field-grid">
              <Field label="When did that happen?">
                <input
                  name="signal_at"
                  type="date"
                  required
                  max={data.state.day}
                />
              </Field>
              <Field label="Last two-way conversation">
                <input
                  name="last_two_way_at"
                  type="date"
                  required={source === "two_way"}
                  max={data.state.day}
                />
              </Field>
            </div>
            <details className="more-fields">
              <summary>
                Next step or proposal details <span>Optional</span>
              </summary>
              <div className="field-grid">
                <Field label="Relationship">
                  <select name="stage" defaultValue="warm">
                    {[
                      ["warm", "Someone I know"],
                      ["talking", "Talking about work"],
                      ["quote", "Quote sent"],
                      ["client", "Client"],
                    ].map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quote sent on">
                  <input
                    name="quote_sent_at"
                    type="date"
                    max={data.state.day}
                  />
                </Field>
                <Field label="Last message I sent">
                  <input
                    name="last_outbound_at"
                    type="date"
                    max={data.state.day}
                  />
                </Field>
                <Field label="Most recent message from them">
                  <input
                    name="last_inbound_at"
                    type="date"
                    max={data.state.day}
                  />
                </Field>
              </div>
              <Field label="Next step">
                <input name="next_step" placeholder="send the case study" />
              </Field>
              <Field label="Next-step date">
                <input name="next_step_at" type="date" />
              </Field>
            </details>
            <button className="primary" disabled={busy} type="submit">
              Add person <span aria-hidden="true">+</span>
            </button>
          </form>
        )}
        {!demo && (
          <details className="import-section">
            <summary>
              Import a CSV instead <span>Up to 500 people</span>
            </summary>
            <p>
              Each row needs name, email, signal_source, signal_evidence and
              signal_at. Two-way conversations also need last_two_way_at.
            </p>
            <a className="text-link" href="/sample-contacts.csv" download>
              Download a fictional example CSV ↗
            </a>
            <label className="field">
              <span>Choose a CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  setPreview(undefined);
                  if (file && file.size <= 1_000_000) setCsv(await file.text());
                  else setCsv("");
                }}
              />
            </label>
            <button
              className="secondary"
              disabled={busy || !csv}
              onClick={() =>
                void mutate(
                  { action: "preview", csv },
                  "Preview ready. Review the rows before importing.",
                )
                  .then((r) => {
                    setPreview(r.preview);
                    setAccepted(r.accepted || 0);
                  })
                  .catch(() => {})
              }
            >
              Preview import
            </button>
            {preview && (
              <div className="import-preview">
                <p>
                  <strong>
                    {accepted} valid {accepted === 1 ? "person" : "people"}
                  </strong>{" "}
                  · {preview.length - accepted} rows need attention
                </p>
                <ul>
                  {preview.map((r) => (
                    <li key={r.row} className={r.error ? "invalid-row" : ""}>
                      <strong>
                        Row {r.row}: {r.name}
                      </strong>
                      <span>{r.error || "Ready to import"}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className="primary"
                  disabled={busy || !accepted}
                  onClick={() =>
                    void mutate(
                      { action: "import", csv },
                      "Valid people imported. Existing contacts and their history were kept.",
                    )
                      .then(() => {
                        setCsv("");
                        setPreview(undefined);
                      })
                      .catch(() => {})
                  }
                >
                  Import {accepted} valid people
                </button>
              </div>
            )}
          </details>
        )}
      </section>
      <section className="panel contacts-panel">
        <div className="section-heading">
          <h2>Your people</h2>
          <span>{data.contacts.length}</span>
        </div>
        {data.contacts.length === 0 && (
          <p className="muted">Your first few warm connections belong here.</p>
        )}
        {data.contacts.map((c) => (
          <div className="contact-row" key={c.id}>
            <span className="avatar">
              {c.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{c.name}</strong>
              <small>{labels[c.signal_source]}</small>
              <small>
                {c.do_not_contact
                  ? "Do not contact"
                  : c.not_now_until
                    ? `On hold until ${dateLabel(c.not_now_until)}`
                    : c.email}
              </small>
            </div>
            {!c.do_not_contact && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void mutate(
                    { action: "suppress", id: c.id },
                    "This person will no longer be suggested.",
                  ).catch(() => {})
                }
              >
                Do not contact
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function ProfileForm({
  profile,
  mutate,
  busy,
}: {
  profile: Profile;
  mutate: Mutate;
  busy: boolean;
}) {
  return (
    <section className="panel form-panel profile-form">
      <h2>Your business, in your words</h2>
      <p className="muted">
        Save this context now. Connecting AI drafting is the next increment.
      </p>
      <form
        onSubmit={(event) =>
          void mutate(
            { action: "profile", ...values(event) },
            "Your business details are saved.",
          ).catch(() => {})
        }
      >
        <Field
          label="Your sending email"
          hint="Used to suggest the right account when opening Gmail."
        >
          <input
            type="email"
            name="owner_email"
            defaultValue={profile.owner_email}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="What do you help people do?">
          <textarea
            name="what_you_do"
            defaultValue={profile.what_you_do}
            rows={2}
          />
        </Field>
        <Field label="Who do you do your best work for?">
          <textarea
            name="best_clients"
            defaultValue={profile.best_clients}
            rows={2}
          />
        </Field>
        <Field label="What result do they want?">
          <textarea
            name="result_they_want"
            defaultValue={profile.result_they_want}
            rows={2}
          />
        </Field>
        <Field
          label="A short note that sounds like you"
          hint="Use a fictional example or remove anyone else's details."
        >
          <textarea
            name="voice_sample"
            defaultValue={profile.voice_sample}
            rows={3}
          />
        </Field>
        <Field label="Anything to avoid saying or promising?">
          <textarea
            name="never_say"
            defaultValue={profile.never_say}
            rows={2}
          />
        </Field>
        <Field
          label="Your timezone"
          hint="Your daily list changes at midnight here."
        >
          <input
            name="timezone"
            required
            defaultValue={profile.timezone}
            list="timezones"
          />
          <datalist id="timezones">
            {[
              "Pacific/Honolulu",
              "America/Los_Angeles",
              "America/New_York",
              "Europe/London",
              "UTC",
            ].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <button className="primary" disabled={busy}>
          Save business details <span aria-hidden="true">✓</span>
        </button>
      </form>
    </section>
  );
}

function Outcome({
  touch,
  day,
  mutate,
  busy,
}: {
  touch: Touch;
  day: string;
  mutate: Mutate;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false),
    [eventTime, setEventTime] = useState("");
  return (
    <div className="outcome panel">
      <div className="outcome-summary">
        <span className="done-icon" aria-hidden="true">
          ✓
        </span>
        <div>
          <strong>{touch.contact.name}</strong>
          <small>
            {touch.outcome
              ? `Recorded: ${touch.outcome.replaceAll("_", " ")}`
              : "You confirmed this follow-up was sent"}
          </small>
        </div>
        <button
          className="text-button"
          onClick={() => {
            const date = new Date();
            setEventTime(
              new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
                .toISOString()
                .slice(0, 23),
            );
            setOpen(!open);
          }}
        >
          Record a result
        </button>
      </div>
      {open && (
        <form
          className="outcome-form"
          onSubmit={(event) => {
            const input = values(event);
            void mutate(
              {
                action: "outcome",
                id: touch.id,
                ...input,
                eventAt: new Date(String(input.eventAt)).toISOString(),
              },
              "Result saved. Bookings are kept separate from two-way conversations.",
            )
              .then(() => setOpen(false))
              .catch(() => {});
          }}
        >
          <Field label="What happened?">
            <select name="outcome">
              <option value="replied">They replied to this message</option>
              <option value="booked">A meeting was booked</option>
              <option value="no_response">No response recorded</option>
            </select>
          </Field>
          <Field label="When did it happen?">
            <input
              name="eventAt"
              type="datetime-local"
              step="0.001"
              required
              defaultValue={eventTime}
            />
          </Field>
          <Field label="Next step (optional)">
            <input name="next_step" placeholder="prepare for the meeting" />
          </Field>
          <Field label="Next-step date">
            <input name="next_step_at" type="date" min={day} />
          </Field>
          <button className="secondary" disabled={busy}>
            Save result
          </button>
        </form>
      )}
    </div>
  );
}
