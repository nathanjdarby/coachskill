import "server-only";
import type Stripe from "stripe";
import { and, eq, isNull, sql } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { onboardAttendee } from "@/lib/attendees";
import { getDb } from "@/lib/db";
import { getDefaultWorkshop, getWorkshopBySlug } from "@/lib/db/queries";
import { signups, workshops, type Signup, type Workshop } from "@/lib/db/schema";
import { emailAdminPayment, emailBalancePaid, emailDepositConfirmed } from "@/lib/email";
import { formatPence } from "@/lib/money";
import { adminEmails } from "@/lib/portal";
import { getStripe, STANDARD_PAYMENTS } from "@/lib/stripe";
import { balanceToken, seatsTaken } from "@/lib/workshops";

function info(w: Workshop) {
  return { workshopName: w.name, startsAt: w.startsAt, location: w.location };
}

async function notifyAdmins(subject: string, lines: string[]) {
  const to = await adminEmails();
  if (to.length) await emailAdminPayment({ to, subject, lines, url: await appUrl("/admin/workshops") });
}

/** checkout.session.completed for a deposit (also sessions created before `kind` existed). */
export async function handleDepositPaid(session: Stripe.Checkout.Session) {
  const slug = session.metadata?.workshop_slug?.trim();
  const workshop = slug ? await getWorkshopBySlug(slug) : await getDefaultWorkshop();
  if (!workshop) {
    console.error("Stripe webhook: no workshop for session", session.id);
    return;
  }
  const email = (session.customer_details?.email || session.customer_email || "").trim().toLowerCase();
  if (!email) {
    console.error("Stripe webhook: missing email on session", session.id);
    return;
  }
  const name = session.metadata?.customer_name?.trim() || session.client_reference_id?.trim() || "Customer";
  const paid = session.amount_total ?? workshop.depositPence;
  const now = new Date();
  const db = getDb();

  // Seats are checked before checkout, but two people can pay for the last one.
  const full = workshop.capacity != null && (await seatsTaken(workshop.id)) >= workshop.capacity;

  const metadataJson = JSON.stringify({ stripe_session_id: session.id, payment_status: session.payment_status });
  const [row] = await db
    .insert(signups)
    .values({
      workshopId: workshop.id,
      name,
      email,
      metadataJson,
      source: "stripe",
      externalId: session.id,
      status: full ? "on_hold" : "pending",
      notes: full ? "Paid after the run was full — offer another date or a refund." : null,
      depositPaidAt: now,
      amountPaidPence: paid,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [signups.source, signups.externalId],
      set: { name, email, metadataJson, updatedAt: now },
    })
    .returning();
  if (!row) return;

  // Claim the confirmation so a replayed event can't email twice.
  const claimed = db
    .update(signups)
    .set({ confirmationSentAt: now })
    .where(and(eq(signups.id, row.id), isNull(signups.confirmationSentAt)))
    .run();
  if (claimed.changes !== 1) return;

  // Every attendee gets a client-area account; a failure here mustn't stop the confirmation.
  let account: { url: string; isNew: boolean } | undefined;
  try {
    const onboarded = await onboardAttendee(row.id);
    if (onboarded.ok) account = { url: onboarded.setupUrl ?? onboarded.portalUrl, isNew: Boolean(onboarded.setupUrl) };
    else console.warn("Attendee onboarding skipped:", onboarded.reason);
  } catch (err) {
    console.error("Attendee onboarding failed", err);
  }
  await emailDepositConfirmed({ to: email, name, balancePence: workshop.balancePence, account, ...info(workshop) });
  await notifyAdmins(full ? `Deposit paid for a FULL workshop: ${name}` : `New workshop booking: ${name}`, [
    `${name} (${email}) paid a ${formatPence(paid)} deposit for ${workshop.name}.`,
    full ? "The run was already full, so the signup is on hold." : "",
  ].filter(Boolean));
}

/** checkout.session.completed for a balance payment. */
export async function handleBalancePaid(session: Stripe.Checkout.Session) {
  const signupId = Number(session.metadata?.signup_id);
  if (!Number.isInteger(signupId)) {
    console.error("Stripe webhook: balance session without signup_id", session.id);
    return;
  }
  const db = getDb();
  const now = new Date();
  const paid = session.amount_total ?? 0;
  const result = db
    .update(signups)
    .set({
      balancePaidAt: now,
      balanceCheckoutSessionId: session.id,
      amountPaidPence: sql`${signups.amountPaidPence} + ${paid}`,
      status: "accepted",
      updatedAt: now,
    })
    .where(and(eq(signups.id, signupId), isNull(signups.balancePaidAt)))
    .run();
  if (result.changes !== 1) return;

  const [row] = await db
    .select({ signup: signups, workshop: workshops })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .where(eq(signups.id, signupId))
    .limit(1);
  if (!row) return;
  await emailBalancePaid({ to: row.signup.email, name: row.signup.name, ...info(row.workshop) });
  await notifyAdmins(`Balance paid: ${row.signup.name}`, [
    `${row.signup.name} paid the ${formatPence(paid)} balance for ${row.workshop.name}. They're fully booked.`,
  ]);
}

/** A fresh Checkout Session for the balance (sessions expire, so one is made per click). */
export async function createBalanceCheckout(signup: Signup, workshop: Workshop) {
  const stripe = getStripe();
  const back = await appUrl("/workshop");
  const session = await stripe.checkout.sessions.create({
    ...STANDARD_PAYMENTS,
    mode: "payment",
    customer_email: signup.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: workshop.balancePence,
          product_data: { name: `${workshop.name} — balance`, description: "Remaining balance for your workshop place" },
        },
      },
    ],
    success_url: `${back}?checkout=balance_paid`,
    cancel_url: `${back}?checkout=canceled`,
    metadata: { kind: "workshop_balance", signup_id: String(signup.id), workshop_slug: workshop.slug },
  });
  return session.url;
}

export async function balancePayUrl(signupId: number) {
  return appUrl(`/pay/balance/${balanceToken(signupId)}`);
}
