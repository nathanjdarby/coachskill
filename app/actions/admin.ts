"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ensureClientUser, findUserByEmail, issuePasswordToken } from "@/lib/accounts";
import { appUrl } from "@/lib/app-url";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import {
  clientNotes,
  clientPackages,
  clients,
  coachingSessions,
  discoveryCalls,
  messages,
  passwordTokens,
  resourceShares,
  signups,
  users,
  type Client,
} from "@/lib/db/schema";
import {
  emailNewMessageToClient,
  emailPortalInvite,
  emailSharedUpdate,
} from "@/lib/email";
import { packageBalances } from "@/lib/packages";
import { hasEarlierUnread, portalAccess } from "@/lib/portal";
import { notifySessionChange } from "@/lib/session-notify";
import { parseLondonDateTime } from "@/lib/time";
import type { FormState } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["active", "paused", "completed"] as const;

function text(formData: FormData, key: string, max = 5000) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function revalidateClient(clientId: number) {
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}

async function getClient(clientId: number) {
  const [client] = await getDb().select().from(clients).where(eq(clients.id, clientId)).limit(1);
  return client ?? null;
}

/** Emails the client an account link (or a fresh one). */
async function sendInvite(client: Client): Promise<FormState> {
  const result = await ensureClientUser(client);
  if ("error" in result) return { ok: false, message: result.error };
  if (result.user.passwordHash) {
    return { ok: false, message: `${client.fullName} already has an account. They can use "Forgot password" on the login page if needed.` };
  }

  const token = await issuePasswordToken(result.user.id, "invite");
  const link = await appUrl(`/set-password/${token}`);
  const sent = await emailPortalInvite({ to: client.email, name: client.fullName, url: link, role: "client" });
  revalidateClient(client.id);

  if (sent.ok) {
    return { ok: true, message: `Invite emailed to ${client.email}. The link expires in 7 days.` };
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

async function createClientRecord(input: {
  fullName: string;
  email: string;
  company: string | null;
  discoveryCallId?: number;
}): Promise<{ client: Client } | { error: string }> {
  const email = input.email.toLowerCase();
  const db = getDb();
  const [existing] = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
  if (existing) return { error: `There's already a client with the email ${email}.` };
  const account = await findUserByEmail(email);
  if (account) return { error: `${email} already belongs to another account.` };

  const now = new Date();
  const [client] = await db
    .insert(clients)
    .values({
      fullName: input.fullName,
      email,
      company: input.company,
      discoveryCallId: input.discoveryCallId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return { client };
}

/** From a discovery call request: create the client record (the invite is sent separately). */
export async function becomeClient(discoveryCallId: number): Promise<FormState> {
  await requireAdmin();
  const db = getDb();
  const [call] = await db.select().from(discoveryCalls).where(eq(discoveryCalls.id, discoveryCallId)).limit(1);
  if (!call) return { ok: false, message: "That discovery request no longer exists." };

  const [already] = await db.select().from(clients).where(eq(clients.discoveryCallId, call.id)).limit(1);
  const created = already
    ? { client: already }
    : await createClientRecord({
        fullName: call.fullName,
        email: call.email,
        company: call.company,
        discoveryCallId: call.id,
      });
  if ("error" in created) return { ok: false, message: created.error };

  revalidatePath("/admin/discovery");
  revalidateClient(created.client.id);
  return { ok: true, fields: { clientId: String(created.client.id) } };
}

/** Marks a discovery request as not taken forward (or, with `declined: false`, restores it). */
export async function setDiscoveryDeclined(discoveryCallId: number, declined: boolean): Promise<FormState> {
  await requireAdmin();
  const db = getDb();
  const [client] = await db.select().from(clients).where(eq(clients.discoveryCallId, discoveryCallId)).limit(1);
  if (client) return { ok: false, message: `${client.fullName} is already a client.` };
  await db
    .update(discoveryCalls)
    .set({ declinedAt: declined ? new Date() : null })
    .where(eq(discoveryCalls.id, discoveryCallId));
  revalidatePath("/admin/discovery");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Permanently deletes a discovery request that hasn't become a client. */
export async function deleteDiscoveryCall(discoveryCallId: number): Promise<FormState> {
  await requireAdmin();
  const db = getDb();
  const [client] = await db.select().from(clients).where(eq(clients.discoveryCallId, discoveryCallId)).limit(1);
  if (client) {
    return { ok: false, message: `This request is linked to ${client.fullName}'s client record, so it can't be deleted.` };
  }
  await db.delete(discoveryCalls).where(eq(discoveryCalls.id, discoveryCallId));
  revalidatePath("/admin/discovery");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function addClient(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = {
    fullName: text(formData, "fullName", 120),
    email: text(formData, "email", 254).toLowerCase(),
    company: text(formData, "company", 120),
  };
  const errors: Record<string, string> = {};
  if (!fields.fullName) errors.fullName = "Enter their name.";
  if (!EMAIL_RE.test(fields.email)) errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length) return { errors, fields };

  const created = await createClientRecord({ ...fields, company: fields.company || null });
  if ("error" in created) return { message: created.error, fields };
  const { client } = created;

  revalidatePath("/admin/clients");
  if (formData.get("invite") === "on") {
    const result = await sendInvite(client);
    if (result?.link) return { ...result, fields: { clientId: String(client.id) } };
  }
  redirect(`/admin/clients/${client.id}`);
}

export async function inviteClient(clientId: number): Promise<FormState> {
  await requireAdmin();
  const client = await getClient(clientId);
  if (!client) return { ok: false, message: "Client not found." };
  return sendInvite(client);
}

export async function updateClient(clientId: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const client = await getClient(clientId);
  if (!client) return { ok: false, message: "Client not found." };

  const status = text(formData, "status");
  const fullName = text(formData, "fullName", 120);
  const company = text(formData, "company", 120);
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { ok: false, message: "Choose a valid status." };
  }
  if (!fullName) return { ok: false, errors: { fullName: "Enter their name." } };
  const kind = text(formData, "kind") === "attendee" ? "attendee" : "client";
  const email = (text(formData, "email", 254) || client.email).toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, errors: { email: "Enter a valid email address." } };

  const db = getDb();
  if (email !== client.email.toLowerCase()) {
    const [otherClient] = await db.select({ id: clients.id }).from(clients).where(eq(clients.email, email)).limit(1);
    const otherUser = await findUserByEmail(email);
    if ((otherClient && otherClient.id !== clientId) || (otherUser && otherUser.clientId !== clientId)) {
      return { ok: false, errors: { email: `${email} already belongs to another client or account.` } };
    }
  }

  const now = new Date();
  await db
    .update(clients)
    .set({ status: status as Client["status"], kind, fullName, email, company: company || null, updatedAt: now })
    .where(eq(clients.id, clientId));
  // Their sign-in follows the client record's email.
  await db.update(users).set({ name: fullName, email, updatedAt: now }).where(eq(users.clientId, clientId));
  revalidateClient(clientId);
  return {
    ok: true,
    message: email !== client.email.toLowerCase() ? `Saved. They now sign in with ${email}.` : "Saved.",
  };
}

async function clientAccountForEmail(clientId: number) {
  const [user] = await getDb().select().from(users).where(eq(users.clientId, clientId)).limit(1);
  return portalAccess(user) === "active" ? user : null;
}

export async function addNote(clientId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const body = text(formData, "body", 10_000);
  const shared = formData.get("shared") === "on";
  if (!body) return { errors: { body: "Write something first." } };
  if (!(await getClient(clientId))) return { ok: false, message: "Client not found." };

  await getDb()
    .insert(clientNotes)
    .values({ clientId, authorId: admin.id, body, shared, createdAt: new Date() });

  if (shared) {
    const account = await clientAccountForEmail(clientId);
    if (account) {
      const url = await appUrl("/portal/updates");
      after(() => emailSharedUpdate({ to: account.email, name: account.name, url }));
    }
  }
  revalidateClient(clientId);
  return { ok: true, message: shared ? "Update shared with the client." : "Private note saved." };
}

export async function deleteNote(noteId: number, clientId: number) {
  await requireAdmin();
  await getDb().delete(clientNotes).where(and(eq(clientNotes.id, noteId), eq(clientNotes.clientId, clientId)));
  revalidateClient(clientId);
}

export async function addSession(clientId: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = {
    title: text(formData, "title", 200),
    startsAt: text(formData, "startsAt", 40),
    durationMinutes: text(formData, "durationMinutes", 5),
    meetingUrl: text(formData, "meetingUrl", 500),
  };
  const errors: Record<string, string> = {};
  const startsAt = parseLondonDateTime(fields.startsAt);
  const duration = Number(fields.durationMinutes);
  if (!fields.title) errors.title = "Give the session a title.";
  if (!startsAt) errors.startsAt = "Choose a date and time.";
  if (!Number.isInteger(duration) || duration < 5 || duration > 600) errors.durationMinutes = "Between 5 and 600 minutes.";
  if (fields.meetingUrl && !/^https:\/\/\S+$/.test(fields.meetingUrl)) errors.meetingUrl = "Use a full https:// link.";
  const packageField = text(formData, "clientPackageId", 10);
  let clientPackageId: number | null = null;
  if (packageField) {
    const credit = (await packageBalances(clientId)).find((b) => b.id === Number(packageField));
    if (!credit) errors.clientPackageId = "Choose one of this client's packages.";
    else if (credit.remaining < 1) errors.clientPackageId = "That package has no sessions left.";
    else clientPackageId = credit.id;
  }
  if (Object.keys(errors).length || !startsAt) return { errors, fields: { ...fields, clientPackageId: packageField } };
  if (!(await getClient(clientId))) return { ok: false, message: "Client not found." };

  const [created] = await getDb()
    .insert(coachingSessions)
    .values({
      clientId,
      clientPackageId,
      title: fields.title,
      startsAt,
      durationMinutes: duration,
      meetingUrl: fields.meetingUrl || null,
      bookedBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const account = await clientAccountForEmail(clientId);
  if (account && startsAt.getTime() > Date.now()) {
    after(() => notifySessionChange(created.id, "booked", "admin"));
  }
  revalidateClient(clientId);
  return { ok: true, message: account ? "Session added and the client has been emailed." : "Session added." };
}

export async function deleteSession(sessionId: number, clientId: number) {
  await requireAdmin();
  await getDb()
    .delete(coachingSessions)
    .where(and(eq(coachingSessions.id, sessionId), eq(coachingSessions.clientId, clientId)));
  revalidateClient(clientId);
}

export async function sendAdminMessage(clientId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const body = text(formData, "body", 10_000);
  if (!body) return { errors: { body: "Write a message first." } };
  if (!(await getClient(clientId))) return { ok: false, message: "Client not found." };

  const [message] = await getDb()
    .insert(messages)
    .values({ clientId, senderId: admin.id, body, createdAt: new Date() })
    .returning();

  const account = await clientAccountForEmail(clientId);
  if (account && !(await hasEarlierUnread(clientId, "admin", message.id))) {
    const url = await appUrl("/portal/messages");
    after(() => emailNewMessageToClient({ to: account.email, name: account.name, url }));
  }
  revalidateClient(clientId);
  return { ok: true };
}

/**
 * Permanently deletes a client and everything that belongs only to them: their
 * sign-in, messages, notes, sessions, packages and resource shares. Workshop
 * bookings and discovery-call answers are kept as records but unlinked.
 */
export async function deleteClient(clientId: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const client = await getClient(clientId);
  if (!client) return { ok: false, message: "Client not found." };
  const typed = text(formData, "confirmName", 120);
  if (typed.toLowerCase() !== client.fullName.trim().toLowerCase()) {
    return { ok: false, errors: { confirmName: `Type "${client.fullName}" exactly to confirm.` } };
  }

  const db = getDb();
  db.transaction(() => {
    const account = db.select({ id: users.id }).from(users).where(eq(users.clientId, clientId)).get();
    db.delete(messages).where(eq(messages.clientId, clientId)).run();
    db.delete(clientNotes).where(eq(clientNotes.clientId, clientId)).run();
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

  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  revalidatePath("/admin/discovery");
  revalidatePath("/admin/signups");
  redirect("/admin/clients?deleted=1");
}
