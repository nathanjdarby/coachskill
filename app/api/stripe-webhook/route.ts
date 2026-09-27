import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { stripeEvents } from "@/lib/db/schema";
import { handlePackagePaid } from "@/lib/payments/package";
import { handleBalancePaid, handleDepositPaid } from "@/lib/payments/workshop";
import { getStripe, type CheckoutKind } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: "Webhook secret or signature missing" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });

  // Stripe retries deliveries; record each event once and skip repeats.
  const db = getDb();
  const fresh = db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type, receivedAt: new Date() })
    .onConflictDoNothing()
    .run();
  if (fresh.changes !== 1) return NextResponse.json({ received: true, duplicate: true });

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return NextResponse.json({ received: true });

  // Sessions created before `kind` existed are all workshop deposits.
  const kind = (session.metadata?.kind || "workshop_deposit") as CheckoutKind;
  try {
    if (kind === "workshop_deposit") await handleDepositPaid(session);
    else if (kind === "workshop_balance") await handleBalancePaid(session);
    else if (kind === "package") await handlePackagePaid(session);
    else console.warn("Stripe webhook: unhandled checkout kind", kind, session.id);
  } catch (err) {
    // Let Stripe retry: forget the event so the retry isn't treated as a duplicate.
    db.delete(stripeEvents).where(eq(stripeEvents.id, event.id)).run();
    throw err;
  }

  return NextResponse.json({ received: true });
}
