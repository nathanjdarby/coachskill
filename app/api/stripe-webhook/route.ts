import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const raw = process.env.STRIPE_SECRET_KEY?.trim();
  if (!raw?.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY missing or invalid");
  return new Stripe(raw);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret || !sig) {
    return NextResponse.json(
      { error: "Webhook secret or signature missing" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Payment completed — no inventory tracking needed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("Checkout completed:", session.id, session.customer_email);
  }

  return NextResponse.json({ received: true });
}
