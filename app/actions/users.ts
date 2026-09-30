"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { ensureClientUser, findUserByEmail, purgeClient, sendAccountInvite } from "@/lib/accounts";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { clientNotes, clients, messages, passwordTokens, resources, users } from "@/lib/db/schema";
import type { FormState } from "./types";

// User management from Settings. Admins are just a sign-in; client users are
// always tied to a client record, so creating, editing or deleting one does the
// same to their client record.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string, max = 5000) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function revalidateUsers() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}

async function getUser(userId: number) {
  const [user] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

async function clientByEmail(email: string) {
  const [client] = await getDb().select().from(clients).where(eq(clients.email, email)).limit(1);
  return client ?? null;
}

export async function createUser(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = {
    name: text(formData, "name", 120),
    email: text(formData, "email", 254).toLowerCase(),
    role: text(formData, "role") === "admin" ? "admin" : "client",
    company: text(formData, "company", 120),
  };
  const errors: Record<string, string> = {};
  if (!fields.name) errors.name = "Enter their name.";
  if (!EMAIL_RE.test(fields.email)) errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length) return { errors, fields };

  if (await findUserByEmail(fields.email)) {
    return { errors: { email: `${fields.email} already has an account.` }, fields };
  }
  const existingClient = await clientByEmail(fields.email);
  const db = getDb();
  const now = new Date();

  let user;
  if (fields.role === "admin") {
    if (existingClient) {
      return { errors: { email: `${fields.email} belongs to the client ${existingClient.fullName}. Use a different email for an admin.` }, fields };
    }
    [user] = await db
      .insert(users)
      .values({ email: fields.email, name: fields.name, role: "admin", createdAt: now, updatedAt: now })
      .returning();
  } else {
    // Someone already in Clients without a login gets their account linked to that record.
    const client =
      existingClient ??
      (
        await db
          .insert(clients)
          .values({ fullName: fields.name, email: fields.email, company: fields.company || null, createdAt: now, updatedAt: now })
          .returning()
      )[0];
    const result = await ensureClientUser(client);
    if ("error" in result) return { message: result.error, fields };
    user = result.user;
  }

  const sent = await sendAccountInvite(user);
  revalidateUsers();
  return { ...sent, fields: { created: String(user.id) } };
}

export async function updateUser(userId: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const user = await getUser(userId);
  if (!user) return { ok: false, message: "That user no longer exists." };

  const name = text(formData, "name", 120);
  const email = text(formData, "email", 254).toLowerCase();
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Enter their name.";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length) return { ok: false, errors };

  if (email !== user.email) {
    const otherUser = await findUserByEmail(email);
    const otherClient = await clientByEmail(email);
    if ((otherUser && otherUser.id !== user.id) || (otherClient && otherClient.id !== user.clientId)) {
      return { ok: false, errors: { email: `${email} already belongs to another client or account.` } };
    }
  }

  const db = getDb();
  const now = new Date();
  db.transaction(() => {
    db.update(users).set({ name, email, updatedAt: now }).where(eq(users.id, userId)).run();
    // A client's login follows their client record.
    if (user.clientId !== null) {
      db.update(clients).set({ fullName: name, email, updatedAt: now }).where(eq(clients.id, user.clientId)).run();
    }
  });
  revalidateUsers();
  if (user.clientId !== null) revalidatePath(`/admin/clients/${user.clientId}`);
  return {
    ok: true,
    message: email !== user.email ? `Saved. They now sign in with ${email}.` : "Saved.",
  };
}

export async function resendUserInvite(userId: number): Promise<FormState> {
  await requireAdmin();
  const user = await getUser(userId);
  if (!user) return { ok: false, message: "That user no longer exists." };
  if (user.passwordHash) {
    return { ok: false, message: `${user.name} has already set a password. They can use "Forgot password" on the login page if needed.` };
  }
  const sent = await sendAccountInvite(user);
  revalidateUsers();
  return sent;
}

/**
 * Deleting an admin removes their sign-in; anything they wrote (notes, messages,
 * resources) is kept and credited to you. Deleting a client user deletes the
 * client and all their coaching records, as on the client's own page.
 */
export async function deleteUser(userId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const user = await getUser(userId);
  if (!user) return { ok: false, message: "That user no longer exists." };
  if (user.id === admin.id) return { ok: false, message: "You can't delete your own account." };
  if (text(formData, "confirmName", 120).toLowerCase() !== user.name.trim().toLowerCase()) {
    return { ok: false, errors: { confirmName: `Type "${user.name}" exactly to confirm.` } };
  }

  if (user.clientId !== null) {
    purgeClient(user.clientId);
    revalidatePath("/admin/discovery");
    revalidatePath("/admin/signups");
  } else {
    const db = getDb();
    db.transaction(() => {
      db.update(clientNotes).set({ authorId: admin.id }).where(eq(clientNotes.authorId, user.id)).run();
      db.update(messages).set({ senderId: admin.id }).where(eq(messages.senderId, user.id)).run();
      db.update(resources).set({ createdById: admin.id }).where(eq(resources.createdById, user.id)).run();
      db.delete(passwordTokens).where(eq(passwordTokens.userId, user.id)).run();
      db.delete(users).where(eq(users.id, user.id)).run();
    });
  }
  revalidateUsers();
  return { ok: true, message: `${user.name} has been deleted.` };
}
