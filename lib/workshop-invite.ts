import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { signups, workshops, type Workshop } from "@/lib/db/schema";
import { emailWorkshopUpdated } from "@/lib/email";
import { buildIcs, icsAttachment } from "@/lib/ics";
import { attendeeJoinUrl } from "@/lib/join";
import { workshopJoinUrl } from "@/lib/meeting";
import { SEAT_STATUSES } from "@/lib/signup-status";

// Calendar invites and joining details for workshop attendees. The invite UID is
// the same for every attendee of a run (workshop-<id>), and SEQUENCE follows the
// run's ics_sequence so a changed time updates the event people already have.

export { workshopJoinUrl } from "@/lib/meeting";

function icsFields(w: Workshop, joinUrl: string | null) {
  return {
    sessionId: w.id,
    uid: `workshop-${w.id}@coachskill.co.uk`,
    sequence: w.icsSequence,
    start: w.startsAt!,
    durationMinutes: w.durationMinutes,
    title: w.name,
    description: "Coach Skill workshop with Monika Kozlowska",
    url: joinUrl,
    location: w.location,
    organizerEmail: process.env.EMAIL_REPLY_TO?.trim() || undefined,
  };
}

/** The calendar file for one attendee (`joinUrl` is their own link from lib/join.ts). */
export function workshopIcs(w: Workshop, joinUrl: string | null) {
  return buildIcs({ ...icsFields(w, joinUrl), method: "REQUEST" });
}

/** An invite to attach to workshop emails (none until the run has a date). */
export function workshopInviteAttachments(w: Workshop, joinUrl: string | null) {
  return w.startsAt ? [icsAttachment({ ...icsFields(w, joinUrl), method: "REQUEST" }, "workshop")] : [];
}

/** What the workshop emails need to know about a run, for one attendee. */
export async function workshopEmailInfo(w: Workshop, signup: { id: number; name: string }) {
  const joinUrl = await attendeeJoinUrl(w, signup);
  return {
    workshopName: w.name,
    startsAt: w.startsAt,
    location: w.location,
    meetingUrl: workshopJoinUrl(w),
    joinUrl,
    attachments: workshopInviteAttachments(w, joinUrl),
  };
}

/** People holding a place on a run (deposit paid, not on hold or declined). */
export function seatHolders(workshopId: number) {
  return getDb()
    .select()
    .from(signups)
    .where(and(eq(signups.workshopId, workshopId), isNotNull(signups.depositPaidAt), inArray(signups.status, [...SEAT_STATUSES])))
    .all();
}

/** Emails every seat holder the updated details and a calendar update. Returns how many were emailed. */
export async function notifyWorkshopChange(workshopId: number) {
  const w = getDb().select().from(workshops).where(eq(workshops.id, workshopId)).get();
  if (!w) return 0;
  const url = await appUrl("/portal");
  let sent = 0;
  for (const s of seatHolders(w.id)) {
    const info = await workshopEmailInfo(w, s);
    const result = await emailWorkshopUpdated({ ...info, to: s.email, name: s.name, url });
    if (result.ok) sent++;
  }
  return sent;
}
