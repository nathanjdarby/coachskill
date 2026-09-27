// Coaching happens in UK time; inputs and displays use Europe/London.

export const TIME_ZONE = "Europe/London";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

export function formatDateTime(d: Date) {
  return dateTime.format(d);
}

export function formatDate(d: Date) {
  return dateOnly.format(d);
}

function londonOffsetMs(at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - at.getTime();
}

/** The UTC instant for a wall-clock time in London (month is 1–12). Handles clock changes. */
export function londonLocalToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let result = guess - londonOffsetMs(new Date(guess));
  // Re-check once in case the guess and result straddle a clock change.
  result = guess - londonOffsetMs(new Date(result));
  return new Date(result);
}

/** Parses a `<input type="datetime-local">` value as London time. */
export function parseLondonDateTime(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const d = londonLocalToUtc(+m[1], +m[2], +m[3], +m[4], +m[5]);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The London calendar date of an instant, as numbers (month is 1–12). */
export function londonDate(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
}

const dayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TIME_ZONE });
const timeLabel = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });

/** e.g. "Mon, 5 Oct" in London time. */
export function formatDay(d: Date) {
  return dayLabel.format(d);
}

/** e.g. "14:30" in London time. */
export function formatTime(d: Date) {
  return timeLabel.format(d);
}

/** Formats a date as a `<input type="datetime-local">` value in London time. */
export function toLondonInputValue(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
