"use client";

import type { WorkshopPoint } from "@/lib/workshop-categories";
import { useEffect, useRef, useState } from "react";

export function Benefits({ outcomes }: { outcomes: WorkshopPoint[] }) {
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
  }, [outcomes]);

  return (
    <section className="section">
      <div className="container">
        <h2 className="section-title">
          What will you <span>achieve</span>?
        </h2>
        <div className="benefits-grid" ref={gridRef}>
          {outcomes.map((benefit, i) => (
            <article
              key={`${i}-${benefit.title}`}
              className={`benefit-card ${visibleIndices.has(i) ? "is-visible" : ""}`}
              data-card-index={i}
            >
              <div className="icon">{i === 0 ? "↑" : "◇"}</div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
