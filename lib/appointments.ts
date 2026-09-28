import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { bookingLinks, coachingSessions, eventTypes, type Appointment, type BookingLink, type EventType } from "@/lib/db/schema";
import { resolveMeetingUrl } from "@/lib/meeting";
import { newLinkSecret, signedToken, tokenId, verifyToken } from "@/lib/signed-links";

export const BOOKING_LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Not cancelled and not yet finished. */
export function isUpcoming(a: Pick<Appointment, "cancelledAt" | "startsAt" | "durationMinutes">, now = Date.now()) {
  return !a.cancelledAt && a.startsAt.getTime() + a.durationMinutes * 60_000 > now;
}

// — Manage links for appointments (/appointments/<token>) —

/** The appointment a manage token opens, with its type, or null if the link is wrong or revoked. */
export function appointmentByToken(token: string): { appointment: Appointment; type: EventType | null } | null {
  const id = tokenId(token);
  if (!id) return null;
  const row = getDb()
    .select({ appointment: coachingSessions, type: eventTypes })
    .from(coachingSessions)
    .leftJoin(eventTypes, eq(coachingSessions.eventTypeId, eventTypes.id))
    .where(eq(coachingSessions.id, id))
    .get();
  if (!row || !verifyToken("appointment", token, id, row.appointment.manageTokenHash)) return null;
  return row;
}

/** The appointment's signed token (creating its secret the first time). */
export function appointmentToken(appointment: Pick<Appointment, "id" | "manageTokenHash">) {
  let secret = appointment.manageTokenHash;
  if (!secret) {
    secret = newLinkSecret();
    getDb().update(coachingSessions).set({ manageTokenHash: secret }).where(eq(coachingSessions.id, appointment.id)).run();
  }
  return signedToken("appointment", appointment.id, secret);
}

/** The appointment's manage link. */
export async function manageUrl(appointment: Pick<Appointment, "id" | "manageTokenHash">) {
  return appUrl(`/appointments/${appointmentToken(appointment)}`);
}

/**
 * Inserts an appointment for a prospect (synchronous, so callers can check the slot
 * and insert inside one transaction).
 */
export function insertInviteeAppointment(input: {
  type: EventType;
  startsAt: Date;
  durationMinutes: number;
  inviteeName: string;
  inviteeEmail: string;
  discoveryCallId: number | null;
  clientId: number | null;
  bookedBy: "admin" | "invitee";
  meetingUrl?: string | null;
  /** A phone call instead of video: Monika rings this number. */
  phone?: string | null;
}) {
  const now = new Date();
  return getDb()
    .insert(coachingSessions)
    .values({
      clientId: input.clientId,
      eventTypeId: input.type.id,
      discoveryCallId: input.discoveryCallId,
      inviteeName: input.inviteeName,
      inviteeEmail: input.inviteeEmail,
      title: input.type.name,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      meetingUrl: input.phone ? null : resolveMeetingUrl(input.type, input.meetingUrl),
      locationMode: input.phone ? "phone" : input.meetingUrl ? "custom" : input.type.locationMode,
      inviteePhone: input.phone ?? null,
      manageTokenHash: newLinkSecret(),
      bookedBy: input.bookedBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

// — Booking links (/book/<token>) —

export type BookingLinkState = "open" | "used" | "expired" | "revoked";

export function bookingLinkState(link: BookingLink, now = Date.now()): BookingLinkState {
  if (link.usedAt) return "used";
  if (link.revokedAt) return "revoked";
  if (link.expiresAt.getTime() <= now) return "expired";
  return "open";
}

export function bookingLinkByToken(token: string): { link: BookingLink; type: EventType } | null {
  const id = tokenId(token);
  if (!id) return null;
  const row = getDb()
    .select({ link: bookingLinks, type: eventTypes })
    .from(bookingLinks)
    .innerJoin(eventTypes, eq(bookingLinks.eventTypeId, eventTypes.id))
    .where(eq(bookingLinks.id, id))
    .get();
  if (!row || !verifyToken("booking", token, id, row.link.secret)) return null;
  return row;
}

export function bookingLinkUrl(link: Pick<BookingLink, "id" | "secret">) {
  return appUrl(`/book/${signedToken("booking", link.id, link.secret)}`);
}

/** Per discovery request: its appointments (soonest first) and its open booking link. */
export async function schedulingForDiscovery(discoveryCallIds: number[]) {
  const out = new Map<number, { appointments: (Appointment & { typeColour: string | null })[]; link: (BookingLink & { url: string }) | null }>();
  if (discoveryCallIds.length === 0) return out;
  const db = getDb();
  const appts = db
    .select({ a: coachingSessions, colour: eventTypes.colour })
    .from(coachingSessions)
    .leftJoin(eventTypes, eq(coachingSessions.eventTypeId, eventTypes.id))
    .where(inArray(coachingSessions.discoveryCallId, discoveryCallIds))
    .orderBy(asc(coachingSessions.startsAt))
    .all();
  const links = db
    .select()
    .from(bookingLinks)
    .where(
      and(
        inArray(bookingLinks.discoveryCallId, discoveryCallIds),
        isNull(bookingLinks.usedAt),
        isNull(bookingLinks.revokedAt),
        gt(bookingLinks.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(bookingLinks.createdAt))
    .all();
  for (const id of discoveryCallIds) out.set(id, { appointments: [], link: null });
  for (const { a, colour } of appts) out.get(a.discoveryCallId!)!.appointments.push({ ...a, typeColour: colour });
  for (const link of links) {
    const entry = out.get(link.discoveryCallId!)!;
    if (!entry.link) entry.link = { ...link, url: await bookingLinkUrl(link) };
  }
  return out;
}
