import Image from "next/image";
import { SecurePlaceButton } from "./SecurePlaceButton";

export function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="poster-frame">
            <Image
              src="/assets/value-selling-poster.png"
              alt="Value Selling Training — Pitch in a way that can increase your sales by up to 30%"
              width={800}
              height={533}
              style={{ width: "100%", height: "auto", borderRadius: "14px" }}
              unoptimized
            />
          </div>
          <div className="hero-content">
            <h1 className="hero-title">Value Selling Training</h1>
            <p className="subtitle">
              A focused 2.5-hour workshop that transforms how you pitch—from
              feature-heavy explanations to value-led storytelling that keeps
              customers engaged.
            </p>
            <SecurePlaceButton variant="hero" />
          </div>
        </div>
      </div>
    </section>
  );
}
