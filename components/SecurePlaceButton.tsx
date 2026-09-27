"use client";

import { useCheckout } from "@/contexts/CheckoutContext";
import { formatPence } from "@/lib/money";
import { firstBookable, type WorkshopOffer } from "@/lib/workshop-offer";

/**
 * The hero's call to action. With several dates it takes the visitor to the date
 * list; with a single date it opens the checkout straight away.
 */
export function SecurePlaceButton({ offers }: { offers: WorkshopOffer[] }) {
  const { openCheckout } = useCheckout();
  const featured = firstBookable(offers);
  const allFull = offers.every((o) => o.seatsLeft === 0);
  const deposit = formatPence(Math.min(...offers.map((o) => o.depositPence)));

  if (allFull) {
    return (
      <button type="button" className="cta cta-hero" disabled>
        Fully booked
      </button>
    );
  }
  if (offers.length > 1) {
    return (
      <a href="#dates" className="cta cta-hero">
        Choose a date · from {deposit}
      </a>
    );
  }
  return (
    <button type="button" className="cta cta-hero" onClick={() => openCheckout(featured)}>
      Secure your place for {formatPence(featured.depositPence)}
    </button>
  );
}
