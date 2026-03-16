"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function Coach() {
  const portraitRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = portraitRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="section coach-section">
      <div className="container">
        <h2 className="section-title">
          Meet your <span>coach</span>
        </h2>
        <div className="coach-grid">
          <div
            ref={portraitRef}
            className={`coach-portrait-wrap ${isVisible ? "is-visible" : ""}`}
          >
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
            <p className="title">Sales Strategy · Value Selling · Presentations</p>
            <p>
              An accomplished expert in sales strategy, value-based
              communication and impactful presentations, with over 18 years'
              international experience across the UK, Asia and the USA.
            </p>
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
  );
}
