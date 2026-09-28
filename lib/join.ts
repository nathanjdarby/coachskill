import "server-only";
import { appUrl } from "@/lib/app-url";
import { appointmentToken } from "@/lib/appointments";
import type { Appointment, Workshop } from "@/lib/db/schema";
import { jaasEnabled, roomNameFrom } from "@/lib/jaas";
import { personalJoinUrl, workshopJoinUrl } from "@/lib/meeting";
import { signedToken, tokenId, verifyToken } from "@/lib/signed-links";

// Where "Join" goes for each person. With JaaS on, calls with a private video room
// open inside Coach Skill (/meet/…); otherwise, or for Zoom/Teams links, it's the
// room's own link with the person's name filled in.

type JoinAppointment = Pick<Appointment, "id" | "manageTokenHash" | "meetingUrl" | "title">;
type JoinWorkshop = Pick<Workshop, "id" | "name" | "locationMode" | "meetingUrl">;

/** True when this call opens in the in-app room. */
export function usesInAppRoom(meetingUrl: string | null | undefined) {
  return jaasEnabled() && roomNameFrom(meetingUrl) !== null;
}

/** For the client or prospect. */
export async function guestJoinUrl(a: JoinAppointment, name: string | null | undefined) {
  if (!a.meetingUrl) return null;
  if (usesInAppRoom(a.meetingUrl)) return appUrl(`/meet/a/${appointmentToken(a)}`);
  return personalJoinUrl(a.meetingUrl, { name, subject: a.title });
}

/** For Monika (or another admin): she's the host in the in-app room. */
export async function hostJoinUrl(a: JoinAppointment, hostName: string) {
  if (!a.meetingUrl) return null;
  if (usesInAppRoom(a.meetingUrl)) return appUrl(`/meet/host/a/${a.id}`);
  return personalJoinUrl(a.meetingUrl, { name: hostName, subject: a.title });
}

/** A workshop attendee's own link (signed with their signup, so it works from email). */
export function attendeeToken(signupId: number) {
  return signedToken("attend", signupId, "workshop-attendee");
}

export function verifyAttendeeToken(token: string) {
  const id = tokenId(token);
  return id && verifyToken("attend", token, id, "workshop-attendee") ? id : null;
}

export async function attendeeJoinUrl(w: JoinWorkshop, signup: { id: number; name: string }) {
  const url = workshopJoinUrl(w);
  if (!url) return null;
  if (usesInAppRoom(url)) return appUrl(`/meet/w/${attendeeToken(signup.id)}`);
  return personalJoinUrl(url, { name: signup.name, subject: w.name });
}

export async function workshopHostJoinUrl(w: JoinWorkshop, hostName: string) {
  const url = workshopJoinUrl(w);
  if (!url) return null;
  if (usesInAppRoom(url)) return appUrl(`/meet/host/w/${w.id}`);
  return personalJoinUrl(url, { name: hostName, subject: w.name });
}

const MINUTE = 60_000;
/** Guests can go in from 15 minutes before until 30 minutes after the end. */
export function guestRoomWindow(startsAt: Date, durationMinutes: number, now = Date.now()) {
  const opensAt = new Date(startsAt.getTime() - 15 * MINUTE);
  const closesAt = new Date(startsAt.getTime() + (durationMinutes + 30) * MINUTE);
  return { state: now < opensAt.getTime() ? "early" : now > closesAt.getTime() ? "ended" : "open", opensAt, closesAt } as const;
}

/** Monika's token lasts a day past the end, and always at least 3 hours from now. */
export function hostTokenExpiry(endsAt: Date, now = Date.now()) {
  return new Date(Math.max(endsAt.getTime() + 24 * 60 * MINUTE, now + 3 * 60 * MINUTE));
}
