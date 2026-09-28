import "server-only";
import { eq } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { manageUrl } from "@/lib/appointments";
import { getDb } from "@/lib/db";
import { clients, coachingSessions, users, type Appointment } from "@/lib/db/schema";
import { emailAdminBooking, emailSessionBooked, emailSessionCancelled, emailSessionRescheduled } from "@/lib/email";
import { icsAttachment } from "@/lib/ics";
import { guestJoinUrl, hostJoinUrl } from "@/lib/join";
import { joinNote } from "@/lib/meeting";
import { adminEmails } from "@/lib/portal";
import { formatDateTime } from "@/lib/time";

type Change = "booked" | "rescheduled" | "cancelled";
export type Actor = "admin" | "client" | "invitee";

/**
 * Who hears about an appointment: the client's account if they have one, otherwise the
 * invitee's email with their manage link. Null when there's nobody to email.
 */
export async function appointmentRecipient(appointment: Appointment) {
  if (appointment.clientId) {
    const [account] = await getDb().select().from(users).where(eq(users.clientId, appointment.clientId)).limit(1);
    if (account) return { to: account.email, name: account.name, url: await appUrl("/portal/sessions"), guest: false };
  }
  if (appointment.inviteeEmail) {
    return {
      to: appointment.inviteeEmail,
      name: appointment.inviteeName ?? appointment.inviteeEmail,
      url: await manageUrl(appointment),
      guest: true,
    };
  }
  return null;
}

/**
 * Emails the client or invitee about an appointment change with a calendar invite,
 * and tells the admins when the client or invitee made the change themselves.
 */
export async function notifyAppointmentChange(sessionId: number, change: Change, actor: Actor) {
  const db = getDb();
  const [row] = await db
    .select({ session: coachingSessions, clientName: clients.fullName })
    .from(coachingSessions)
    .leftJoin(clients, eq(coachingSessions.clientId, clients.id))
    .where(eq(coachingSessions.id, sessionId))
    .limit(1);
  if (!row) return;
  const { session } = row;
  const organizerEmail = process.env.EMAIL_REPLY_TO?.trim() || undefined;

  // Each person's invite carries their own join link.
  const ics = (url: string | null) =>
    icsAttachment({
      sessionId: session.id,
      sequence: session.icsSequence,
      method: change === "cancelled" ? "CANCEL" : "REQUEST",
      start: session.startsAt,
      durationMinutes: session.durationMinutes,
      title: `${session.title} with Monika`,
      url,
      organizerEmail,
    });

  const recipient = await appointmentRecipient(session);
  if (recipient) {
    const joinUrl = await guestJoinUrl(session, recipient.name);
    const base = {
      ...recipient,
      title: session.title,
      startsAt: session.startsAt,
      durationMinutes: session.durationMinutes,
      meetingUrl: session.meetingUrl,
      joinUrl,
      attachments: [ics(joinUrl)],
    };
    if (change === "booked") await emailSessionBooked(base);
    else if (change === "rescheduled") await emailSessionRescheduled(base);
    else await emailSessionCancelled({ ...base, byClient: actor === "client" });
  }

  if (actor !== "admin") {
    const to = await adminEmails();
    if (to.length) {
      const who = row.clientName ?? session.inviteeName ?? session.inviteeEmail ?? "Someone";
      const verb = change === "booked" ? "booked" : change === "rescheduled" ? "moved" : "cancelled";
      const [url, buttonLabel] = session.clientId
        ? [`/admin/clients/${session.clientId}#sessions`, "Open client"]
        : session.discoveryCallId
          ? [`/admin/discovery#request-${session.discoveryCallId}`, "Open request"]
          : ["/admin/calendar", "Open calendar"];
      const hostUrl = await hostJoinUrl(session, "");
      await emailAdminBooking({
        to,
        subject: `${who} ${verb} ${session.discoveryCallId && !session.clientId ? `a ${session.title.toLowerCase()}` : "a session"}`,
        lines: [
          `${session.title}: ${formatDateTime(session.startsAt)} (UK), ${session.durationMinutes} minutes.`,
          ...(hostUrl && change !== "cancelled" ? [`Join: ${hostUrl}`] : []),
          ...(change !== "cancelled" && joinNote(session.meetingUrl, "admin") ? [joinNote(session.meetingUrl, "admin")!] : []),
        ],
        url: await appUrl(url),
        buttonLabel,
        attachments: [ics(hostUrl)],
      });
    }
  }
}

/** Older name, used by the portal booking actions. */
export const notifySessionChange = notifyAppointmentChange;
