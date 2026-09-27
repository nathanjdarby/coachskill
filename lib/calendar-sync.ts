import "server-only";
import { lookup } from "dns/promises";
import { BlockList, isIP } from "net";
import ical, { type VEvent } from "node-ical";
import { and, asc, eq, gt, lt, or, isNull } from "drizzle-orm";
import { getBookingSettings } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { calendarSources, externalBusy, type CalendarSource } from "@/lib/db/schema";
import { londonLocalToUtc } from "@/lib/time";

// Reads Monika's own calendars from their private iCal addresses so her busy times
// block booking slots. Only start and end times are stored, never titles or details.

const DAY = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MAX_EVENTS = 5000;
/** How stale a source may get before the scheduled job refreshes it. */
export const REFRESH_AFTER_MS = 12 * 60 * 1000;

export class CalendarFetchError extends Error {}

// — Fetching safely —

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

function isPublicAddress(address: string) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return !blocked.check(mapped[1], "ipv4");
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) return !blocked.check(address, "ipv6");
  return false;
}

/** Turns what Monika pastes into an https URL, or explains what's wrong. */
export function normaliseCalendarUrl(raw: string): { url: string } | { error: string } {
  const trimmed = raw.trim().replace(/^webcals?:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { error: "That doesn't look like a web address." };
  }
  if (url.protocol !== "https:") return { error: "Use the secure (https://) address." };
  if (url.username || url.password) return { error: "Use the address without a username or password in it." };
  if (isIP(url.hostname.replace(/^\[|\]$/g, "")) || url.hostname === "localhost" || !url.hostname.includes(".")) {
    return { error: "Use the address your calendar app gives you." };
  }
  return { url: url.toString() };
}

async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string }[];
  try {
    addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new CalendarFetchError("Couldn't find that address. Check it's copied in full.");
  }
  if (addresses.length === 0 || !addresses.every((a) => isPublicAddress(a.address))) {
    throw new CalendarFetchError("That address points somewhere private, so it can't be used.");
  }
}

/** GETs a public https URL with a timeout, a size cap and re-checked redirects. */
async function fetchCalendarText(start: string) {
  let url = new URL(start);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "https:") throw new CalendarFetchError("The calendar redirected to an insecure address.");
    await assertPublicHost(url);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.1", "User-Agent": "CoachSkill-CalendarSync/1.0" },
      });
    } catch {
      throw new CalendarFetchError("Couldn't reach the calendar. Check the address and try again.");
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) throw new CalendarFetchError("The calendar sent a broken redirect.");
      url = new URL(next, url);
      continue;
    }
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new CalendarFetchError("The calendar said the address isn't valid (it may have been reset). Paste the current secret address.");
    }
    if (!res.ok || !res.body) throw new CalendarFetchError(`The calendar didn't respond properly (error ${res.status}).`);
    const declared = Number(res.headers.get("content-length"));
    if (declared > MAX_BYTES) throw new CalendarFetchError("The calendar is too large to read.");

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new CalendarFetchError("The calendar is too large to read.");
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new CalendarFetchError("That address didn't return a calendar. Make sure it's the iCal (.ics) address.");
    }
    return text;
  }
  throw new CalendarFetchError("The calendar redirected too many times.");
}

// — Reading busy times —

type Busy = { startsAt: Date; endsAt: Date; allDay: boolean };

/** All-day dates mean the London calendar day, whatever time zone the server runs in. */
function londonMidnight(d: Date) {
  return londonLocalToUtc(d.getFullYear(), d.getMonth() + 1, d.getDate(), 0, 0);
}

function ignored(ev: Pick<VEvent, "status" | "transparency" | "uid">) {
  return (
    ev.status === "CANCELLED" ||
    ev.transparency === "TRANSPARENT" ||
    // Coach Skill's own invites and feed events are already counted.
    String(ev.uid ?? "").endsWith("@coachskill.co.uk")
  );
}

