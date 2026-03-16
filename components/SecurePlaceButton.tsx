"use client";

import { useEffect, useState } from "react";
import { useCheckout } from "@/contexts/CheckoutContext";

type Variant = "hero" | "card";

const WORKSHOP_PRODUCT_ID = "workshop-deposit";

export function SecurePlaceButton({ variant = "card" }: { variant?: Variant }) {
  const { openCheckout } = useCheckout();
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const product = data?.products?.find((p: { id: string }) => p.id === WORKSHOP_PRODUCT_ID);
        setSpotsLeft(product?.spotsLeft ?? null);
      })
      .catch(() => setSpotsLeft(null));
  }, []);

  const soldOut = spotsLeft !== null && spotsLeft <= 0;

  if (variant === "hero") {
    return (
      <button
        type="button"
        className="cta cta-hero"
        onClick={openCheckout}
        disabled={soldOut}
      >
        {soldOut ? "Fully booked" : "Secure your place for £25"}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="cta"
        onClick={openCheckout}
        disabled={soldOut}
      >
        {soldOut ? "Fully booked" : "Secure your place now for £25"}
      </button>
      <p className="cta-subtext">
        {spotsLeft !== null
          ? spotsLeft <= 0
            ? "Fully booked · Check back later"
            : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left · Reserve today`
          : "Limited places · Reserve your spot today"}
      </p>
    </>
  );
}
