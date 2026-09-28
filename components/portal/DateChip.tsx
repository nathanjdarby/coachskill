import { TIME_ZONE } from "@/lib/time";

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: TIME_ZONE });
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: TIME_ZONE });
const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: TIME_ZONE });

/** A small calendar-style date: THU / 1 / OCT. */
export function DateChip({ date, muted = false }: { date: Date; muted?: boolean }) {
  return (
    <span className={`pc-chip ${muted ? "is-muted" : ""}`} aria-hidden>
      <span className="pc-chip-weekday">{weekday.format(date)}</span>
      <span className="pc-chip-day">{day.format(date)}</span>
      <span className="pc-chip-month">{month.format(date)}</span>
    </span>
  );
}
