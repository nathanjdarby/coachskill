"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  BOOKING_LINK_TTL_MS,
  appointmentByToken,
  bookingLinkByToken,
  bookingLinkState,
  bookingLinkUrl,
  insertInviteeAppointment,
  manageUrl,
} from "@/lib/appointments";
import { canClientChange, getBookingSettings, isSlotAvailable } from "@/lib/booking";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { bookingLinks, clients, coachingSessions, discoveryCalls, messages } from "@/lib/db/schema";
import { emailBookingLink, emailCallNow } from "@/lib/email";
import { DISCOVERY_SLUG, QUICK_CALL_SLUG, durationFor, getEventType, getEventTypeBySlug } from "@/lib/event-types";
import { guestJoinUrl, hostJoinUrl, usesInAppRoom } from "@/lib/join";
import { appointmentRecipient, notifyAppointmentChange } from "@/lib/session-notify";
import { newLinkSecret } from "@/lib/signed-links";
import { normalisePhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/spam";
import { parseLondonDateTime } from "@/lib/time";
import type { FormState } from "./types";

function revalidateScheduling(clientId?: number | null) {
  revalidatePath("/admin/discovery");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
}

/** The event type chosen on an admin form: an active invite-only type, else the discovery call. */
function chosenType(formData: FormData) {
  const id = Number(formData.get("eventTypeId"));
  const type = Number.isInteger(id) && id > 0 ? getEventType(id) : getEventTypeBySlug(DISCOVERY_SLUG);
  return type && type.active ? type : null;
}

function loadRequest(discoveryCallId: number) {
  const db = getDb();
  const call = db.select().from(discoveryCalls).where(eq(discoveryCalls.id, discoveryCallId)).get();
  if (!call) return null;
  const client = db.select({ id: clients.id }).from(clients).where(eq(clients.discoveryCallId, call.id)).get();
  return { call, clientId: client?.id ?? null };
}

/** Stops any open booking links for a request (a time has been fixed, or a new link replaces them). */
function revokeOpenLinks(discoveryCallId: number) {
  getDb()
    .update(bookingLinks)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(bookingLinks.discoveryCallId, discoveryCallId),
        isNull(bookingLinks.usedAt),
        isNull(bookingLinks.revokedAt),
        gt(bookingLinks.expiresAt, new Date()),
      ),
    )
    .run();
}

// — Admin —

/** Monika books a call at a chosen time and the prospect gets an invite with a manage link. */
export async function scheduleDiscoveryCall(discoveryCallId: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const found = loadRequest(discoveryCallId);
  if (!found) return { ok: false, message: "That discovery request no longer exists." };
  const type = chosenType(formData);
  if (!type) return { ok: false, message: "Choose a booking type." };

  const slot = String(formData.get("slot") ?? "");
  const manual = String(formData.get("manualStartsAt") ?? "");
  const startsAt = slot === "manual" ? parseLondonDateTime(manual) : slot ? new Date(slot) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return { ok: false, errors: { [slot === "manual" ? "manualStartsAt" : "slot"]: "Choose a time." } };
  }
  if (startsAt.getTime() < Date.now()) return { ok: false, errors: { manualStartsAt: "That time has already passed." } };
  const call = callTypeFrom(formData);
  if ("error" in call) return { ok: false, message: "Enter the number to call." };
  const meetingUrl = call.phone ? "" : String(formData.get("meetingUrl") ?? "").trim().slice(0, 500);
  if (meetingUrl && !/^https:\/\/\S+$/.test(meetingUrl)) return { ok: false, errors: { meetingUrl: "Use a full https:// link." } };

  const duration = durationFor(type);
  const db = getDb();
  const result = db.transaction(() => {
    const free = isSlotAvailable(startsAt, duration, undefined, type.bufferMinutes);
    // A picked slot must still be free; a manual time may overlap on purpose.
    if (slot !== "manual" && !free) return { error: "That time has just been taken. Please pick another." } as const;
    const appointment = insertInviteeAppointment({
      type,
      startsAt,
      durationMinutes: duration,
      inviteeName: found.call.fullName,
      inviteeEmail: found.call.email,
      discoveryCallId: found.call.id,
      clientId: found.clientId,
      bookedBy: "admin",
      meetingUrl: meetingUrl || null,
      phone: call.phone,
    });
    revokeOpenLinks(found.call.id);
    return { appointment, free } as const;
  });
  if ("error" in result) return { ok: false, message: result.error };

  after(() => notifyAppointmentChange(result.appointment.id, "booked", "admin"));
  revalidateScheduling(found.clientId);
  const first = found.call.fullName.split(/\s+/)[0];
  return {
    ok: true,
    message: result.free
      ? `Booked. ${first} has been emailed an invite${call.phone ? " saying you'll call them" : " with the video link"}.`
      : `Booked, but note it overlaps something else in your calendar. ${first} has been emailed an invite.`,
  };
}

