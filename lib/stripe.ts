import "server-only";
import Stripe from "stripe";

/** Stripe client from STRIPE_SECRET_KEY, with a clear error when it's misconfigured. */
export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is missing. In .env.local add: STRIPE_SECRET_KEY=sk_test_... (no quotes, no spaces around =). Restart the server after saving.",
    );
  }
  if (secretKey.startsWith("pk_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must be the Secret key (sk_test_...), not the Publishable key (pk_test_...). Get the Secret key from Stripe Dashboard → Developers → API keys.",
    );
  }
  if (!secretKey.startsWith("sk_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_. Check for typos, extra spaces, or newlines in .env.local.",
    );
  }
  return new Stripe(secretKey);
}

/** What a Checkout Session pays for; stored in its metadata and used by the webhook. */
export type CheckoutKind = "workshop_deposit" | "workshop_balance" | "package";
