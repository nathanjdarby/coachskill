import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";

// Data access checks. Every admin/portal page and server action goes through
// these rather than trusting the session cookie alone: the user must still
// exist, have a password, and not have changed it since signing in.

export const currentUser = cache(async (): Promise<User | null> => {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!Number.isInteger(id)) return null;
  const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  if (!user?.passwordHash || user.sessionVersion !== session?.user?.sessionVersion) {
    return null;
  }
  return user;
});

export async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/portal");
  return user;
}

export async function requireClient(): Promise<User & { clientId: number }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "client" || user.clientId === null) redirect("/admin");
  return user as User & { clientId: number };
}

/** For API routes: the admin user, or null (respond 401). */
export async function adminOrNull(): Promise<User | null> {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

export function homeFor(user: Pick<User, "role">) {
  return user.role === "admin" ? "/admin" : "/portal";
}
