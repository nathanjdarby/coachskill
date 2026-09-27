"use client";

import { useCheckout } from "@/contexts/CheckoutContext";
import { formatPence } from "@/lib/money";
import type { WorkshopOffer } from "@/lib/workshop-offer";

type Variant = "hero" | "card";

export function SecurePlaceButton({ variant = "card", offer }: { variant?: Variant; offer: WorkshopOffer }) {
  const { openCheckout } = useCheckout();
  const full = offer.seatsLeft === 0;
  const deposit = formatPence(offer.depositPence);
  const open = () => openCheckout(offer);

  if (variant === "hero") {
    return (
      <button type="button" className="cta cta-hero" onClick={open} disabled={full}>
        {full ? "Fully booked" : `Secure your place for ${deposit}`}
      </button>
    );
  }

  return (
    <>
      <button type="button" className="cta" onClick={open} disabled={full}>
        {full ? "Fully booked" : `Secure your place now for ${deposit}`}
      </button>
      <p className="cta-subtext">
        {full
          ? "This date is full — message Monika to join the waiting list."
          : offer.seatsLeft != null
            ? `${offer.seatsLeft} ${offer.seatsLeft === 1 ? "place" : "places"} left · Reserve your spot today`
            : "Limited places · Reserve your spot today"}
      </p>
    </>
  );
}
