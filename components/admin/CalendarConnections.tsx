"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addCalendarSource,
  refreshCalendarSource,
  removeCalendarSource,
  rotateCalendarFeed,
  updateCalendarSource,
} from "@/app/actions/calendar-sync";
import type { FormState } from "@/app/actions/types";
import { CopyLink, FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";
import { formatDateTime } from "@/lib/time";

export type SourceRow = {
  id: number;
  label: string;
  maskedUrl: string;
  active: boolean;
  blockAllDay: boolean;
  lastSuccessAt: Date | null;
  lastError: string | null;
  busyCount: number;
};

export function AddCalendarForm() {
  const [state, action] = useActionState(addCalendarSource, undefined);
  return (
    <form action={action} className="pt-form">
      <div className="pt-field">
        <label htmlFor="cal-label">Name</label>
        <input id="cal-label" name="label" placeholder="e.g. Personal, Work" defaultValue={state?.fields?.label ?? ""} maxLength={60} />
      </div>
      <div className="pt-field">
        <label htmlFor="cal-url">Secret iCal address</label>
        <input id="cal-url" name="url" type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://… .ics" required />
        <FieldError state={state} name="url" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Connecting…">Connect calendar</SubmitButton>
    </form>
  );
}

/** One connected calendar: status, switches, refresh and remove. */
export function CalendarSourceCard({ source }: { source: SourceRow }) {
  const [result, setResult] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<FormState>) => startTransition(async () => setResult(await action()));

  return (
    <li className={`pt-card cs-source ${source.active ? "" : "is-off"}`}>
      <div className="cs-head">
        <div>
          <p className="cs-label">{source.label}</p>
          <p className="pt-muted pt-small cs-url">{source.maskedUrl}</p>
        </div>
        {!source.active ? (
          <span className="pt-badge">Off</span>
        ) : source.lastError ? (
          <span className="pt-badge is-danger">Problem</span>
        ) : (
          <span className="pt-badge is-ok">Connected</span>
        )}
      </div>
      <p className="pt-small">
        {source.lastError ? (
          <span className="pt-danger">{source.lastError}</span>
        ) : source.lastSuccessAt ? (
          <span className="pt-muted">
            {source.busyCount} busy {source.busyCount === 1 ? "time" : "times"} · updated {formatDateTime(source.lastSuccessAt)}
          </span>
        ) : (
          <span className="pt-muted">Not read yet</span>
        )}
      </p>
      <div className="cs-switches">
        <label className="pt-check">
          <input
            type="checkbox"
            checked={source.active}
            disabled={pending}
            onChange={(e) => run(() => updateCalendarSource(source.id, { active: e.target.checked }))}
          />
          <span>Block my busy times</span>
        </label>
        <label className="pt-check">
          <input
            type="checkbox"
            checked={source.blockAllDay}
            disabled={pending}
            onChange={(e) => run(() => updateCalendarSource(source.id, { blockAllDay: e.target.checked }))}
          />
          <span>All-day events block the whole day</span>
        </label>
      </div>
      <div className="pt-btn-row">
        <button type="button" className="pt-btn pt-btn-secondary" disabled={pending} onClick={() => run(() => refreshCalendarSource(source.id))}>
          {pending ? "Working…" : "Refresh now"}
        </button>
        <button
          type="button"
          className="pt-link-btn pt-small pt-danger"
          disabled={pending}
          onClick={() => confirm(`Disconnect "${source.label}"? Its busy times will stop blocking bookings.`) && run(() => removeCalendarSource(source.id))}
        >
          Disconnect
        </button>
      </div>
      {result?.message && !result.ok && <FormMessage state={result} />}
      {result?.message && result.ok && <p className="pt-muted pt-small">{result.message}</p>}
    </li>
  );
}

export function FeedLink({ url }: { url: string }) {
  const [result, setResult] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();
  return (
    <div className="cs-feed">
      <CopyLink link={url} label="Calendar feed address" />
      <button
        type="button"
        className="pt-link-btn pt-small pt-danger"
        disabled={pending}
        onClick={() =>
          confirm("Create a new address? Calendars subscribed with the current one will stop updating until you subscribe again.") &&
          startTransition(async () => setResult(await rotateCalendarFeed()))
        }
      >
        Create a new address
      </button>
      <FormMessage state={result} />
    </div>
  );
}
