import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Meet Monika | Coach Skill",
  description:
    "Monika Kozlowska — expert in Value Selling, sales strategy and presentations. 18+ years international experience. Learn why professionals choose her Value Selling Training.",
};

export default function MeetMonikaPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="section meet-monika-hero">
          <div className="container">
            <div className="meet-monika-hero-grid">
              <div className="meet-monika-portrait-wrap">
                <Image
                  src="/assets/coach-portrait.png"
                  alt="Monika Kozlowska"
                  className="coach-portrait"
                  width={320}
                  height={427}
                />
              </div>
              <div className="meet-monika-hero-content">
                <h1 className="meet-monika-title">Meet Monika</h1>
                <p className="meet-monika-tagline">
                  Sales Strategy · Value Selling · Presentations
                </p>
                <p className="meet-monika-lead">
                  An accomplished expert in sales strategy, value-based
                  communication and impactful presentations, with over 18 years&apos;
                  international experience across the UK, Asia and the USA.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="section-connector" />

        {/* Why Monika */}
        <section className="section meet-monika-why">
          <div className="container">
            <h2 className="section-title">
              Why train with <span>Monika</span>
            </h2>
            <div className="meet-monika-cards">
              <div className="meet-monika-card">
                <div className="meet-monika-card-icon">18+</div>
                <h3>Years experience</h3>
                <p>
                  International experience across the UK, Asia and the USA in
                  sales enablement, strategy and training.
                </p>
              </div>
              <div className="meet-monika-card">
                <div className="meet-monika-card-icon">∞</div>
                <h3>Global enablement</h3>
                <p>
                  Led enablement programmes for Honeywell, Intermec and NICE —
                  training hundreds of sales professionals annually.
                </p>
              </div>
              <div className="meet-monika-card">
                <div className="meet-monika-card-icon">✓</div>
                <h3>Proven methods</h3>
                <p>
                  Blends advanced Sales Methodologies, EQ, Value Selling,
                  Storytelling and Objection Handling for practical, lasting
                  results.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="section-connector" />

        {/* Bio */}
        <section className="section coach-section">
          <div className="container">
            <h2 className="section-title">
              Her <span>approach</span>
            </h2>
            <div className="coach-grid">
              <div className="coach-portrait-wrap is-visible">
                <Image
                  src="/assets/coach-portrait.png"
                  alt="Monika Kozlowska"
                  className="coach-portrait"
                  width={280}
                  height={373}
                />
              </div>
              <div className="coach-info">
                <h2>Monika Kozlowska</h2>
                <p className="title">Value Selling · Sales Strategy · Presentations</p>
                <p>
                  She blends advanced Sales Methodologies, EQ, Value Selling,
                  Storytelling and Objection Handling to deliver dynamic, practical
                  training that builds confidence, trust and helps teams identify
                  customer challenges faster.
                </p>
                <p>
                  Monika has led enablement programmes for global organisations
                  including Honeywell, Intermec and NICE, where she continues to work
                  today, training hundreds of sales professionals annually—from
                  specialists to senior leaders—and accelerating their time to sell.
                </p>
                <div className="companies">
                  <span className="company-tag">Honeywell</span>
                  <span className="company-tag">Intermec</span>
                  <span className="company-tag">NICE</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="section-connector" />

        {/* Achievements */}
        <section className="section meet-monika-achievements">
          <div className="container">
            <h2 className="section-title">
              Achievements & <span>credentials</span>
            </h2>
            <ul className="meet-monika-list">
              <li>18+ years in sales strategy, value-based communication and presentations</li>
              <li>International experience across UK, Asia and USA</li>
              <li>Led enablement programmes for Fortune 500 and global enterprises</li>
              <li>Trains hundreds of sales professionals annually — from specialists to senior leaders</li>
              <li>Expert in Value Selling, objection handling and storytelling</li>
              <li>Accelerates time-to-sell and builds lasting confidence in teams</li>
            </ul>
          </div>
        </section>

        <div className="section-connector" />

        {/* CTA */}
        <section className="section meet-monika-cta-section">
          <div className="container">
            <h2 className="section-title">
              Ready to learn <span>Value Selling</span>?
            </h2>
            <p className="meet-monika-cta-text">
              Join Monika&apos;s focused 2.5-hour workshop and transform how you
              pitch—from feature-heavy explanations to value-led storytelling.
            </p>
            <Link href="/" className="cta cta-hero">
              Secure your place — £25 deposit
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
