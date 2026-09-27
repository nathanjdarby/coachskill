"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const STATUSES = ["success", "canceled", "balance_paid", "invalid_link", "error"] as const;
type Status = (typeof STATUSES)[number];

export function CheckoutBanner() {
  const searchParams = useSearchParams();
  // Read the Stripe redirect param once on mount; it's cleared from the URL below
  const [status, setStatus] = useState<Status | null>(() => {
    const checkout = searchParams.get("checkout");
    return STATUSES.includes(checkout as Status) ? (checkout as Status) : null;
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
      className={`checkout-banner checkout-banner--${status === "balance_paid" ? "success" : status === "success" ? "success" : "canceled"}`}
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
      {status === "balance_paid" && (
        <p>
          <strong>You&apos;re fully paid.</strong> Thank you — your place on the
          workshop is confirmed. See you there!
        </p>
      )}
      {status === "invalid_link" && (
        <p>
          <strong>That payment link isn&apos;t valid.</strong> Please reply to
          your email from Monika and she&apos;ll sort it out.
        </p>
      )}
      {status === "error" && (
        <p>
          <strong>We couldn&apos;t open the payment page.</strong> Please try the
          link again in a moment.
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
