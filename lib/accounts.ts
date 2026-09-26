import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { passwordTokens, users, type Client, type User } from "@/lib/db/schema";
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
