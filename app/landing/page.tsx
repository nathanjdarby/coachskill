"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const challengeItems = [
  "I know my value, but in interviews I struggle to explain it clearly.",
  "I have good ideas, but under pressure my confidence drops.",
  "I work hard, yet I don’t always feel seen for what I bring.",
  "I want to stay calm in important conversations, not overwhelmed.",
  "Imposter syndrome keeps showing up and drains my energy.",
  "I’d love support from a mentor who truly understands this.",
];

const programmePillars = [
  {
    title: "Customer-Centric Selling",
    description:
      "Learn to uncover what matters most to your customer and align every conversation to their priorities. This helps you build trust faster and position your offer as genuinely relevant.",
  },
  {
    title: "Value Selling",
    description:
      "Shift from selling features to communicating real business and personal outcomes. You’ll show clear impact so decisions feel easier and more confident for the buyer.",
  },
  {
    title: "Storytelling",
    description:
      "Use clear, memorable stories to make complex ideas easy to understand and act on. Strong narratives help people remember your value long after the meeting ends.",
  },
  {
    title: "Presentation Skills",
    description:
      "Structure your message so it lands with clarity, confidence, and presence. You’ll present in a way that keeps attention and moves people toward action.",
  },
  {
    title: "Objection Handling",
    description:
      "Handle resistance calmly by understanding the concern behind the objection. You’ll turn pushback into productive dialogue instead of pressure or defensiveness.",
  },
  {
    title: "Social Selling",
    description:
      "Build credibility online through consistent, value-led visibility and engagement. This creates warmer conversations before a sales call even starts.",
  },
  {
    title: "Emotional Intelligence",
    description:
      "Read people better, regulate your responses, and communicate with empathy under pressure. Higher EQ strengthens relationships and improves decision-making in tough moments.",
  },
];

const impactRows = [
  {
    skill: "Speak about your work with confidence",
    why: "Be recognised for your strengths without over-explaining or shrinking.",
    impact: "+15–35% higher promotion likelihood",
  },
  {
    skill: "Communicate your value with impact",
    why: "People feel why your work matters — not just understand it.",
    impact: "Better interview, review & strategic conversation outcomes",
  },
  {
    skill: "Express your ideas clearly",
    why: "Your ideas land the first time — and your voice carries weight.",
    impact: "Strong communicators advance 32% faster",
  },
  {
    skill: "Stay calm under pressure",
    why: "Stressful moments show maturity and presence, not anxiety.",
    impact: "Higher resilience = 24% better decision-making",
  },
  {
    skill: "Present with influence",
    why: "Your message is heard, remembered, and acted on.",
    impact: "Engaging communicators are 45% more persuasive",
  },
  {
    skill: "Build emotional intelligence",
    why: "Respond intentionally instead of reacting from stress.",
    impact: "Higher EQ correlates with £18k–£23k higher annual earnings",
  },
  {
    skill: "Grow your personal brand",
    why: "Be recognised before you speak — online and offline.",
    impact: "Visible professionals get 4–6× more opportunities",
  },
];

const numberStats = [
  { label: "Higher earnings", value: 30, text: "+10–30%" },
  { label: "More deals closed", value: 25, text: "+25%" },
  { label: "Greater client loyalty", value: 40, text: "+40%" },
  { label: "More leads through social selling", value: 45, text: "+45%" },
  { label: "Likelihood of becoming a top performer", value: 63, text: "+63%" },
];

