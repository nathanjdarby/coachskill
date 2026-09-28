import Image from "next/image";
import { placesLabel, type WorkshopOffer } from "@/lib/workshop-offer";
import { formatDateTime } from "@/lib/time";
import { SecurePlaceButton } from "./SecurePlaceButton";
import { WorkshopArt } from "./WorkshopArt";

type HeroContent = { title: string; intro: string; imageUrl: string | null; category: string };

export function Hero({
  content,
  offers,
  featured: offer,
}: {
  content: HeroContent;
  offers: WorkshopOffer[];
  featured: WorkshopOffer | null;
}) {
  const startsAt = offer?.startsAt ? new Date(offer.startsAt) : null;
  const moreDates = offers.filter((o) => o.slug !== offer?.slug && o.startsAt).length;
  return (
    <section className="hero workshop-hero">
      <div className="container">
        <div className="hero-grid">
          <div className="poster-frame">
            {content.imageUrl ? (
              <Image
                src={content.imageUrl}
                alt={content.title}
                width={800}
                height={533}
                style={{ width: "100%", height: "auto", borderRadius: "14px" }}
                unoptimized
              />
            ) : (
              <WorkshopArt category={content.category} title={content.title} />
            )}
          </div>
          <div className="hero-content">
            <p className="eyebrow">{content.category}</p>
            <h1 className="hero-title">{content.title}</h1>
            <p className="subtitle">{content.intro}</p>
            {offer && startsAt && (
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
            {offers.length > 0 ? (
              <SecurePlaceButton offers={offers} />
            ) : (
              <a href="#dates" className="cta cta-hero">
                Register your interest
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
