"use client";

import { useState } from "react";
import { useCheckout } from "@/contexts/CheckoutContext";
import { formatPence } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { placesLabel, type WorkshopOffer } from "@/lib/workshop-offer";

/**
 * Pick a date, then pay. The date cards are the only place a date is chosen;
 * the pay button stays disabled until one is selected.
 */
export function WorkshopBooking({ offers, initialSlug }: { offers: WorkshopOffer[]; initialSlug?: string }) {
  const { openCheckout } = useCheckout();
  const dated = offers.filter((o) => o.startsAt);
  const bookable = offers.filter((o) => o.seatsLeft !== 0);
  // A single bookable date (or the undated fallback) needs no choice.
  // A date picked on the listing arrives preselected.
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    bookable.find((o) => o.slug === initialSlug)?.slug ?? (bookable.length === 1 ? bookable[0].slug : null),
  );
  const selected = offers.find((o) => o.slug === selectedSlug && o.seatsLeft !== 0) ?? (dated.length === 0 ? offers[0] : null);

  const priceLabel = (key: "depositPence" | "balancePence") => {
    if (selected) return formatPence(selected[key]);
    const amounts = offers.map((o) => o[key]);
    const min = Math.min(...amounts);
    return `${amounts.some((a) => a !== min) ? "from " : ""}${formatPence(min)}`;
  };
  const allFull = offers.every((o) => o.seatsLeft === 0);

  return (
    <div className="workshop-book">
      {dated.length > 0 && (
        <div className="workshop-dates" id="dates">
          <h3>{dated.length === 1 ? "Date" : "Choose your date"}</h3>
          <div className="workshop-date-list" role="radiogroup" aria-label="Workshop dates">
            {dated.map((o) => {
              const full = o.seatsLeft === 0;
              const isSelected = o.slug === selected?.slug;
              return (
                <button
                  key={o.slug}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={full}
                  className={`workshop-date ${isSelected ? "is-selected" : ""} ${full ? "is-full" : ""}`}
                  onClick={() => setSelectedSlug(o.slug)}
                >
                  <span className="workshop-date-radio" aria-hidden />
                  <span className="workshop-date-text">
                    <span className="workshop-date-when">{formatDateTime(new Date(o.startsAt!))}</span>
                    <span className="workshop-date-meta">{[o.location, placesLabel(o.seatsLeft)].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="payment-card">
        <h3>Payment</h3>
        {selected?.startsAt && <p className="payment-date">{formatDateTime(new Date(selected.startsAt))}</p>}
        <div className="price-row">
          <span className="label">Deposit now to secure your place</span>
          <span className="amount highlight">{priceLabel("depositPence")}</span>
        </div>
        <div className="price-row">
          <span className="label">Balance (1 week prior to workshop)</span>
          <span className="amount">{priceLabel("balancePence")}</span>
        </div>
        <button type="button" className="cta" disabled={!selected || allFull} onClick={() => selected && openCheckout(selected)}>
          {allFull ? "Fully booked" : selected ? `Secure your place for ${formatPence(selected.depositPence)}` : "Select a date above"}
        </button>
        <p className="cta-subtext">
          {allFull
            ? "Every date is full — message Monika to join the waiting list."
            : selected
              ? (placesLabel(selected.seatsLeft) ?? "Limited places") + " · Reserve your spot today"
              : `${bookable.length} dates available — choose one to continue`}
        </p>
      </div>
    </div>
  );
}