/** Emails the prospect a single-use link to pick their own time. Replaces any earlier link. */
export async function sendBookingLink(discoveryCallId: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const found = loadRequest(discoveryCallId);
  if (!found) return { ok: false, message: "That discovery request no longer exists." };
  const type = chosenType(formData);
  if (!type) return { ok: false, message: "Choose a booking type." };

  const now = new Date();
  const link = getDb().transaction(() => {
    revokeOpenLinks(found.call.id);
    return getDb()
      .insert(bookingLinks)
      .values({
        secret: newLinkSecret(),
        eventTypeId: type.id,
        discoveryCallId: found.call.id,
        inviteeName: found.call.fullName,
        inviteeEmail: found.call.email,
        expiresAt: new Date(now.getTime() + BOOKING_LINK_TTL_MS),
        createdAt: now,
      })
      .returning()
      .get();
  });
  const url = await bookingLinkUrl(link);
  const sent = await emailBookingLink({
    to: link.inviteeEmail,
    name: link.inviteeName,
    typeName: type.name,
    durationMinutes: durationFor(type),
    url,
    expiresAt: link.expiresAt,
  });
  revalidateScheduling(found.clientId);
  return sent.ok
    ? { ok: true, message: `Booking link emailed to ${link.inviteeEmail}.` }
    : { ok: true, message: "The link is ready, but the email couldn't be sent. Copy it and send it yourself:", link: url };
}

export async function revokeBookingLink(linkId: number): Promise<FormState> {
  await requireAdmin();
  const db = getDb();
  const link = db.select().from(bookingLinks).where(eq(bookingLinks.id, linkId)).get();
  if (!link) return { ok: false, message: "Link not found." };
  db.update(bookingLinks).set({ revokedAt: new Date() }).where(and(eq(bookingLinks.id, linkId), isNull(bookingLinks.usedAt))).run();
  revalidateScheduling();
  return { ok: true, message: "Link switched off." };
}

/** Cancels any appointment (no cutoff) and tells whoever it was booked for. */
export async function cancelAppointmentAsAdmin(appointmentId: number): Promise<FormState> {
  await requireAdmin();
  const db = getDb();
  const appt = db
    .select()
    .from(coachingSessions)
    .where(and(eq(coachingSessions.id, appointmentId), isNull(coachingSessions.cancelledAt)))
    .get();
  if (!appt) return { ok: false, message: "Appointment not found." };
  cancel(appt.id, "admin");
  if (appt.startsAt.getTime() > Date.now()) after(() => notifyAppointmentChange(appt.id, "cancelled", "admin"));
  revalidateScheduling(appt.clientId);
  return { ok: true, message: "Cancelled." };
}

function cancel(id: number, by: "admin" | "invitee") {
  getDb()
    .update(coachingSessions)
    .set({ cancelledAt: new Date(), cancelledBy: by, icsSequence: sql`${coachingSessions.icsSequence} + 1`, updatedAt: new Date() })
    .where(and(eq(coachingSessions.id, id), isNull(coachingSessions.cancelledAt)))
    .run();
}

