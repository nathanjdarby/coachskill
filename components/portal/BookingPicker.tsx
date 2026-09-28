"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/types";
import { formatDay, formatTime } from "@/lib/time";
import { CallTypeFields } from "@/components/CallTypeFields";
import { FormMessage, SubmitButton } from "./FormBits";

export type SlotDay = { date: string; times: string[] };

/** Pick a day, then a time, then confirm. Times are shown in UK time. */
export function BookingPicker({
  days,
  action,
  submitLabel,
  callChoice,
}: {
  days: SlotDay[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  /** Ask "video or phone?" (with the number to ring) above the times. */
  callChoice?: { defaultPhone: string; defaultType: "video" | "phone" };
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState<string | null>(null);

  if (state?.ok) return <FormMessage state={state} />;
  if (days.length === 0) {
    return <p className="pt-muted">There are no free times right now. Message Monika and she&apos;ll find one for you.</p>;
  }
  const day = days[Math.min(dayIndex, days.length - 1)];

  return (
    <form action={formAction} className="pt-picker">
      {callChoice && <CallTypeFields defaultPhone={callChoice.defaultPhone} defaultType={callChoice.defaultType} />}
      <div className="pt-picker-days" role="listbox" aria-label="Choose a day">
        {days.map((d, i) => {
          const label = formatDay(new Date(d.times[0])).split(" ");
          return (
            <button
              key={d.date}
              type="button"
              role="option"
              aria-selected={i === dayIndex}
              className={`pt-picker-day ${i === dayIndex ? "is-selected" : ""}`}
              onClick={() => {
                setDayIndex(i);
                setTime(null);
              }}
            >
              <span className="pt-picker-dow">{label[0].replace(",", "")}</span>
              <span className="pt-picker-date">{label[1]}</span>
              <span className="pt-picker-month">{label[2]}</span>
            </button>
          );
        })}
      </div>
      <div className="pt-picker-times" role="listbox" aria-label="Choose a time">
        {day.times.map((t) => (
          <button
            key={t}
            type="button"
            role="option"
            aria-selected={t === time}
            className={`pt-picker-time ${t === time ? "is-selected" : ""}`}
            onClick={() => setTime(t)}
          >
            {formatTime(new Date(t))}
          </button>
        ))}
      </div>
      <input type="hidden" name="startsAt" value={time ?? ""} />
      <FormMessage state={state} />
      {time ? (
        <SubmitButton pendingLabel="Booking…">
          {submitLabel} · {formatDay(new Date(time))}, {formatTime(new Date(time))}
        </SubmitButton>
      ) : (
        <p className="pt-muted pt-small">All times are UK time.</p>
      )}
    </form>
  );
}
