import "server-only";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { clientPackages, clients, type Package } from "@/lib/db/schema";
import { emailAdminPayment, emailPackagePurchased } from "@/lib/email";
import { formatPence } from "@/lib/money";
import { adminEmails } from "@/lib/portal";
import { getStripe, STANDARD_PAYMENTS } from "@/lib/stripe";

/** Creates a pending purchase and a Stripe Checkout for it; returns the Checkout URL. */
export async function createPackageCheckout(input: { clientId: number; email: string; pkg: Package }) {
  const { clientId, email, pkg } = input;
  const db = getDb();
  const [purchase] = await db
    .insert(clientPackages)
    .values({
      clientId,
      packageId: pkg.id,
      name: pkg.name,
      pricePence: pkg.pricePence,
      sessionCount: pkg.sessionCount,
      sessionMinutes: pkg.sessionMinutes,
      status: "pending",
      source: "stripe",
      createdAt: new Date(),
    })
    .returning();

  const back = await appUrl("/portal/sessions");
  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create({
      ...STANDARD_PAYMENTS,
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: pkg.pricePence,
            product_data: {
              name: pkg.name,
              description: `${pkg.sessionCount} × ${pkg.sessionMinutes}-minute coaching sessions with Monika`,
            },
          },
        },
      ],
      success_url: `${back}?purchase=success`,
      cancel_url: `${back}?purchase=canceled`,
      metadata: { kind: "package", client_package_id: String(purchase.id), client_id: String(clientId) },
    });
  } catch (err) {
    db.update(clientPackages).set({ status: "cancelled" }).where(eq(clientPackages.id, purchase.id)).run();
    throw err;
  }
  db.update(clientPackages).set({ stripeSessionId: session.id }).where(eq(clientPackages.id, purchase.id)).run();
  return session.url;
}

/** checkout.session.completed for a package purchase. */
export async function handlePackagePaid(session: Stripe.Checkout.Session) {
  const purchaseId = Number(session.metadata?.client_package_id);
  if (!Number.isInteger(purchaseId)) {
    console.error("Stripe webhook: package session without client_package_id", session.id);
    return;
  }
  const db = getDb();
  const result = db
    .update(clientPackages)
    .set({ status: "paid", paidAt: new Date(), stripeSessionId: session.id })
    .where(and(eq(clientPackages.id, purchaseId), eq(clientPackages.status, "pending")))
    .run();
  if (result.changes !== 1) return;

  const [row] = await db
    .select({ purchase: clientPackages, client: clients })
    .from(clientPackages)
    .innerJoin(clients, eq(clientPackages.clientId, clients.id))
    .where(eq(clientPackages.id, purchaseId))
    .limit(1);
  if (!row) return;
  const { purchase, client } = row;
  // Buying coaching makes a workshop attendee a coaching client.
  if (client.kind !== "client") db.update(clients).set({ kind: "client", updatedAt: new Date() }).where(eq(clients.id, client.id)).run();
  await emailPackagePurchased({
    to: client.email,
    name: client.fullName,
    packageName: purchase.name,
    sessionCount: purchase.sessionCount,
    url: await appUrl("/portal/sessions"),
  });
  const to = await adminEmails();
  if (to.length) {
    await emailAdminPayment({
      to,
      subject: `Package bought: ${client.fullName}`,
      lines: [`${client.fullName} bought ${purchase.name} (${purchase.sessionCount} sessions) for ${formatPence(purchase.pricePence)}.`],
      url: await appUrl(`/admin/clients/${client.id}`),
    });
  }
}
