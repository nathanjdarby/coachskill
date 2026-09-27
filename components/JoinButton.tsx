"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;
const OPENS_BEFORE_MIN = 15;
const TICK_MS = 15_000;

// A shared clock that ticks every 15 seconds; null while rendering on the server.
function subscribe(onTick: () => void) {
  const id = setInterval(onTick, TICK_MS);
  return () => clearInterval(id);
}
const tick = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

function startsIn(ms: number) {
  const minutes = Math.ceil(ms / MINUTE);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * Join button that opens 15 minutes before the start and disappears once the
 * appointment is over; before that it says when it opens.
 */
export function JoinButton({
  url,
  startsAt,
  durationMinutes,
  label = "Join",
  className = "pt-btn pt-btn-primary",
}: {
  url: string;
  startsAt: Date | string;
  durationMinutes: number;
  label?: string;
  className?: string;
}) {
  const now = useSyncExternalStore(subscribe, tick, () => null);
  const start = new Date(startsAt).getTime();
  const opens = start - OPENS_BEFORE_MIN * MINUTE;
  const end = start + durationMinutes * MINUTE;

  if (now !== null && now > end) return null;
  if (now !== null && now >= opens) {
    return (
      <a href={url} className={className} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }
  return (
    <span className="pt-join-wait">
      <button type="button" className={className} disabled>
        {label}
      </button>
      <span className="pt-muted pt-small">
        Opens {OPENS_BEFORE_MIN} min before{now !== null ? ` · starts in ${startsIn(start - now)}` : ""}
      </span>
    </span>
  );
}
