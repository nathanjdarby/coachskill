import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Coach } from "@/components/Coach";
import { Footer } from "@/components/Footer";

const STEPS = [
  {
    title: "Tell me about you",
    body: "Answer a few short questions about your goals and what's holding you back. It takes about 3 minutes.",
  },
  {
    title: "I prepare",
    body: "I read everything before we speak, so our time is focused on you — not on filling in background.",
  },
  {
    title: "We talk",
    body: "A relaxed conversation about where you want to be and the best way I can help you get there.",
  },
];

const AUDIENCES = [
  {
    title: "Professionals",
    body: "Looking for mentoring or personal development to grow in confidence and presence.",
  },
  {
    title: "Business owners",
    body: "Self-employed, running a solo business, or leading a small team — and ready to win more of the right customers.",
  },
  {
    title: "Corporate employees",
    body: "Wanting to pitch, present and communicate with more clarity and impact.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero home-hero">
          <div className="container">
            <div className="home-hero-grid">
              <div className="home-hero-portrait">
                <Image
                  src="/assets/coach-portrait.png"
                  alt="Monika Kozlowska"
                  className="coach-portrait"
                  width={360}
                  height={480}
                  priority
                />
              </div>
              <div className="hero-content">
                <p className="eyebrow">Monika Kozlowska · Coach Skill</p>
                <h1 className="hero-title home-hero-title">
                  Book a discovery call with me
                </h1>
                <p className="subtitle">
                  Let&apos;s talk about your goals, what&apos;s holding you back,
                  and how I can help you sell, present and communicate with more
                  confidence.
                </p>
                <div className="home-hero-actions">
                  <Link href="/discovery-call" className="cta cta-hero">
                    Book your discovery call <span aria-hidden>→</span>
                  </Link>
                  <Link href="/client-login" className="home-secondary-link">
                    Already a client? <strong>Client login</strong>{" "}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="section-connector" />

        <section className="section home-section">
          <div className="container">
            <h2 className="section-title">
              How it <span>works</span>
            </h2>
            <ol className="home-cards">
              {STEPS.map((s, i) => (
                <li key={s.title} className="home-card">
                  <span className="home-card-num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="home-center">
              <Link href="/discovery-call" className="cta cta-hero">
                Start now <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="section home-section">
          <div className="container">
            <h2 className="section-title">
              Who I <span>work with</span>
            </h2>
            <ul className="home-cards">
              {AUDIENCES.map((a) => (
                <li key={a.title} className="home-card">
                  <h3>{a.title}</h3>
                  <p>{a.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Coach />

        <section className="section">
          <div className="container">
            <div className="options-grid home-options">
              <article className="option-card">
                <h3>Not sure where to start?</h3>
                <p>
                  A discovery call is the best first step. Tell me where you are
                  now and we&apos;ll work out the right way forward together.
                </p>
                <Link href="/discovery-call" className="cta">
                  Book a discovery call
                </Link>
              </article>
              <article className="option-card">
                <h3>Value Selling Workshop</h3>
                <p>
                  A focused 2.5-hour small-group workshop that transforms how you
                  pitch — from feature-heavy explanations to value-led
                  storytelling.
                </p>
                <Link href="/workshop" className="cta home-cta-outline">
                  See the workshop
                </Link>
              </article>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
