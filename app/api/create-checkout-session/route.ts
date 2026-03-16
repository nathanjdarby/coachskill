import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSpotsLeft } from "@/lib/inventory";

const WORKSHOP_PRODUCT_ID = "workshop-deposit";

function getStripe() {
  const raw = process.env.STRIPE_SECRET_KEY;
  const secretKey = raw?.trim();
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is missing. In .env.local add: STRIPE_SECRET_KEY=sk_test_... (no quotes, no spaces around =). Restart the server after saving."
    );
  }
  if (secretKey.startsWith("pk_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must be the Secret key (sk_test_...), not the Publishable key (pk_test_...). Get the Secret key from Stripe Dashboard → Developers → API keys."
    );
  }
  if (!secretKey.startsWith("sk_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_. Check for typos, extra spaces, or newlines in .env.local."
    );
  }
  return new Stripe(secretKey);
}

export async function POST(request: NextRequest) {
  try {
    const { name, email } = (await request.json()) as {
      name?: string;
      email?: string;
    };

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    const spotsLeft = await getSpotsLeft(WORKSHOP_PRODUCT_ID);
    if (spotsLeft !== null && spotsLeft <= 0) {
      return NextResponse.json(
        { error: "This workshop is fully booked. No places left." },
        { status: 403 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const stripe = getStripe();
    const priceId = process.env.STRIPE_PRICE_ID?.trim();

    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: "gbp",
              unit_amount: 2500, // £25.00 fallback
              product_data: {
                name: "Value Selling Workshop — Deposit",
                description: "£25 deposit to secure your place",
                images: process.env.NEXT_PUBLIC_STRIPE_IMAGE_URL
                  ? [process.env.NEXT_PUBLIC_STRIPE_IMAGE_URL]
                  : undefined,
              },
            },
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: email.trim(),
      client_reference_id: name.trim(),
      success_url: `${baseUrl}?checkout=success`,
      cancel_url: `${baseUrl}?checkout=canceled`,
      metadata: {
        customer_name: name.trim(),
        product_id: process.env.STRIPE_PRODUCT_ID?.trim() || WORKSHOP_PRODUCT_ID,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    const message =
      err instanceof Error ? err.message : "Checkout session failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
