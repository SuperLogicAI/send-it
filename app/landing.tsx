import Link from "next/link";
import { APP_ORIGIN } from "../lib/origin.ts";

const REPO = "https://github.com/SuperLogicAI/send-it";

const steps = [
  {
    title: "Three people, and why",
    text: "Each morning you get up to three people from your own contacts, each with the reason they're on today's list. “You sent a quote 15 days ago and haven't heard back.” No mystery ranking.",
  },
  {
    title: "A note that sounds like you",
    text: "Write it yourself, or let ChatGPT or Claude draft it from what you know about that person and how you write. Change a word or keep it as it is.",
  },
  {
    title: "You press send",
    text: "It opens in your own Gmail. You read it and send it. Send It never sends anything on its own. Tap I sent it and that person is done for today.",
  },
];

const promises = [
  {
    title: "No cold email. Ever.",
    text: "Everyone on your list needs a real reason they know you: a conversation, an inquiry, an event, an introduction, a past project, or a sign-up. No reason, no spot on the list. The database refuses the contact.",
  },
  {
    title: "Your list stays yours.",
    text: "Each person using Send It gets their own private database. We never sell it, share it, or use it to find new people.",
  },
  {
    title: "Busy week? One a day.",
    text: "In a heavy week the list drops to one person a day. It never drops to zero, so the pipeline doesn't go quiet while you deliver.",
  },
];

const questions = [
  {
    q: "Do I have to connect my email?",
    a: "No. Send It opens a ready draft in your own Gmail. It can't read your inbox or send anything.",
  },
  {
    q: "Where do my people come from?",
    a: "From you: people you've met, talked to, worked with, or who reached out. Add them one at a time or import a list of past clients or event sign-ups. Bought or scraped lists aren't allowed.",
  },
  { q: "What does it cost?", a: "Nothing during the beta." },
  {
    q: "Who's behind it?",
    a: "Super Logic AI, an AI automation agency in Hawaii.",
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
          <a href="#day">How it works</a>
          <a href={APP_ORIGIN}>Sign in</a>
        </nav>
      </header>
      <main className="site-main">
        <section className="site-hero">
          <h1>Your next client already knows you.</h1>
          <p className="site-lead">
            A quote that went quiet. A great call from March. Someone who asked
            a question and never heard back. Send It finds a few of them each
            morning, tells you why today, and helps you write a short note. You
            read it and press send from your own Gmail. About ten minutes, then
            back to client work.
          </p>
          <div className="site-cta">
            <a className="primary" href="#join">
              Get early access <span aria-hidden="true">↓</span>
            </a>
            <small>Free during the beta. Nothing to connect, nothing to install.</small>
          </div>
          <figure className="site-shot">
            <picture>
              <source
                media="(max-width: 640px)"
                srcSet="/demo-card.png"
                width={700}
                height={1600}
              />
              <img
                src="/demo.png"
                width={1200}
                height={1310}
                alt="Send It showing a person to follow up with today, the reason they are on the list, and a drafted message to review"
              />
            </picture>
            <figcaption>Fictional example people and messages.</figcaption>
          </figure>
        </section>

        <section className="site-open" aria-labelledby="cycle">
          <h2 id="cycle">Sell, deliver, scramble, repeat.</h2>
          <p>
            When the calendar&apos;s empty, you sell hard. Deals close and you go
            heads-down on the work. Selling stops. The project wraps up and the
            pipeline is empty again. Send It is built for the middle part: the
            weeks you&apos;re too busy to sell.
          </p>
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

        <section className="site-open" aria-labelledby="streak">
          <h2 id="streak">A habit that survives busy weeks</h2>
          <p>
            A busy week or a sick day won&apos;t wipe out your progress. One
            follow-up on a workday keeps your streak going, and weekends never
            count against you. Have a strong week and you bank a day off. Replies
            and booked calls earn badges too.
          </p>
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

        <section aria-labelledby="questions">
          <h2 id="questions">Questions</h2>
          <dl className="site-grid site-faq">
            {questions.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="site-final" id="join" aria-labelledby="want">
          <h2 id="want">Want in?</h2>
          <p>
            Tell us what you do and who you&apos;d follow up with first.
            We&apos;ll send your login.
          </p>
          <p className="site-done" id="thanks" role="status">
            Thanks. You&apos;re on the list, and we&apos;ll email your login.
          </p>
          <p className="site-done error" id="signup-error" role="alert">
            That didn&apos;t go through. Check your email address and try again.
          </p>
          <form className="site-form" method="post" action="/api/signup">
            <label>
              <span>Your email</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              <span>What you do</span>
              <input name="what" maxLength={500} placeholder="I build websites for local studios" />
            </label>
            <label>
              <span>Who you&apos;d follow up with first</span>
              <input name="who" maxLength={500} placeholder="A quote from last month" />
            </label>
            {/* Hidden from people; bots fill it in. */}
            <label className="site-trap" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <button className="primary">Get early access</button>
          </form>
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
        <a href={REPO} target="_blank" rel="noopener noreferrer">
          Open source on GitHub
        </a>
      </footer>
    </div>
  );
}