export default function LandingPage() {
  const [activePillarTitle, setActivePillarTitle] = useState<string | null>(null);
  const [hoveredPillarTitle, setHoveredPillarTitle] = useState<string | null>(null);
  const pillarCarouselRef = useRef<HTMLDivElement | null>(null);
  const autoScrollDirectionRef = useRef<"left" | "right" | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activePillarTitle) {
      return;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePillarTitle(null);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activePillarTitle]);

  useEffect(() => {
    const stopAutoScroll = () => {
      if (autoScrollFrameRef.current) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
    };

    const tick = () => {
      const container = pillarCarouselRef.current;
      const direction = autoScrollDirectionRef.current;

      if (!container || !direction) {
        stopAutoScroll();
        return;
      }

      const delta = direction === "left" ? -2.2 : 2.2;
      container.scrollLeft += delta;
      autoScrollFrameRef.current = window.requestAnimationFrame(tick);
    };

    if (autoScrollDirectionRef.current && !autoScrollFrameRef.current) {
      autoScrollFrameRef.current = window.requestAnimationFrame(tick);
    }

    if (!autoScrollDirectionRef.current) {
      stopAutoScroll();
    }

    return stopAutoScroll;
  }, [hoveredPillarTitle]);

  const activePillar = programmePillars.find((pillar) => pillar.title === activePillarTitle) ?? null;

  const scrollPillars = (direction: "left" | "right") => {
    const container = pillarCarouselRef.current;
    if (!container) {
      return;
    }

    const scrollAmount = Math.max(container.clientWidth * 0.7, 220);
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleCarouselPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const container = pillarCarouselRef.current;
    if (!container || event.pointerType === "touch") {
      return;
    }

    const rect = container.getBoundingClientRect();
    const edgeZone = Math.min(130, rect.width * 0.24);
    const localX = event.clientX - rect.left;

    if (localX <= edgeZone) {
      autoScrollDirectionRef.current = "left";
      return;
    }

    if (localX >= rect.width - edgeZone) {
      autoScrollDirectionRef.current = "right";
      return;
    }

    autoScrollDirectionRef.current = null;
  };

  const stopCarouselAutoScroll = () => {
    autoScrollDirectionRef.current = null;
  };

  return (
    <>
      <Header />
      <main>
        <section className="section coachskill-hero" id="top">
          <div className="container coachskill-stack">
            <p className="eyebrow">CoachSkill</p>
            <h1 className="hero-title">The training company that makes you more money.</h1>
            <p className="subtitle">
              We transform corporate teams, small businesses and individuals into strong sellers
              who sell outcomes — not just products — and actually enjoy what they do.
            </p>
            <a className="cta cta-hero" href="#people-buy-from-people">
              What does this mean for you?
            </a>
          </div>
        </section>

        <div className="section-connector" />

        <section className="section" id="people-buy-from-people">
          <div className="container coachskill-stack">
            <h2 className="section-title">
              <span>People buy from people.</span>
            </h2>
            <p className="section-lead">
              We develop you (or your team) into high-performing trusted advisors — calm,
              confident, clear and deeply customer-focused.
            </p>
            <p className="section-lead">
              You understand what the customer is thinking, show what truly solves their
              challenges, and communicate with empathy so they feel heard and ready to trust you.
            </p>
          </div>
        </section>

        <div className="section-connector" />

        <section className="section">
          <div className="container coachskill-stack">
            <h2 className="section-title">
              <span>How we do it</span>
            </h2>
            <div className="pill-carousel-shell">
              <button
                type="button"
                className="pill-carousel-control"
                aria-label="Scroll pillars left"
                onClick={() => scrollPillars("left")}
              >
                ←
              </button>
              <div
                className="pill-grid"
                ref={pillarCarouselRef}
                aria-label="How we do it pillars"
                onPointerMove={handleCarouselPointerMove}
                onPointerLeave={stopCarouselAutoScroll}
              >
                {programmePillars.map((pillar) => (
                  <button
                    key={pillar.title}
                    type="button"
                    className={`pill-card pill-card-button ${hoveredPillarTitle === pillar.title ? "is-hovered" : ""}`}
                    aria-label={`Open ${pillar.title} pillar explanation`}
                    onClick={() => setActivePillarTitle(pillar.title)}
                    onPointerEnter={() => setHoveredPillarTitle(pillar.title)}
                    onPointerLeave={() => setHoveredPillarTitle(null)}
                  >
                    <span className="pill-card-title">{pillar.title}</span>
                    <span className="pill-card-hint" aria-hidden="true">
                      Click to learn more →
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="pill-carousel-control"
                aria-label="Scroll pillars right"
                onClick={() => scrollPillars("right")}
              >
                →
              </button>
            </div>
            <p className="section-lead">
              Through dynamic team workshops and 1:1 mentoring, we help you turn cold leads into
              warm conversations — and warm conversations into paid business.
            </p>
          </div>
        </section>

        <div className="section-connector" />

        <section className="section">
          <div className="container coachskill-stack">
            <h2 className="section-title">
              <span>Any of this feel familiar?</span>
            </h2>
            <div className="dialogue-thread" role="list" aria-label="Common confidence challenges">
              {challengeItems.map((item, index) => (
                <div
                  key={item}
                  className={`dialogue-bubble ${index % 2 === 0 ? "left" : "right"}`}
                  role="listitem"
                >
                  {item}
                </div>
              ))}
            </div>
            <a className="cta cta-hero" href="#work-together">
              Yes — this sounds like me
            </a>
          </div>
        </section>

        <div className="section-connector" />

        <section className="section coach-section">
          <div className="container coachskill-stack">
            <h2 className="section-title">
              <span>What you will achieve</span>
            </h2>
            <div className="impact-table">
              {impactRows.map((row) => (
                <article key={row.skill} className="impact-row">
                  <h3>{row.skill}</h3>
                  <p>{row.why}</p>
                  <strong>{row.impact}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="section-connector" />

        <section className="section" id="work-together">
          <div className="container coachskill-stack">
            <h2 className="section-title">
              <span>Two ways we can work together</span>
            </h2>
            <div className="options-grid">
              <article className="option-card">
                <h3>Option 1: 1:1 Personalised Coaching</h3>
                <p>
                  A tailored programme built around your goals. Choose a focused intensive or a
                  3-month development journey.
                </p>
                <ul>
                  <li>Individual attention</li>
                  <li>Personal feedback</li>
                  <li>A mentor in your corner</li>
                  <li>Visible growth in communication, confidence and presence</li>
                </ul>
                <a className="cta" href="#contact">Book a discovery call</a>
              </article>

              <article className="option-card">
                <h3>Option 2: Group Training + Mentoring</h3>
                <p>
                  Learn and grow with a supportive community of people aiming for similar outcomes.
                </p>
                <ul>
                  <li>Practical communication and confidence training</li>
                  <li>Live group practice sessions</li>
                  <li>Direct mentoring and feedback</li>
                  <li>Shared encouragement and accountability</li>
                </ul>
                <a className="cta" href="#contact">Join the group programme</a>
              </article>
            </div>
          </div>
        </section>

        <div className="section-connector" />

        <section className="section" aria-labelledby="numbers-heading">
          <div className="container coachskill-stack">
            <h2 className="section-title" id="numbers-heading">
              <span>In numbers, not promises</span>
            </h2>

            <div className="numbers-visual-wrap">
              <article className="donut-card" aria-labelledby="impact-summary-title">
                <h3 id="impact-summary-title" className="sr-only">
                  Overall impact summary
                </h3>
                <div className="donut-chart" role="img" aria-label="Average uplift 41 percent">
                  <div className="donut-inner">
                    <strong>41%</strong>
                    <span>avg uplift</span>
                  </div>
                </div>
                <p>Average uplift across earnings, sales consistency and visibility outcomes.</p>
              </article>

              <ul className="stats-bars" aria-label="Performance metrics">
                {numberStats.map((stat) => (
                  <li key={stat.label} className="stat-bar-card">
                    <div className="stat-label-row">
                      <h3>{stat.label}</h3>
                      <strong>{stat.text}</strong>
                    </div>
                    <div className="stat-track" aria-hidden="true">
                      <span className="stat-fill" style={{ width: `${stat.value}%` }} />
                    </div>
                    <p className="sr-only">{`${stat.label}: ${stat.text}`}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="section-connector" />

        <section className="section" id="contact">
          <div className="container coach-grid">
            <div className="coach-portrait-wrap is-visible">
              <img src="/assets/coach-portrait.png" alt="Monika Kozlowska" className="coach-portrait" />
            </div>
            <div className="coach-info">
              <h2>Monika Kozlowska, MA, BA</h2>
              <p className="title">Founder of CoachSkill</p>
              <p>
                Sales strategy and value-based communication expert with 18+ years of international
                experience across the UK, Asia and the USA.
              </p>
              <p>
                Monika combines CustomerCentric Selling®, ValueSelling®, storytelling, presentation
                mastery and emotional intelligence to deliver practical training that builds
                confidence and trust.
              </p>
              <p>
                She has led enablement programmes for global organisations including Honeywell,
                Intermec and NICE, and trains hundreds of sales professionals every year.
              </p>
              <a className="cta" href="/meet-monika">
                Meet Monika
              </a>
            </div>
          </div>
        </section>

        {activePillar && (
          <div
            className="pillar-modal-overlay"
            role="presentation"
            onClick={() => setActivePillarTitle(null)}
          >
            <div
              className="pillar-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pillar-modal-title"
              aria-describedby="pillar-modal-description"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="pillar-modal-close"
                aria-label="Close pillar explanation"
                onClick={() => setActivePillarTitle(null)}
              >
                ×
              </button>
              <h3 id="pillar-modal-title">{activePillar.title}</h3>
              <p id="pillar-modal-description">{activePillar.description}</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
