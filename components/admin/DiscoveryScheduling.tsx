"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { cancelAppointmentAsAdmin, revokeBookingLink, scheduleDiscoveryCall, sendBookingLink } from "@/app/actions/appointments";
import type { FormState } from "@/app/actions/types";
import { CallNowButton } from "@/components/admin/CallNowButton";
import { CallTypeFields } from "@/components/CallTypeFields";
import type { SlotDay } from "@/components/portal/BookingPicker";
import { CopyLink, FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";
import { telHref } from "@/lib/phone";
import { formatDateTime, formatDay, formatTime } from "@/lib/time";

export type SchedulingType = {
  id: number;
  label: string;
  minutes: number;
  days: SlotDay[];
};
export type SchedulingAppointment = {
  id: number;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  meetingUrl: string | null;
  /** Phone call: the number to ring. */
  phone: string | null;
  cancelledAt: Date | null;
  upcoming: boolean;
  colour: string | null;
};

/** On a discovery request: its calls, its open booking link, and ways to set up a call. */
export function DiscoveryScheduling({
  discoveryCallId,
  firstName,
  types,
  appointments,
  link,
  phone,
  prefersPhone = false,
  showCallNow = true,
}: {
  discoveryCallId: number;
  firstName: string;
  types: SchedulingType[];
  appointments: SchedulingAppointment[];
  link: { id: number; url: string; expiresAt: Date } | null;
  /** The phone number from their enquiry, if they gave one. */
  phone?: string | null;
  /** Whether they said they'd prefer a phone call. */
  prefersPhone?: boolean;
  /** Show "Start a call now" (off where the page already has one). */
  showCallNow?: boolean;
}) {
  const [panel, setPanel] = useState<"schedule" | "link" | null>(null);
  const [message, setMessage] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();

  function done(result: FormState) {
    setMessage(result);
    setPanel(null);
  }

  function run(action: () => Promise<FormState>, confirmText: string) {
    if (!confirm(confirmText)) return;
    startTransition(async () => setMessage(await action()));
  }

  return (
    <div className="ds">
      {appointments.length > 0 && (
        <ul className="ds-appts">
          {appointments.map((a) => {
            const { upcoming } = a;
            return (
              <li key={a.id} className={a.cancelledAt ? "is-cancelled" : ""}>
                <span className="cal-dot" style={{ background: a.colour ?? "#a78bfa" }} aria-hidden />
                <div className="ds-appt-main">
                  <p className="ds-appt-title">{a.title}</p>
                  <p className="pt-muted pt-small">
                    {formatDateTime(a.startsAt)} · {a.durationMinutes} min
                    {a.phone ? ` · Phone ${a.phone}` : ""}
                    {a.cancelledAt ? " · Cancelled" : upcoming ? "" : " · Done"}
                    {" · "}
                    <Link href={`/admin/sessions/${a.id}`} className="pt-link">
                      Notes
                    </Link>
                  </p>
                </div>
                {upcoming && (
                  <div className="ds-appt-actions">
                    {a.phone && (
                      <a href={telHref(a.phone)} className="pt-btn pt-btn-secondary" title={`Call ${a.phone}`}>
                        Call
                      </a>
                    )}
                    {a.meetingUrl && (
                      <a href={a.meetingUrl} className="pt-btn pt-btn-secondary" target="_blank" rel="noreferrer">
                        Join
                      </a>
                    )}
                    <button
                      type="button"
                      className="pt-link-btn pt-small pt-danger"
                      disabled={pending}
                      onClick={() => run(() => cancelAppointmentAsAdmin(a.id), `Cancel this call? ${firstName} will be emailed.`)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {link && (
        <div className="ds-link">
          <p className="pt-small">
            <strong>Booking link sent</strong> <span className="pt-muted">· works until {formatDateTime(link.expiresAt)}</span>
          </p>
          <CopyLink link={link.url} label="Booking link" />
          <button
            type="button"
            className="pt-link-btn pt-small pt-danger"
            disabled={pending}
            onClick={() =>
              run(() => revokeBookingLink(link.id), `Switch off this link? ${firstName} won't be able to book with it.`)
            }
          >
            Switch off link
          </button>
        </div>
      )}
      <FormMessage state={message} />

      {showCallNow && <CallNowButton target={{ discoveryCallId }} firstName={firstName} />}

      <div className="pt-btn-row">
        <button
          type="button"
          className={`pt-btn ${panel === "schedule" ? "pt-btn-primary" : "pt-btn-secondary"}`}
          aria-expanded={panel === "schedule"}
          onClick={() => {
            setMessage(undefined);
            setPanel((p) => (p === "schedule" ? null : "schedule"));
          }}
        >
          Schedule a call
        </button>
        <button
          type="button"
          className={`pt-btn ${panel === "link" ? "pt-btn-primary" : "pt-btn-secondary"}`}
          aria-expanded={panel === "link"}
          onClick={() => {
            setMessage(undefined);
            setPanel((p) => (p === "link" ? null : "link"));
          }}
        >
          {link ? "Send a new booking link" : "Send booking link"}
        </button>
      </div>

      {panel === "schedule" && <ScheduleForm discoveryCallId={discoveryCallId} firstName={firstName} types={types} phone={phone ?? ""} prefersPhone={prefersPhone} onDone={done} />}
      {panel === "link" && (
        <LinkForm discoveryCallId={discoveryCallId} firstName={firstName} types={types} replacing={Boolean(link)} onDone={done} />
      )}
    </div>
  );
}

function TypeSelect({ types, value, onChange }: { types: SchedulingType[]; value: number; onChange?: (id: number) => void }) {
  if (types.length <= 1) return <input type="hidden" name="eventTypeId" value={value} />;
  return (
    <div className="pt-field">
      <label htmlFor="ds-type">Type</label>
      <select id="ds-type" name="eventTypeId" value={value} onChange={(e) => onChange?.(Number(e.target.value))}>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label} ({t.minutes} min)
          </option>
        ))}
      </select>
    </div>
  );
}

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/** Runs the action and, when it succeeds, hands the result to the parent (which closes the form). */
function closingAction(action: Action, onDone: (result: FormState) => void): Action {
  return async (state, formData) => {
    const result = await action(state, formData);
    if (result?.ok) onDone(result);
    return result;
  };
}

function ScheduleForm({
  discoveryCallId,
  firstName,
  types,
  phone,
  prefersPhone,
  onDone,
}: {
  discoveryCallId: number;
  firstName: string;
  types: SchedulingType[];
  phone: string;
  prefersPhone: boolean;
  onDone: (result: FormState) => void;
}) {
  const [state, action] = useActionState(closingAction(scheduleDiscoveryCall.bind(null, discoveryCallId), onDone), undefined);
  const [typeId, setTypeId] = useState(types[0]?.id ?? 0);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const type = types.find((t) => t.id === typeId) ?? types[0];
  if (!type) return <p className="pt-muted">Add an invite-only booking type under Scheduling first.</p>;
  const dayTimes = type.days.find((d) => d.date === day)?.times ?? [];

  return (
    <form action={action} className="pt-form ds-form">
      <CallTypeFields forAdmin defaultPhone={phone} defaultType={prefersPhone ? "phone" : "video"} idPrefix={`ds-${discoveryCallId}`} />
      <TypeSelect
        types={types}
        value={type.id}
        onChange={(id) => {
          setTypeId(id);
          setDay("");
          setTime("");
        }}
      />
      <div className="pt-field">
        <label htmlFor={`ds-day-${discoveryCallId}`}>Day</label>
        <select
          id={`ds-day-${discoveryCallId}`}
          value={day}
          onChange={(e) => {
            setDay(e.target.value);
            setTime("");
          }}
          required
        >
          <option value="" disabled>
            {type.days.length ? "Choose a day with free time…" : "No free times — choose another time"}
          </option>
          {type.days.map((d) => (
            <option key={d.date} value={d.date}>
              {formatDay(new Date(d.times[0]))} ({d.times.length} free)
            </option>
          ))}
          <option value="manual">Another day or time…</option>
        </select>
      </div>
      {day === "manual" ? (
        <div className="pt-field">
          <input type="hidden" name="slot" value="manual" />
          <label htmlFor={`ds-manual-${discoveryCallId}`}>Date and time (UK)</label>
          <input id={`ds-manual-${discoveryCallId}`} type="datetime-local" name="manualStartsAt" required />
          <p className="pt-muted pt-small">Any time works here, even outside your hours.</p>
          <FieldError state={state} name="manualStartsAt" />
        </div>
      ) : (
        day && (
          <div className="pt-field">
            <label htmlFor={`ds-time-${discoveryCallId}`}>Time (UK)</label>
            <select id={`ds-time-${discoveryCallId}`} name="slot" value={time} onChange={(e) => setTime(e.target.value)} required>
              <option value="" disabled>
                Choose a time…
              </option>
              {dayTimes.map((t) => (
                <option key={t} value={t}>
                  {formatTime(new Date(t))}
                </option>
              ))}
            </select>
            <FieldError state={state} name="slot" />
          </div>
        )
      )}
      <div className="pt-field">
        <label htmlFor={`ds-url-${discoveryCallId}`}>Custom meeting link (optional)</label>
        <input id={`ds-url-${discoveryCallId}`} name="meetingUrl" type="url" placeholder="Leave blank for an automatic video room" />
        <FieldError state={state} name="meetingUrl" />
      </div>
      {!state?.ok && <FormMessage state={state} />}
      <SubmitButton pendingLabel="Booking…">Book & email {firstName}</SubmitButton>
    </form>
  );
}

function LinkForm({
  discoveryCallId,
  firstName,
  types,
  replacing,
  onDone,
}: {
  discoveryCallId: number;
  firstName: string;
  types: SchedulingType[];
  replacing: boolean;
  onDone: (result: FormState) => void;
}) {
  const [state, action] = useActionState(closingAction(sendBookingLink.bind(null, discoveryCallId), onDone), undefined);
  const [typeId, setTypeId] = useState(types[0]?.id ?? 0);
  if (!types.length) return <p className="pt-muted">Add an invite-only booking type under Scheduling first.</p>;
  return (
    <form action={action} className="pt-form ds-form">
      <p className="pt-muted pt-small">
        {firstName} gets an email with a link to pick one of your free times. It works once and expires in 14 days
        {replacing ? "; the old link stops working" : ""}.
      </p>
      <TypeSelect types={types} value={typeId} onChange={setTypeId} />
      {!state?.ok && <FormMessage state={state} />}
      <SubmitButton pendingLabel="Sending…">Email booking link</SubmitButton>
    </form>
  );
}
