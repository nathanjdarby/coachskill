"use client";

import { useEffect, useRef, useState } from "react";

const BENEFITS = [
  {
    icon: "↑",
    title: "Pitch for results",
    description: (
      <>
        Pitch in a way that can{" "}
        <span className="highlight-stat">increase your sales by up to 30%</span>.
      </>
    ),
  },
  {
    icon: "◇",
    title: "Clear structure",
    description:
      "A clear value-selling pitch structure that guides the customer through the conversation.",
  },
  {
    icon: "◇",
    title: "Engaged customers",
    description:
      "Keep customers engaged throughout the entire pitch, not just at the start.",
  },
  {
    icon: "◇",
    title: "Value-led storytelling",
    description:
      "Replace feature-heavy explanations with value-led storytelling.",
  },
  {
    icon: "◇",
    title: "Greater confidence",
    description: "Build greater confidence in customer conversations.",
  },
  {
    icon: "◇",
    title: "Simple language",
    description:
      "Use simple, human language so customers instantly understand what you're offering.",
  },
];

export function Benefits() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = grid.querySelectorAll("[data-card-index]");
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIndices((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const idx = entry.target.getAttribute("data-card-index");
            if (idx != null) next.add(Number(idx));
          });
          return next;
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    cards.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="section">
      <div className="container">
        <h2 className="section-title">
          What will you <span>achieve</span>?
        </h2>
        <div className="benefits-grid" ref={gridRef}>
          {BENEFITS.map((benefit, i) => (
            <article
              key={benefit.title}
              className={`benefit-card ${visibleIndices.has(i) ? "is-visible" : ""}`}
              data-card-index={i}
            >
              <div className="icon">{benefit.icon}</div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
