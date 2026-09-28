"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { canClientChange, creditPackageSync, getBookingSettings, isSlotAvailable } from "@/lib/booking";
import { requireAdmin, requireClient } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { availabilityBlocks, availabilityRules, bookingSettings, coachingSessions } from "@/lib/db/schema";
import { COACHING_SLUG, durationFor, getEventType, getEventTypeBySlug } from "@/lib/event-types";
import { resolveMeetingUrl } from "@/lib/meeting";
import { notifySessionChange, notifySessionDeclined } from "@/lib/session-notify";
import { parseLondonDateTime } from "@/lib/time";
import type { FormState } from "./types";

function revalidateBooking(clientId?: number) {
  revalidatePath("/portal/sessions");
  revalidatePath("/portal");
  revalidatePath("/admin");
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
}

function parseSlot(formData: FormData) {
  const raw = String(formData.get("startsAt") ?? "");
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// — Client —

/** Requests a slot using a session from the client's package; Monika approves it before it's confirmed. */
export async function bookSession(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireClient();
  const startsAt = parseSlot(formData);
  if (!startsAt) return { ok: false, message: "Choose a time first." };
  const db = getDb();

  // Synchronous from here to the insert, so nobody else can take the slot in between.
  const result = db.transaction(() => {
    const credit = creditPackageSync(user.clientId);
    if (!credit) return { error: "You don't have any sessions left in a package." } as const;
    const type = getEventTypeBySlug(COACHING_SLUG);
    const duration = durationFor(type, credit.sessionMinutes);
    if (!isSlotAvailable(startsAt, duration, undefined, type?.bufferMinutes)) {
      return { error: "Sorry, that time has just been taken. Please pick another." } as const;
    }
    const settings = getBookingSettings();
    const now = new Date();
    const session = db
      .insert(coachingSessions)
      .values({
        clientId: user.clientId,
        clientPackageId: credit.id,
        eventTypeId: type?.id ?? null,
        title: type?.name ?? "Coaching session",
        startsAt,
        durationMinutes: duration,
        // A custom-link type without a URL falls back to the old default meeting link.
        meetingUrl: resolveMeetingUrl(type) ?? settings.defaultMeetingUrl,
        locationMode: type?.locationMode ?? "custom",
        bookedBy: "client",
        awaitingApproval: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return { session } as const;
  });
  if ("error" in result) return { ok: false, message: result.error };

  after(() => notifySessionChange(result.session.id, "booked", "client"));
  revalidateBooking(user.clientId);
  return {
    ok: true,
    message: "Requested! Monika will confirm it shortly — you'll get an email with the calendar invite once she does.",
  };
}

/** Moves one of the client's sessions to a new slot (before the cutoff). */
export async function rescheduleSession(sessionId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireClient();
  const startsAt = parseSlot(formData);
  if (!startsAt) return { ok: false, message: "Choose a new time first." };
  const db = getDb();

  const result = db.transaction(() => {
    const session = db
      .select()
      .from(coachingSessions)
      .where(and(eq(coachingSessions.id, sessionId), eq(coachingSessions.clientId, user.clientId), isNull(coachingSessions.cancelledAt)))
      .get();
    if (!session) return { error: "Session not found." } as const;
    const settings = getBookingSettings();
    if (!canClientChange(session.startsAt, settings)) {
      return { error: `Sessions can't be moved within ${settings.cancelCutoffHours} hours. Please message Monika.` } as const;
    }
    const sessionType = session.eventTypeId ? getEventType(session.eventTypeId) : null;
    if (!isSlotAvailable(startsAt, session.durationMinutes, session.id, sessionType?.bufferMinutes)) {
      return { error: "Sorry, that time isn't available any more. Please pick another." } as const;
    }
    db.update(coachingSessions)
      .set({
        startsAt,
        icsSequence: sql`${coachingSessions.icsSequence} + 1`,
        reminder24hSentAt: null,
        reminder1hSentAt: null,
        updatedAt: new Date(),
      })
      .where(eq(coachingSessions.id, session.id))
      .run();
    return { ok: true, pending: session.awaitingApproval && !session.approvedAt } as const;
  });
  if ("error" in result) return { ok: false, message: result.error };

  after(() => notifySessionChange(sessionId, "rescheduled", "client"));
  revalidateBooking(user.clientId);
  return result.pending
    ? { ok: true, message: "Moved. Monika will confirm the new time shortly." }
    : { ok: true, message: "Moved. We've emailed you an updated calendar invite." };
}

/** Cancels one of the client's sessions (before the cutoff); the package session is returned. */
export async function cancelMySession(sessionId: number): Promise<FormState> {
  const user = await requireClient();
  const db = getDb();
  const session = db
    .select()
    .from(coachingSessions)
    .where(and(eq(coachingSessions.id, sessionId), eq(coachingSessions.clientId, user.clientId), isNull(coachingSessions.cancelledAt)))
    .get();
  if (!session) return { ok: false, message: "Session not found." };
  const settings = getBookingSettings();
  if (!canClientChange(session.startsAt, settings)) {
    return { ok: false, message: `Sessions can't be cancelled within ${settings.cancelCutoffHours} hours. Please message Monika.` };
  }
  cancel(session.id, "client");
  after(() => notifySessionChange(session.id, "cancelled", "client"));
  revalidateBooking(user.clientId);
  return {
    ok: true,
    message: session.awaitingApproval && !session.approvedAt ? "Request withdrawn. The session is back in your package." : "Cancelled. The session is back in your package.",
  };
}

function cancel(sessionId: number, by: "admin" | "client") {
  getDb()
    .update(coachingSessions)
    .set({ cancelledAt: new Date(), cancelledBy: by, icsSequence: sql`${coachingSessions.icsSequence} + 1`, updatedAt: new Date() })
    .where(and(eq(coachingSessions.id, sessionId), isNull(coachingSessions.cancelledAt)))
    .run();
}

// — Admin —

/** Cancels any session (no cutoff) and tells the client. */
export async function cancelSessionAsAdmin(sessionId: number, clientId: number) {
  await requireAdmin();
  const session = getDb()
    .select()
    .from(coachingSessions)
    .where(and(eq(coachingSessions.id, sessionId), eq(coachingSessions.clientId, clientId), isNull(coachingSessions.cancelledAt)))
    .get();
  if (!session) return;
  cancel(session.id, "admin");
  if (session.awaitingApproval && !session.approvedAt) after(() => notifySessionDeclined(session.id));
  else if (session.startsAt.getTime() > Date.now()) after(() => notifySessionChange(session.id, "cancelled", "admin"));
  revalidateBooking(clientId);
}

/** A client's request that's still waiting for approval. */
function pendingRequest(sessionId: number) {
  return getDb()
    .select()
    .from(coachingSessions)
    .where(
      and(
        eq(coachingSessions.id, sessionId),
        eq(coachingSessions.awaitingApproval, true),
        isNull(coachingSessions.approvedAt),
        isNull(coachingSessions.cancelledAt),
      ),
    )
    .get();
}

/** Confirms a client's request: they get the usual booking email and calendar invite. */
export async function approveSession(sessionId: number) {
  await requireAdmin();
  const session = pendingRequest(sessionId);
  if (!session) return;
  getDb()
    .update(coachingSessions)
    .set({ approvedAt: new Date(), icsSequence: sql`${coachingSessions.icsSequence} + 1`, updatedAt: new Date() })
    .where(eq(coachingSessions.id, session.id))
    .run();
  after(() => notifySessionChange(session.id, "booked", "admin"));
  revalidateBooking(session.clientId ?? undefined);
  revalidatePath("/admin/calendar");
}

/** Turns down a client's request: the slot and package session are freed and the client is told. */
export async function declineSession(sessionId: number) {
  await requireAdmin();
  const session = pendingRequest(sessionId);
  if (!session) return;
  cancel(session.id, "admin");
  after(() => notifySessionDeclined(session.id));
  revalidateBooking(session.clientId ?? undefined);
  revalidatePath("/admin/calendar");
}

function timeToMinutes(value: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return minutes <= 24 * 60 ? minutes : null;
}

export async function addAvailabilityRule(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const weekdays = formData.getAll("weekday").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const start = timeToMinutes(String(formData.get("start") ?? ""));
  const end = timeToMinutes(String(formData.get("end") ?? ""));
  const errors: Record<string, string> = {};
  if (weekdays.length === 0) errors.weekday = "Choose at least one day.";
  if (start == null) errors.start = "Choose a start time.";
  if (end == null) errors.end = "Choose an end time.";
  else if (start != null && end <= start) errors.end = "End must be after the start.";
  if (Object.keys(errors).length || start == null || end == null) return { errors };
  getDb()
    .insert(availabilityRules)
    .values(weekdays.map((weekday) => ({ weekday, startMinute: start, endMinute: end })))
    .run();
  revalidatePath("/admin/scheduling/availability");
  revalidatePath("/portal/sessions");
  return { ok: true, message: "Hours added." };
}

export async function deleteAvailabilityRule(id: number) {
  await requireAdmin();
  getDb().delete(availabilityRules).where(eq(availabilityRules.id, id)).run();
  revalidatePath("/admin/scheduling/availability");
  revalidatePath("/portal/sessions");
}

export async function addAvailabilityBlock(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const startsAt = parseLondonDateTime(String(formData.get("startsAt") ?? ""));
  const endsAt = parseLondonDateTime(String(formData.get("endsAt") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const errors: Record<string, string> = {};
  if (!startsAt) errors.startsAt = "Choose when it starts.";
  if (!endsAt) errors.endsAt = "Choose when it ends.";
  else if (startsAt && endsAt <= startsAt) errors.endsAt = "End must be after the start.";
  if (Object.keys(errors).length || !startsAt || !endsAt) return { errors };
  getDb().insert(availabilityBlocks).values({ startsAt, endsAt, reason: reason || null }).run();
  revalidatePath("/admin/scheduling/availability");
  revalidatePath("/portal/sessions");
  return { ok: true, message: "Time off added." };
}

export async function deleteAvailabilityBlock(id: number) {
  await requireAdmin();
  getDb().delete(availabilityBlocks).where(eq(availabilityBlocks.id, id)).run();
  revalidatePath("/admin/scheduling/availability");
  revalidatePath("/portal/sessions");
}

export async function saveBookingSettings(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const num = (key: string, min: number, max: number) => {
    const n = Number(formData.get(key));
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const values = {
    bufferMinutes: num("bufferMinutes", 0, 240),
    minNoticeHours: num("minNoticeHours", 0, 720),
    maxAdvanceDays: num("maxAdvanceDays", 1, 365),
    slotStepMinutes: num("slotStepMinutes", 5, 240),
    cancelCutoffHours: num("cancelCutoffHours", 0, 720),
  };
  const meetingUrl = String(formData.get("defaultMeetingUrl") ?? "").trim().slice(0, 500);
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) if (v == null) errors[k] = "Enter a whole number in range.";
  if (meetingUrl && !/^https:\/\/\S+$/.test(meetingUrl)) errors.defaultMeetingUrl = "Use a full https:// link.";
  if (Object.keys(errors).length) return { errors };
  getBookingSettings();
  getDb()
    .update(bookingSettings)
    .set({ ...(values as Record<keyof typeof values, number>), defaultMeetingUrl: meetingUrl || null })
    .where(eq(bookingSettings.id, 1))
    .run();
  revalidatePath("/admin/scheduling/availability");
  revalidatePath("/portal/sessions");
  return { ok: true, message: "Booking settings saved." };
}
