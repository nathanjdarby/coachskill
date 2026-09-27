/**
 * Minimal iCalendar (RFC 5545) builder for session invites. The UID is stable per
 * session and SEQUENCE increases on each change, so calendar apps update or remove
 * the existing event instead of adding a new one.
 */

type IcsEvent = {
  sessionId: number;
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

export function buildIcs(e: IcsEvent) {
  const end = new Date(e.start.getTime() + e.durationMinutes * 60_000);
  const description = [e.description, e.url ? `Join: ${e.url}` : ""].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Coach Skill//Sessions//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.method}`,
    "BEGIN:VEVENT",
    `UID:session-${e.sessionId}@coachskill.co.uk`,
    `SEQUENCE:${e.sequence}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(e.title)}`,
    description ? `DESCRIPTION:${escape(description)}` : "",
    e.url ? `URL:${e.url}` : "",
    e.url ? `LOCATION:${escape(e.url)}` : "",
    e.organizerEmail ? `ORGANIZER;CN=Monika Kozlowska:mailto:${e.organizerEmail}` : "",
    `STATUS:${e.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** An email attachment for the invite. */
export function icsAttachment(e: IcsEvent) {
  return {
    filename: e.method === "CANCEL" ? "cancelled-session.ics" : "session.ics",
    content: Buffer.from(buildIcs(e)).toString("base64"),
    contentType: `text/calendar; charset=utf-8; method=${e.method}`,
  };
}
