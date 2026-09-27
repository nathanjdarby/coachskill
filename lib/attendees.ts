import "server-only";
import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { ensureClientUser, findUserByEmail, issuePasswordToken } from "@/lib/accounts";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { clients, signups, workshops, type Client } from "@/lib/db/schema";

export type Onboarded =
  | { ok: true; client: Client; setupUrl: string | null; portalUrl: string }
  | { ok: false; reason: string };

/**
 * Gives a workshop booking a client-area account: finds or creates the client
 * (as a workshop attendee), links the booking to it and makes sure they have a
 * login. Returns a set-password link for new accounts, or null if they can
 * already sign in.
 */
export async function onboardAttendee(signupId: number): Promise<Onboarded> {
  const db = getDb();
  const [signup] = await db.select().from(signups).where(eq(signups.id, signupId)).limit(1);
  if (!signup) return { ok: false, reason: "Signup not found." };
  const email = signup.email.trim().toLowerCase();

  const existingUser = await findUserByEmail(email);
  if (existingUser?.role === "admin") {
    return { ok: false, reason: `${email} is an admin login, so no client account was created.` };
  }

  let client: Client | null = null;
  if (existingUser?.clientId) {
    [client] = await db.select().from(clients).where(eq(clients.id, existingUser.clientId)).limit(1);
  }
  if (!client) {
    [client] = await db.select().from(clients).where(sql`lower(${clients.email}) = ${email}`).limit(1);
  }
  if (!client) {
    const now = new Date();
    [client] = await db
      .insert(clients)
      .values({ fullName: signup.name, email, company: signup.company, kind: "attendee", createdAt: now, updatedAt: now })
      .returning();
  }
  if (signup.clientId !== client.id) {
    db.update(signups).set({ clientId: client.id, updatedAt: new Date() }).where(eq(signups.id, signup.id)).run();
  }

  const account = await ensureClientUser(client);
  if ("error" in account) return { ok: false, reason: account.error };
  const portalUrl = await appUrl("/portal");
  const setupUrl = account.user.passwordHash
    ? null
    : await appUrl(`/set-password/${await issuePasswordToken(account.user.id, "invite")}`);
  return { ok: true, client, setupUrl, portalUrl };
}

/** A client's paid workshop bookings (linked, or matching their email), soonest first. */
export async function workshopBookingsFor(client: Pick<Client, "id" | "email">) {
  return getDb()
    .select({ signup: signups, workshop: workshops })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .where(
      and(
        isNotNull(signups.depositPaidAt),
        sql`${signups.status} != 'declined'`,
        or(eq(signups.clientId, client.id), sql`lower(${signups.email}) = lower(${client.email})`),
      ),
    )
    .orderBy(desc(workshops.startsAt));
}
