"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function CheckoutBanner() {
  const searchParams = useSearchParams();
  // Read the Stripe redirect param once on mount; it's cleared from the URL below
  const [status, setStatus] = useState<"success" | "canceled" | null>(() => {
    const checkout = searchParams.get("checkout");
    return checkout === "success" || checkout === "canceled" ? checkout : null;
  });

  useEffect(() => {
    if (!searchParams.has("checkout")) return;
    // Clear query from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.pathname);
  }, [searchParams]);

  if (!status) return null;

  return (
    <div
      className={`checkout-banner checkout-banner--${status}`}
      role="status"
      aria-live="polite"
    >
      {status === "success" && (
        <p>
          <strong>Payment successful.</strong> Your place is secured. We&apos;ll
          be in touch with next steps. Please check your spam/junk folder if
          you can&apos;t find your confirmation email.
        </p>
      )}
      {status === "canceled" && (
        <p>
          <strong>Payment canceled.</strong> You can secure your place anytime
          using the button below.
        </p>
      )}
      <button
        type="button"
        className="checkout-banner-dismiss"
        onClick={() => setStatus(null)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
