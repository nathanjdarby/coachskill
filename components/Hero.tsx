import Image from "next/image";
import { placesLabel, type WorkshopOffer } from "@/lib/workshop-offer";
import { formatDateTime } from "@/lib/time";
import { SecurePlaceButton } from "./SecurePlaceButton";

export function Hero({ offers, featured: offer }: { offers: WorkshopOffer[]; featured: WorkshopOffer }) {
  const startsAt = offer.startsAt ? new Date(offer.startsAt) : null;
  const moreDates = offers.filter((o) => o.slug !== offer.slug && o.startsAt).length;
  return (
    <section className="hero workshop-hero">
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
              A focused 2.5-hour small-group workshop that transforms how you
              pitch — from feature-heavy explanations to value-led storytelling
              that keeps customers engaged. Maximum 5 people, so every pitch gets
              real feedback.
            </p>
            {startsAt && (
              <p className="workshop-when">
                <span>{formatDateTime(startsAt)}</span>
                {offer.location && <span>{offer.location}</span>}
                {offer.seatsLeft != null && (
                  <span className={offer.seatsLeft === 0 ? "is-full" : offer.seatsLeft <= 2 ? "is-low" : ""}>
                    {placesLabel(offer.seatsLeft)}
                  </span>
                )}
                {moreDates > 0 && (
                  <a href="#dates" className="workshop-when-more">
                    +{moreDates} more {moreDates === 1 ? "date" : "dates"}
                  </a>
                )}
              </p>
            )}
            <SecurePlaceButton offers={offers} />
          </div>
        </div>
      </div>
    </section>
  );
}
