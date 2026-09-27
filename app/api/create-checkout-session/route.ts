import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getWorkshopBySlug } from "@/lib/db/queries";
import type { Workshop } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";
import { featuredWorkshop, seatsTaken } from "@/lib/workshops";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The run being booked: the one asked for, else the featured upcoming run. */
async function workshopToBook(slug: string | undefined): Promise<{ workshop: Workshop | null; error?: string }> {
  if (slug) {
    const w = await getWorkshopBySlug(slug);
    if (!w || !w.published || !w.startsAt || w.startsAt.getTime() <= Date.now()) {
      return { workshop: null, error: "That workshop date isn't available any more. Please refresh the page." };
    }
    if (w.capacity != null && (await seatsTaken(w.id)) >= w.capacity) {
      return { workshop: null, error: "Sorry, that workshop is now fully booked." };
    }
    return { workshop: w };
  }
  const featured = await featuredWorkshop();
  if (featured?.seatsLeft === 0) return { workshop: null, error: "Sorry, the workshop is fully booked." };
  return { workshop: featured };
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, workshopSlug } = (await request.json()) as {
      name?: string;
      email?: string;
      workshopSlug?: string;
    };

    if (!name?.trim() || !email?.trim() || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Name and a valid email are required" }, { status: 400 });
    }

    const { workshop, error } = await workshopToBook(workshopSlug?.trim() || undefined);
    if (error) return NextResponse.json({ error }, { status: 409 });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const workshopUrl = `${baseUrl.replace(/\/+$/, "")}/workshop`;
    // Without a dated run, fall back to the original single-workshop setup.
    const slug = workshop?.slug ?? (process.env.DEFAULT_WORKSHOP_SLUG?.trim() || "value-selling");
    const priceId = process.env.STRIPE_PRICE_ID?.trim();

    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] =
      !workshop && priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              quantity: 1,
              price_data: {
                currency: "gbp",
                unit_amount: workshop?.depositPence ?? 2500,
                product_data: {
                  name: `${workshop?.name ?? "Value Selling Workshop"} — Deposit`,
                  description: "Deposit to secure your place",
                  images: process.env.NEXT_PUBLIC_STRIPE_IMAGE_URL ? [process.env.NEXT_PUBLIC_STRIPE_IMAGE_URL] : undefined,
                },
              },
            },
          ];

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: email.trim(),
      client_reference_id: name.trim(),
      success_url: `${workshopUrl}?checkout=success`,
      cancel_url: `${workshopUrl}?checkout=canceled`,
      // Short expiry keeps the seat check meaningful.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: {
        kind: "workshop_deposit",
        customer_name: name.trim(),
        workshop_slug: slug,
        product_id: process.env.STRIPE_PRODUCT_ID?.trim() || "workshop-deposit",
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Checkout session failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