/** Busy periods between `from` and `to` from an iCal document. */
export function busyFromIcs(text: string, from: Date, to: Date, opts: { blockAllDay: boolean }): Busy[] {
  const data = ical.sync.parseICS(text);
  const out: Busy[] = [];
  for (const comp of Object.values(data)) {
    if (!comp || comp.type !== "VEVENT") continue;
    const event = comp as VEvent;
    // Overrides are applied through their base event's recurrences.
    if (event.recurrenceid || !event.start || ignored(event)) continue;
    let instances;
    try {
      instances = ical.expandRecurringEvent(event, { from, to, expandOngoing: true });
    } catch {
      continue;
    }
    for (const inst of instances) {
      if (ignored(inst.event)) continue;
      if (inst.isFullDay) {
        if (!opts.blockAllDay) continue;
        const startsAt = londonMidnight(inst.start);
        const endDay = inst.end && inst.end.getTime() > inst.start.getTime() ? inst.end : new Date(inst.start.getTime() + DAY);
        out.push({ startsAt, endsAt: londonMidnight(endDay), allDay: true });
      } else {
        if (!inst.end || inst.end.getTime() <= inst.start.getTime()) continue;
        out.push({ startsAt: new Date(inst.start.getTime()), endsAt: new Date(inst.end.getTime()), allDay: false });
      }
      if (out.length >= MAX_EVENTS) return out;
    }
  }
  return out.filter((b) => b.endsAt > from && b.startsAt < to);
}

function syncWindow(now: Date) {
  const settings = getBookingSettings();
  return { from: new Date(now.getTime() - DAY), to: new Date(now.getTime() + (settings.maxAdvanceDays + 2) * DAY) };
}

/**
 * Refreshes one source. On success its busy times are replaced in one go; on failure
 * the previous ones are kept and the error is saved to show in the admin.
 */
export async function syncCalendarSource(source: CalendarSource, now = new Date()) {
  const db = getDb();
  db.update(calendarSources).set({ lastFetchedAt: now }).where(eq(calendarSources.id, source.id)).run();
  try {
    const text = await fetchCalendarText(source.url);
    const { from, to } = syncWindow(now);
    const busy = busyFromIcs(text, from, to, { blockAllDay: source.blockAllDay });
    db.transaction(() => {
      db.delete(externalBusy).where(eq(externalBusy.sourceId, source.id)).run();
      if (busy.length) db.insert(externalBusy).values(busy.map((b) => ({ ...b, sourceId: source.id }))).run();
      db.update(calendarSources)
        .set({ lastSuccessAt: now, lastError: null, busyCount: busy.length })
        .where(eq(calendarSources.id, source.id))
        .run();
    });
    return { ok: true as const, count: busy.length };
  } catch (err) {
    const message = err instanceof CalendarFetchError ? err.message : "The calendar couldn't be read.";
    if (!(err instanceof CalendarFetchError)) console.error(`Calendar source ${source.id} failed`, err);
    db.update(calendarSources).set({ lastError: message }).where(eq(calendarSources.id, source.id)).run();
    return { ok: false as const, error: message };
  }
}

/** Scheduled job: refreshes active sources that haven't been read for a while. */
export async function syncDueCalendars(now: Date) {
  const due = getDb()
    .select()
    .from(calendarSources)
    .where(
      and(
        eq(calendarSources.active, true),
        or(isNull(calendarSources.lastFetchedAt), lt(calendarSources.lastFetchedAt, new Date(now.getTime() - REFRESH_AFTER_MS))),
      ),
    )
    .all();
  let synced = 0;
  for (const source of due) if ((await syncCalendarSource(source, now)).ok) synced++;
  return synced;
}

export function listCalendarSources() {
  return getDb().select().from(calendarSources).orderBy(asc(calendarSources.createdAt)).all();
}

/** Busy times from active sources overlapping a window (for slots and the admin calendar). */
export function externalBusyBetween(from: Date, to: Date) {
  return getDb()
    .select({ id: externalBusy.id, startsAt: externalBusy.startsAt, endsAt: externalBusy.endsAt, allDay: externalBusy.allDay, label: calendarSources.label })
    .from(externalBusy)
    .innerJoin(calendarSources, eq(externalBusy.sourceId, calendarSources.id))
    .where(and(eq(calendarSources.active, true), lt(externalBusy.startsAt, to), gt(externalBusy.endsAt, from)))
    .orderBy(asc(externalBusy.startsAt))
    .all();
}

/** Shows only the host and the end of a secret address. */
export function maskCalendarUrl(url: string) {
  try {
    const u = new URL(url);
    return `${u.host}/…${u.pathname.slice(-6)}`;
  } catch {
    return "…";
  }
}
