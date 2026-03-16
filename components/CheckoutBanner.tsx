"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function CheckoutBanner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"success" | "canceled" | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success" || checkout === "canceled") {
      setStatus(checkout);
      // Clear query from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.pathname);
    }
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