/**
 * "Start a call now": a Quick call starting straight away. The client or prospect is
 * emailed the link (and, for clients, it's posted in Messages); Monika gets her own link back.
 */
export async function startCallNow(target: { clientId: number } | { discoveryCallId: number }): Promise<FormState> {
  const admin = await requireAdmin();
  const db = getDb();
  const type = getEventTypeBySlug(QUICK_CALL_SLUG);
  if (!type) return { ok: false, message: "The Quick call booking type is missing." };

  let person: { name: string; email: string; clientId: number | null; discoveryCallId: number | null };
  if ("clientId" in target) {
    const client = db.select().from(clients).where(eq(clients.id, target.clientId)).get();
    if (!client) return { ok: false, message: "Client not found." };
    person = { name: client.fullName, email: client.email, clientId: client.id, discoveryCallId: null };
  } else {
    const found = loadRequest(target.discoveryCallId);
    if (!found) return { ok: false, message: "That discovery request no longer exists." };
    person = { name: found.call.fullName, email: found.call.email, clientId: found.clientId, discoveryCallId: found.call.id };
  }

  const startsAt = new Date(Math.floor(Date.now() / 60_000) * 60_000);
  const appointment = insertInviteeAppointment({
    type,
    startsAt,
    durationMinutes: durationFor(type),
    inviteeName: person.name,
    inviteeEmail: person.email,
    discoveryCallId: person.discoveryCallId,
    clientId: person.clientId,
    bookedBy: "admin",
  });
  const recipient = await appointmentRecipient(appointment);
  const guestJoin = (await guestJoinUrl(appointment, recipient?.name ?? person.name))!;
  if (person.clientId) {
    db.insert(messages)
      .values({
        clientId: person.clientId,
        senderId: admin.id,
        // The plain room link reads better in a message than the personalised one.
        body: `I've started a video call — join me here whenever you're ready: ${usesInAppRoom(appointment.meetingUrl) ? guestJoin : appointment.meetingUrl}`,
        createdAt: new Date(),
      })
      .run();
  }
  const sent = recipient
    ? await emailCallNow({ to: recipient.to, name: recipient.name, joinUrl: guestJoin, fromName: admin.name })
    : { ok: false as const };

  revalidateScheduling(person.clientId);
  if (person.clientId) revalidatePath("/portal/messages");
  const first = person.name.split(/\s+/)[0];
  return {
    ok: true,
    message: sent.ok
      ? `Call started — ${first} has been emailed the link${person.clientId ? " and it's in their messages" : ""}.`
      : `Call started, but the email couldn't be sent${person.clientId ? " (the link is in their messages)" : ""}. Send them this link:`,
    link: (await hostJoinUrl(appointment, admin.name))!,
    fields: { guestLink: guestJoin },
  };
}

// — Public (people with a link) —

async function allowed(key: string) {
  const ip = clientIp(await headers());
  return rateLimit(`${key}:${ip}`, 20, 10 * 60 * 1000);
}

/** Video (default) or a phone call with the number to ring, from CallTypeFields. */
function callTypeFrom(formData: FormData): { phone: string | null } | { error: string } {
  if (formData.get("callType") !== "phone") return { phone: null };
  const phone = normalisePhone(String(formData.get("phone") ?? ""));
  return phone ? { phone } : { error: "Please enter a phone number Monika can call you on." };
}

