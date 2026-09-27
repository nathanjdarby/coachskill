import "server-only";
import { and, asc, gte, isNotNull, isNull, lt, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, coachingSessions, eventTypes, workshops } from "@/lib/db/schema";
import { externalBusyBetween } from "@/lib/calendar-sync";
import { londonDate } from "@/lib/time";
import { seatsTaken } from "@/lib/workshops";

export type AgendaItem = {
  kind: "appointment" | "workshop" | "busy";
  id: number;
  start: Date;
  end: Date;
  title: string;
  who: string;
  colour: string;
  joinUrl: string | null;
  allDay?: boolean;
  /** Where the admin goes to manage it. */
  href: string;
};

const MINUTE = 60_000;
const WORKSHOP_COLOUR = "#fbbf24";
const BUSY_COLOUR = "#64748b";

/** Everything booked between `from` and `to`: appointments and workshop dates, soonest first. */
export async function listAgenda(from: Date, to: Date): Promise<AgendaItem[]> {
  const db = getDb();
  const appts = await db
    .select({ a: coachingSessions, typeName: eventTypes.name, colour: eventTypes.colour, clientName: clients.fullName })
    .from(coachingSessions)
    .leftJoin(eventTypes, eq(coachingSessions.eventTypeId, eventTypes.id))
    .leftJoin(clients, eq(coachingSessions.clientId, clients.id))
    .where(and(isNull(coachingSessions.cancelledAt), gte(coachingSessions.startsAt, from), lt(coachingSessions.startsAt, to)))
    .orderBy(asc(coachingSessions.startsAt));
  const runs = await db
    .select()
    .from(workshops)
    .where(and(isNotNull(workshops.startsAt), gte(workshops.startsAt, from), lt(workshops.startsAt, to)))
    .orderBy(asc(workshops.startsAt));

  const items: AgendaItem[] = [
    ...appts.map(({ a, typeName, colour, clientName }) => ({
      kind: "appointment" as const,
      id: a.id,
      start: a.startsAt,
      end: new Date(a.startsAt.getTime() + a.durationMinutes * MINUTE),
      title: a.title,
      who: [clientName ?? a.inviteeName ?? a.inviteeEmail ?? "—", typeName && typeName !== a.title ? typeName : null]
        .filter(Boolean)
        .join(" · "),
      colour: colour ?? "#22d3ee",
      joinUrl: a.meetingUrl,
      href: a.clientId ? `/admin/clients/${a.clientId}#sessions` : a.discoveryCallId ? `/admin/discovery#request-${a.discoveryCallId}` : "/admin/calendar",
    })),
    ...(await Promise.all(
      runs.map(async (w) => {
        const taken = await seatsTaken(w.id);
        return {
          kind: "workshop" as const,
          id: w.id,
          start: w.startsAt!,
          end: new Date(w.startsAt!.getTime() + w.durationMinutes * MINUTE),
          title: w.name,
          who: `${taken}${w.capacity != null ? ` / ${w.capacity}` : ""} booked${w.published ? "" : " · hidden"}`,
          colour: WORKSHOP_COLOUR,
          joinUrl: null,
          href: `/admin/signups?workshop=${w.id}`,
        };
      }),
    )),
  ];
  // Busy times from Monika's own calendars, so it's clear why those slots aren't offered.
  for (const b of externalBusyBetween(from, to)) {
    items.push({
      kind: "busy",
      id: b.id,
      start: b.startsAt,
      end: b.endsAt,
      title: "Busy",
      who: `From ${b.label}`,
      colour: BUSY_COLOUR,
      joinUrl: null,
      allDay: b.allDay,
      href: "/admin/scheduling/connections",
    });
  }
  return items.sort((x, y) => x.start.getTime() - y.start.getTime());
}

/** Groups agenda items by their London calendar day (YYYY-MM-DD). */
export function groupByDay(items: AgendaItem[]) {
  const days = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const d = londonDate(item.start);
    const key = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return [...days.entries()].map(([date, dayItems]) => ({ date, items: dayItems }));
}

/** From the start of today (London) for `days` days. */
export function agendaWindow(days: number, now = new Date()) {
  const d = londonDate(now);
  const from = new Date(Date.UTC(d.year, d.month - 1, d.day) - 2 * 60 * 60 * 1000);
  return { from, to: new Date(from.getTime() + (days + 1) * 24 * 60 * MINUTE) };
}
