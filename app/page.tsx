import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const AUDIENCES = ["Professionals", "Business owners", "Corporate teams"];

const STEPS = [
  {
    title: "Tell me about you",
    body: "A few short questions about your goals. About 3 minutes.",
  },
  {
    title: "I prepare",
    body: "I read everything first, so our time is focused on you.",
  },
  {
    title: "We talk",
    body: "A relaxed call about where you want to be and how I can help.",
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
                  Sell, present and communicate with confidence
                </h1>
                <p className="subtitle">
                  Coaching for professionals, business owners and corporate
                  teams. It starts with a free discovery call.
                </p>
                <div className="home-hero-actions">
                  <Link href="/discovery-call" className="cta cta-hero">
                    Book your discovery call <span aria-hidden>→</span>
                  </Link>
                  <Link href="/login" className="home-secondary-link">
                    Already a client? <strong>Client login</strong>{" "}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section home-section">
          <div className="container home-narrow">
            <h2 className="section-title">
              How it <span>works</span>
            </h2>
            <ol className="home-steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className="home-step">
                  <span className="home-step-num">{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section home-section">
          <div className="container home-narrow home-trust">
            <p className="home-trust-lead">
              18+ years in sales strategy, value selling and presentations
              across the UK, Asia and the USA — training hundreds of sales
              professionals every year.
            </p>
            <div className="companies">
              <span className="company-tag">Honeywell</span>
              <span className="company-tag">Intermec</span>
              <span className="company-tag">NICE</span>
            </div>
            <p className="home-audiences">
              Working with {AUDIENCES.join(" · ")}
            </p>
            <div className="home-links">
              <Link href="/meet-monika" className="home-secondary-link">
                <strong>Meet Monika</strong> <span aria-hidden>→</span>
              </Link>
              <Link href="/landing" className="home-secondary-link">
                <strong>About Coach Skill</strong> <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="section home-final">
          <div className="container home-narrow home-center">
            <h2 className="section-title">
              Ready to <span>start?</span>
            </h2>
            <p className="section-lead">
              Join the Value Selling Workshop: 2.5 hours in a small group of up
              to 5, with personal feedback on your pitch.
            </p>
            <Link href="/workshop" className="cta cta-hero">
              See the Value Selling Workshop <span aria-hidden>→</span>
            </Link>
            <div className="home-links">
              <Link href="/workshop#teams" className="home-secondary-link">
                Training a team? <strong>Private group sessions</strong>{" "}
                <span aria-hidden>→</span>
              </Link>
              <Link href="/discovery-call" className="home-secondary-link">
                Prefer one-to-one? <strong>Book a discovery call</strong>{" "}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