function parseSlot(formData: FormData) {
  const d = new Date(String(formData.get("startsAt") ?? ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A prospect picks a time from their booking link; the link is then used up. */
export async function bookFromLink(token: string, _state: FormState, formData: FormData): Promise<FormState> {
  if (!(await allowed("book"))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  const startsAt = parseSlot(formData);
  if (!startsAt) return { ok: false, message: "Choose a time first." };
  const call = callTypeFrom(formData);
  if ("error" in call) return { ok: false, message: call.error };
  const found = bookingLinkByToken(token);
  if (!found) return { ok: false, message: "This booking link isn't valid." };

  const db = getDb();
  const result = db.transaction(() => {
    const link = db.select().from(bookingLinks).where(eq(bookingLinks.id, found.link.id)).get()!;
    if (bookingLinkState(link) !== "open") return { error: "This booking link has already been used or has expired." } as const;
    const type = getEventType(link.eventTypeId);
    if (!type) return { error: "This booking link isn't valid any more." } as const;
    const duration = durationFor(type);
    if (!isSlotAvailable(startsAt, duration, undefined, type.bufferMinutes)) {
      return { error: "Sorry, that time has just been taken. Please pick another." } as const;
    }
    const clientId = link.discoveryCallId
      ? (db.select({ id: clients.id }).from(clients).where(eq(clients.discoveryCallId, link.discoveryCallId)).get()?.id ?? null)
      : null;
    const appointment = insertInviteeAppointment({
      type,
      startsAt,
      durationMinutes: duration,
      inviteeName: link.inviteeName,
      inviteeEmail: link.inviteeEmail,
      discoveryCallId: link.discoveryCallId,
      clientId,
      bookedBy: "invitee",
      phone: call.phone,
    });
    db.update(bookingLinks).set({ usedAt: new Date(), appointmentId: appointment.id }).where(eq(bookingLinks.id, link.id)).run();
    return { appointment } as const;
  });
  if ("error" in result) return { ok: false, message: result.error };

  after(() => notifyAppointmentChange(result.appointment.id, "booked", "invitee"));
  revalidateScheduling(result.appointment.clientId);
  const url = new URL(await manageUrl(result.appointment));
  redirect(`${url.pathname}?booked=1`);
}

function changeableByToken(token: string) {
  const found = appointmentByToken(token);
  if (!found || found.appointment.cancelledAt) return { error: "This appointment can't be changed." } as const;
  const settings = getBookingSettings();
  if (!canClientChange(found.appointment.startsAt, settings)) {
    return { error: `It's less than ${settings.cancelCutoffHours} hours away, so please reply to your booking email instead.` } as const;
  }
  return found;
}

export async function rescheduleByToken(token: string, _state: FormState, formData: FormData): Promise<FormState> {
  if (!(await allowed("manage"))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  const startsAt = parseSlot(formData);
  if (!startsAt) return { ok: false, message: "Choose a new time first." };
  const found = changeableByToken(token);
  if ("error" in found) return { ok: false, message: found.error };
  const { appointment, type } = found;

  const db = getDb();
  const moved = db.transaction(() => {
    if (!isSlotAvailable(startsAt, appointment.durationMinutes, appointment.id, type?.bufferMinutes)) return false;
    db.update(coachingSessions)
      .set({
        startsAt,
        icsSequence: sql`${coachingSessions.icsSequence} + 1`,
        reminder24hSentAt: null,
        reminder1hSentAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(coachingSessions.id, appointment.id), isNull(coachingSessions.cancelledAt)))
      .run();
    return true;
  });
  if (!moved) return { ok: false, message: "Sorry, that time isn't available any more. Please pick another." };

  after(() => notifyAppointmentChange(appointment.id, "rescheduled", "invitee"));
  revalidateScheduling(appointment.clientId);
  revalidatePath("/appointments/[token]", "page");
  return { ok: true, message: "Moved. We've emailed you an updated calendar invite." };
}

export async function cancelByToken(token: string): Promise<FormState> {
  if (!(await allowed("manage"))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  const found = changeableByToken(token);
  if ("error" in found) return { ok: false, message: found.error };
  cancel(found.appointment.id, "invitee");
  after(() => notifyAppointmentChange(found.appointment.id, "cancelled", "invitee"));
  revalidateScheduling(found.appointment.clientId);
  revalidatePath("/appointments/[token]", "page");
  return { ok: true, message: "Cancelled. We've let Monika know." };
}
