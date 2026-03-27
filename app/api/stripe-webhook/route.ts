import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/lib/db";
import { signups } from "@/lib/db/schema";
import { getWorkshopBySlug, getDefaultWorkshop } from "@/lib/db/queries";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const slug = session.metadata?.workshop_slug?.trim();
    const workshop = slug
      ? await getWorkshopBySlug(slug)
      : await getDefaultWorkshop();
    if (!workshop) {
      console.error("Stripe webhook: no workshop for session", session.id);
      return NextResponse.json({ received: true });
    }

    const name =
      session.metadata?.customer_name?.trim() ||
      session.client_reference_id?.trim() ||
      "Customer";
    const email = session.customer_email?.trim() || "";
    if (!email) {
      console.error("Stripe webhook: missing email on session", session.id);
      return NextResponse.json({ received: true });
    }

    const db = getDb();
    const now = new Date();
    await db
      .insert(signups)
      .values({
        workshopId: workshop.id,
        name,
        email,
        metadataJson: JSON.stringify({
          stripe_session_id: session.id,
          payment_status: session.payment_status,
        }),
        source: "stripe",
        externalId: session.id,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [signups.source, signups.externalId],
        set: {
          name,
          email,
          updatedAt: now,
          metadataJson: JSON.stringify({
            stripe_session_id: session.id,
            payment_status: session.payment_status,
          }),
        },
      });
  }

  return NextResponse.json({ received: true });
}
