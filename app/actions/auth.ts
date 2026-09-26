"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import {
  findUserByEmail,
  issuePasswordToken,
  lookupPasswordToken,
  passwordProblem,
} from "@/lib/accounts";
import { appUrl } from "@/lib/app-url";
import { currentUser, homeFor } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { passwordTokens, users } from "@/lib/db/schema";
import { emailPasswordReset } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/spam";
import type { FormState } from "./types";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function safeCallback(url: string, role: "admin" | "client") {
  const area = role === "admin" ? "/admin" : "/portal";
  return url === area || url.startsWith(`${area}/`) ? url : null;
}

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "");

  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 20, FIFTEEN_MINUTES) || !rateLimit(`login:${email}`, 10, FIFTEEN_MINUTES)) {
    return { message: "Too many attempts. Please wait a few minutes and try again.", fields: { email } };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { message: "That email and password don't match.", fields: { email } };
    }
    throw err;
  }

  const user = await findUserByEmail(email);
  redirect(user ? (safeCallback(callbackUrl, user.role) ?? homeFor(user)) : "/login");
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function requestPasswordReset(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const done: FormState = {
    ok: true,
    message: "If there's an account for that email, a reset link is on its way. It expires in 1 hour.",
  };
  if (!email) return { errors: { email: "Enter your email address." } };

  const ip = clientIp(await headers());
  if (!rateLimit(`reset:${ip}`, 5, FIFTEEN_MINUTES) || !rateLimit(`reset:${email}`, 3, FIFTEEN_MINUTES)) {
    return done;
  }

  const user = await findUserByEmail(email);
  if (user) {
    const token = await issuePasswordToken(user.id, "reset");
    await emailPasswordReset({ to: user.email, name: user.name, url: await appUrl(`/set-password/${token}`) });
  }
  return done;
}

export async function setPassword(token: string, _state: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const found = await lookupPasswordToken(token);
  if (!found) {
    return { message: "This link has expired or has already been used." };
  }
  const problem = passwordProblem(password, confirm);
  if (problem) return { errors: { password: problem } };

  const hash = await bcrypt.hash(password, 12);
  const db = getDb();
  const now = new Date();
  // Claim the token first so the same link can't be used twice.
  const claimed = db
    .update(passwordTokens)
    .set({ usedAt: now })
    .where(sql`${passwordTokens.id} = ${found.token.id} AND ${passwordTokens.usedAt} IS NULL`)
    .run();
  if (claimed.changes !== 1) {
    return { message: "This link has expired or has already been used." };
  }
  await db
    .update(users)
    .set({ passwordHash: hash, sessionVersion: found.user.sessionVersion + 1, updatedAt: now })
    .where(eq(users.id, found.user.id));

  await signIn("credentials", { email: found.user.email, password, redirect: false });
  redirect(homeFor(found.user));
}

export async function changePassword(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!user.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) {
    return { errors: { current: "That isn't your current password." } };
  }
  const problem = passwordProblem(password, confirm);
  if (problem) return { errors: { password: problem } };

  await getDb()
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(password, 12),
      sessionVersion: user.sessionVersion + 1,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Other devices are now signed out; keep this one signed in.
  await signIn("credentials", { email: user.email, password, redirect: false });
  return { ok: true, message: "Password updated. You've been signed out everywhere else." };
}
