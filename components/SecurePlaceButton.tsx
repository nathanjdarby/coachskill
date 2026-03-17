"use client";

import { useCheckout } from "@/contexts/CheckoutContext";

type Variant = "hero" | "card";

export function SecurePlaceButton({ variant = "card" }: { variant?: Variant }) {
  const { openCheckout } = useCheckout();

  if (variant === "hero") {
    return (
      <button
        type="button"
        className="cta cta-hero"
        onClick={openCheckout}
      >
        Secure your place for £25
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="cta"
        onClick={openCheckout}
      >
        Secure your place now for £25
      </button>
      <p className="cta-subtext">
        Limited places · Reserve your spot today
      </p>
    </>
  );
}
