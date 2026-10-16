import Link from "next/link";
import { APP_ORIGIN } from "../lib/origin.ts";

const REPO = "https://github.com/SuperLogicAI/send-it";
const REQUEST = `mailto:contact@superlogicai.com?subject=${encodeURIComponent(
  "Send It beta access",
)}&body=${encodeURIComponent(
  "Hi, I'd like to try Send It.\n\nWhat I do:\nWho I'd follow up with first:\nThe email to set up:\n",
)}`;

const steps = [
  {
    title: "Three people, with a reason",
    text: "Each day you see up to three people from your own contacts, and why they're on the list. “You sent a quote 15 days ago and haven't heard back.” No mystery ranking.",
  },
  {
    title: "A draft that sounds like you",
    text: "Write your own, or tap Draft in ChatGPT or Draft in Claude. Send It builds the prompt from your notes about that person and copies it. You paste the reply back, edit it, and save.",
  },
  {
    title: "You press send",
    text: "Review in Gmail opens a draft in your own account. You read it, press Send, then tap I sent it. Send It can't send email. There is no code in it that does.",
  },
];

const promises = [
  {
    title: "No cold email. Ever.",
    text: "Every person needs a recorded reason they know you: a conversation, an inquiry, an event, an introduction, a past client, or a sign-up. No reason, no spot on the list. The database refuses the contact.",
  },
  {
    title: "You approve every message.",
    text: "Send It drafts and queues. You decide what goes out, from your own account, under your own name.",
  },
  {
    title: "Busy week mode.",
    text: "In a heavy week the list drops to one person a day. It never drops to zero, so your pipeline doesn't go quiet while you deliver.",
  },
];

export default function Landing() {
  return (
    <div className="site">
      <header className="site-bar">
        <Link className="brand" href="/" aria-label="Send It home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          send it<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href={REPO} target="_blank" rel="noopener noreferrer">
            Code
          </a>
          <a href={APP_ORIGIN}>Sign in</a>
        </nav>
      </header>
      <main className="site-main">
        <section className="site-hero">
          <h1>A few thoughtful follow-ups. Then back to your client work.</h1>
          <p className="site-lead">
            Most of your next client already knows you. A past call, a quote
            that went quiet, someone who asked a question. Send It picks the few
            worth a note today, tells you why, and helps you write it. You send
            it yourself.
          </p>
          <div className="site-cta">
            <a className="primary" href={REQUEST}>
              Request beta access <span aria-hidden="true">↗</span>
            </a>
            <small>Invite-only beta. Free while we learn what you need.</small>
          </div>
          <figure className="site-shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/demo.png"
              width={1200}
              height={1310}
              alt="Send It showing a person to follow up with today, the reason they are on the list, and a drafted message to review"
            />
            <figcaption>Fictional example people and messages.</figcaption>
          </figure>
        </section>

        <section aria-labelledby="day">
          <h2 id="day">How a day works</h2>
          <ol className="site-grid">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="site-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="honest">
          <h2 id="honest">Built to stay honest</h2>
          <ul className="site-grid">
            {promises.map((s) => (
              <li key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="site-open" aria-labelledby="open">
          <h2 id="open">See exactly how it picks</h2>
          <p>
            Send It is open source: anyone can read the code. The rules for who
            shows up today live in{" "}
            <a
              href={`${REPO}/blob/main/lib/rules.ts`}
              target="_blank"
              rel="noopener noreferrer"
            >
              one readable file
            </a>
            , and the instructions we give the drafting model are{" "}
            <a
              href={`${REPO}/blob/main/prompts/draft.md`}
              target="_blank"
              rel="noopener noreferrer"
            >
              plain text too
            </a>
            .
          </p>
        </section>

        <section className="site-final" aria-labelledby="want">
          <h2 id="want">Want in?</h2>
          <p>
            Tell us what you do and who you&apos;d follow up with first. We&apos;ll
            set you up with a login.
          </p>
          <a className="primary" href={REQUEST}>
            Request beta access <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <footer>
        <a
          className="brand-link"
          href="https://superlogicai.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>SEND IT BY</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_b.png" alt="Super Logic AI" width={104} height={14} />
        </a>
        <span>Good relationships deserve a little attention.</span>
      </footer>
    </div>
  );
}
