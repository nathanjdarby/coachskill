import "server-only";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { FormState } from "@/app/actions/types";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import {
  bookingLinks,
  clientNotes,
  clientPackages,
  clients,
  coachingSessions,
  messages,
  passwordTokens,
  resourceShares,
  signups,
  users,
  type Client,
  type User,
} from "@/lib/db/schema";
import { emailPortalInvite } from "@/lib/email";
import { INVITE_TTL_MS, RESET_TTL_MS, hashToken, newToken } from "@/lib/tokens";

export const MIN_PASSWORD_LENGTH = 10;

export async function findUserByEmail(email: string) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return user ?? null;
}

/** The portal login for a client, creating it (without a password) if needed. */
export async function ensureClientUser(client: Client): Promise<{ user: User } | { error: string }> {
  const db = getDb();
  const [linked] = await db.select().from(users).where(eq(users.clientId, client.id)).limit(1);
  if (linked) return { user: linked };

  const byEmail = await findUserByEmail(client.email);
  if (byEmail) {
    return { error: `${client.email} already belongs to another account.` };
  }

  const now = new Date();
  const [user] = await db
    .insert(users)
    .values({
      email: client.email.toLowerCase(),
      name: client.fullName,
      role: "client",
      clientId: client.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return { user };
}

/** Issues a fresh single-use link, cancelling any earlier unused ones for this user. */
export async function issuePasswordToken(userId: number, purpose: "invite" | "reset") {
  const db = getDb();
  const now = new Date();
  await db
    .update(passwordTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordTokens.userId, userId), isNull(passwordTokens.usedAt)));

  const { token, tokenHash } = newToken();
  await db.insert(passwordTokens).values({
    userId,
    tokenHash,
    purpose,
    expiresAt: new Date(now.getTime() + (purpose === "invite" ? INVITE_TTL_MS : RESET_TTL_MS)),
    createdAt: now,
  });
  return token;
}

/** A still-valid token and its user, or null. */
export async function lookupPasswordToken(token: string) {
  const [row] = await getDb()
    .select({ token: passwordTokens, user: users })
    .from(passwordTokens)
    .innerJoin(users, eq(passwordTokens.userId, users.id))
    .where(eq(passwordTokens.tokenHash, hashToken(token)))
    .limit(1);
  if (!row || row.token.usedAt || row.token.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) return "The passwords don't match.";
  return null;
}

/**
 * Emails someone a fresh link to create their password. If email can't be sent,
 * the result carries the link so the admin can pass it on themselves.
 */
export async function sendAccountInvite(user: Pick<User, "id" | "email" | "name" | "role">): Promise<FormState> {
  const token = await issuePasswordToken(user.id, "invite");
  const link = await appUrl(`/set-password/${token}`);
  const sent = await emailPortalInvite({ to: user.email, name: user.name, url: link, role: user.role });
  if (sent.ok) {
    return { ok: true, message: `Invite emailed to ${user.email}. The link expires in 7 days.` };
  }
  return {
    ok: false,
    message:
      sent.reason === "not_configured"
        ? "Email isn't set up yet (RESEND_API_KEY is missing), so nothing was sent. Copy this link and send it to them yourself — it won't be shown again:"
        : "The invite email couldn't be sent. Copy this link and send it to them yourself — it won't be shown again:",
    link,
  };
}

/** Everyone who can sign in (or has been invited to), admins first. */
export async function listUsers() {
  return getDb()
    .select({ user: users, client: clients })
    .from(users)
    .leftJoin(clients, eq(users.clientId, clients.id))
    .orderBy(asc(users.role), asc(users.name));
}

/**
 * Permanently deletes a client and everything that belongs only to them: their
 * sign-in, messages, notes, sessions, packages and resource shares. Workshop
 * bookings and discovery-call answers are kept as records but unlinked.
 */
export function purgeClient(clientId: number) {
  const db = getDb();
  db.transaction(() => {
    const account = db.select({ id: users.id }).from(users).where(eq(users.clientId, clientId)).get();
    db.delete(messages).where(eq(messages.clientId, clientId)).run();
    db.delete(clientNotes).where(eq(clientNotes.clientId, clientId)).run();
    // Discovery calls go back to being the prospect's (kept with the request); other sessions go.
    db.update(coachingSessions)
      .set({ clientId: null })
      .where(and(eq(coachingSessions.clientId, clientId), isNotNull(coachingSessions.discoveryCallId)))
      .run();
    const doomed = db.select({ id: coachingSessions.id }).from(coachingSessions).where(eq(coachingSessions.clientId, clientId)).all();
    if (doomed.length) {
      db.update(bookingLinks)
        .set({ appointmentId: null })
        .where(inArray(bookingLinks.appointmentId, doomed.map((d) => d.id)))
        .run();
    }
    db.delete(coachingSessions).where(eq(coachingSessions.clientId, clientId)).run();
    db.delete(clientPackages).where(eq(clientPackages.clientId, clientId)).run();
    db.delete(resourceShares).where(eq(resourceShares.clientId, clientId)).run();
    db.update(signups).set({ clientId: null, updatedAt: new Date() }).where(eq(signups.clientId, clientId)).run();
    if (account) {
      db.delete(passwordTokens).where(eq(passwordTokens.userId, account.id)).run();
      db.delete(users).where(eq(users.id, account.id)).run();
    }
    db.delete(clients).where(eq(clients.id, clientId)).run();
  });
}
