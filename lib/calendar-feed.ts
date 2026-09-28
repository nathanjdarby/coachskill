import "server-only";
import { randomBytes, timingSafeEqual } from "crypto";
import { and, asc, eq, gte, isNotNull } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { getBookingSettings } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { bookingSettings, clients, coachingSessions, eventTypes, workshops } from "@/lib/db/schema";
import { buildFeed } from "@/lib/ics";
import { hostJoinUrl, workshopHostJoinUrl } from "@/lib/join";
import { seatsTaken } from "@/lib/workshops";

// Monika's private subscription feed: every appointment and workshop date, so they
// show in Google, Apple or Outlook calendar. The URL's token is the only protection.

const DAY = 24 * 60 * 60 * 1000;

/** The current feed token, creating one the first time. */
export function feedToken() {
  const settings = getBookingSettings();
  if (settings.feedToken) return settings.feedToken;
  return rotateFeedToken();
}

/** A new token; the old feed address stops working. */
export function rotateFeedToken() {
  const token = randomBytes(32).toString("base64url");
  getDb().update(bookingSettings).set({ feedToken: token }).where(eq(bookingSettings.id, 1)).run();
  return token;
}

export async function feedUrl() {
  return appUrl(`/api/calendar/${feedToken()}.ics`);
}

export function isFeedToken(given: string) {
  const current = getBookingSettings().feedToken;
  if (!current) return false;
  const a = Buffer.from(current);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The feed: appointments from the last 30 days onwards and all dated workshops. */
export async function buildCalendarFeed(now = new Date()) {
  const db = getDb();
  const since = new Date(now.getTime() - 30 * DAY);
  const appts = db
    .select({ a: coachingSessions, typeName: eventTypes.name, clientName: clients.fullName })
    .from(coachingSessions)
    .leftJoin(eventTypes, eq(coachingSessions.eventTypeId, eventTypes.id))
    .leftJoin(clients, eq(coachingSessions.clientId, clients.id))
    .where(gte(coachingSessions.startsAt, since))
    .orderBy(asc(coachingSessions.startsAt))
    .all();
  const runs = db
    .select()
    .from(workshops)
    .where(and(isNotNull(workshops.startsAt), gte(workshops.startsAt, since)))
    .orderBy(asc(workshops.startsAt))
    .all();

  const adminLink = await appUrl("/admin/calendar");
  const events = [
    ...(await Promise.all(appts.map(async ({ a, clientName }) => {
      const who = clientName ?? a.inviteeName ?? a.inviteeEmail;
      return {
        uid: `session-${a.id}@coachskill.co.uk`,
        sequence: a.icsSequence,
        start: a.startsAt,
        durationMinutes: a.durationMinutes,
        title: who ? `${a.title}: ${who}` : a.title,
        description: [who && `With ${who}${a.inviteeEmail && !clientName ? ` (${a.inviteeEmail})` : ""}`, `Coach Skill: ${adminLink}`]
          .filter(Boolean)
          .join("\n"),
        url: await hostJoinUrl(a, ""),
        location: a.locationText,
        cancelled: Boolean(a.cancelledAt),
      };
    }))),
    ...(await Promise.all(
      runs.map(async (w) => {
        const taken = await seatsTaken(w.id);
        return {
          uid: `workshop-${w.id}@coachskill.co.uk`,
          sequence: w.icsSequence,
          start: w.startsAt!,
          durationMinutes: w.durationMinutes,
          title: w.name,
          description: `${taken}${w.capacity != null ? ` of ${w.capacity}` : ""} places booked\nCoach Skill: ${await appUrl(`/admin/signups?workshop=${w.id}`)}`,
          url: await workshopHostJoinUrl(w, ""),
          location: w.location,
          cancelled: false,
        };
      }),
    )),
  ];
  return buildFeed("Coach Skill", events);
}
