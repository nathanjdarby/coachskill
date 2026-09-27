/**
 * Minimal iCalendar (RFC 5545) builder for session invites. The UID is stable per
 * session and SEQUENCE increases on each change, so calendar apps update or remove
 * the existing event instead of adding a new one.
 */

type IcsEvent = {
  sessionId: number;
  /** Overrides the session-based UID (e.g. workshop invites). */
  uid?: string;
  location?: string | null;
  sequence: number;
  method: "REQUEST" | "CANCEL";
  start: Date;
  durationMinutes: number;
  title: string;
  description?: string;
  url?: string | null;
  organizerEmail?: string;
};

function stamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets, as the spec requires. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

type VEvent = {
  uid: string;
  sequence: number;
  start: Date;
  durationMinutes: number;
  title: string;
  description?: string;
  url?: string | null;
  location?: string | null;
  organizerEmail?: string;
  cancelled?: boolean;
};

function veventLines(e: VEvent) {
  const end = new Date(e.start.getTime() + e.durationMinutes * 60_000);
  const description = [e.description, e.url ? `Join: ${e.url}` : ""].filter(Boolean).join("\n");
  const location = e.url ?? e.location;
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `SEQUENCE:${e.sequence}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(e.title)}`,
    description ? `DESCRIPTION:${escape(description)}` : "",
    e.url ? `URL:${e.url}` : "",
    location ? `LOCATION:${escape(location)}` : "",
    e.organizerEmail ? `ORGANIZER;CN=Monika Kozlowska:mailto:${e.organizerEmail}` : "",
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  ].filter(Boolean);
}

export function buildIcs(e: IcsEvent) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Coach Skill//Sessions//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.method}`,
    ...veventLines({
      uid: e.uid ?? `session-${e.sessionId}@coachskill.co.uk`,
      sequence: e.sequence,
      start: e.start,
      durationMinutes: e.durationMinutes,
      title: e.title,
      description: e.description,
      url: e.url,
      location: e.location,
      organizerEmail: e.organizerEmail,
      cancelled: e.method === "CANCEL",
    }),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A subscribable calendar (no METHOD, so apps treat it as a published feed). */
export function buildFeed(name: string, events: VEvent[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Coach Skill//Feed//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escape(name)}`,
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
    ...events.flatMap(veventLines),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** An email attachment for the invite. */
export function icsAttachment(e: IcsEvent, name = "session") {
  return {
    filename: e.method === "CANCEL" ? `cancelled-${name}.ics` : `${name}.ics`,
    content: Buffer.from(buildIcs(e)).toString("base64"),
    contentType: `text/calendar; charset=utf-8; method=${e.method}`,
  };
}
