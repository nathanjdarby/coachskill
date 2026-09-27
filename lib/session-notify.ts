import "server-only";
import { eq } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { clients, coachingSessions, users } from "@/lib/db/schema";
import { emailAdminBooking, emailSessionBooked, emailSessionCancelled, emailSessionRescheduled } from "@/lib/email";
import { icsAttachment } from "@/lib/ics";
import { joinNote } from "@/lib/meeting";
import { adminEmails } from "@/lib/portal";
import { formatDateTime } from "@/lib/time";

type Change = "booked" | "rescheduled" | "cancelled";

/**
 * Emails the client (if they have an account) about a session change with a calendar
 * invite, and tells the admins when the client made the change themselves.
 */
export async function notifySessionChange(sessionId: number, change: Change, actor: "admin" | "client") {
  const db = getDb();
  const [row] = await db
    .select({ session: coachingSessions, client: clients })
    .from(coachingSessions)
    .innerJoin(clients, eq(coachingSessions.clientId, clients.id))
    .where(eq(coachingSessions.id, sessionId))
    .limit(1);
  if (!row) return;
  const { session, client } = row;
  const [account] = await db.select().from(users).where(eq(users.clientId, client.id)).limit(1);
  const organizerEmail = process.env.EMAIL_REPLY_TO?.trim() || undefined;

  const ics = icsAttachment({
    sessionId: session.id,
    sequence: session.icsSequence,
    method: change === "cancelled" ? "CANCEL" : "REQUEST",
    start: session.startsAt,
    durationMinutes: session.durationMinutes,
    title: `${session.title} with Monika`,
    url: session.meetingUrl,
    organizerEmail,
  });

  if (account) {
    const base = {
      to: account.email,
      name: account.name,
      title: session.title,
      startsAt: session.startsAt,
      durationMinutes: session.durationMinutes,
      meetingUrl: session.meetingUrl,
      url: await appUrl("/portal/sessions"),
      attachments: [ics],
    };
    if (change === "booked") await emailSessionBooked(base);
    else if (change === "rescheduled") await emailSessionRescheduled(base);
    else await emailSessionCancelled({ ...base, byClient: actor === "client" });
  }

  if (actor === "client") {
    const to = await adminEmails();
    if (to.length) {
      const verb = change === "booked" ? "booked" : change === "rescheduled" ? "moved" : "cancelled";
      await emailAdminBooking({
        to,
        subject: `${client.fullName} ${verb} a session`,
        lines: [
          `${session.title}: ${formatDateTime(session.startsAt)} (UK), ${session.durationMinutes} minutes.`,
          ...(session.meetingUrl && change !== "cancelled" ? [`Join: ${session.meetingUrl}`] : []),
          ...(change !== "cancelled" && joinNote(session.meetingUrl, "admin") ? [joinNote(session.meetingUrl, "admin")!] : []),
        ],
        url: await appUrl(`/admin/clients/${client.id}#sessions`),
        attachments: [ics],
      });
    }
  }
}
