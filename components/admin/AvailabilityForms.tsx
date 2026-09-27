"use client";

import { useActionState } from "react";
import { addAvailabilityBlock, addAvailabilityRule, saveBookingSettings } from "@/app/actions/booking";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export function RuleForm() {
  const [state, action] = useActionState(addAvailabilityRule, undefined);
  return (
    <form action={action} className="pt-form" key={state?.ok ? "reset" : "edit"}>
      <fieldset className="pt-field">
        <legend className="pt-legend">Days</legend>
        <div className="pt-day-checks">
          {DAYS.map((d) => (
            <label key={d.value} className="pt-day-check">
              <input type="checkbox" name="weekday" value={d.value} defaultChecked={d.value >= 1 && d.value <= 5} />
              <span>{d.label}</span>
            </label>
          ))}
        </div>
        <FieldError state={state} name="weekday" />
      </fieldset>
      <div className="pt-field-grid">
        <div className="pt-field">
          <label htmlFor="rule-start">From</label>
          <input id="rule-start" name="start" type="time" step={900} defaultValue="09:00" required />
          <FieldError state={state} name="start" />
        </div>
        <div className="pt-field">
          <label htmlFor="rule-end">Until</label>
          <input id="rule-end" name="end" type="time" step={900} defaultValue="17:00" required />
          <FieldError state={state} name="end" />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Add hours</SubmitButton>
    </form>
  );
}

export function BlockForm() {
  const [state, action] = useActionState(addAvailabilityBlock, undefined);
  return (
    <form action={action} className="pt-form" key={state?.ok ? "reset" : "edit"}>
      <div className="pt-field-grid">
        <div className="pt-field">
          <label htmlFor="block-start">From (UK)</label>
          <input id="block-start" name="startsAt" type="datetime-local" required />
          <FieldError state={state} name="startsAt" />
        </div>
        <div className="pt-field">
          <label htmlFor="block-end">Until (UK)</label>
          <input id="block-end" name="endsAt" type="datetime-local" required />
          <FieldError state={state} name="endsAt" />
        </div>
      </div>
      <div className="pt-field">
        <label htmlFor="block-reason">Note (only you see this)</label>
        <input id="block-reason" name="reason" maxLength={200} placeholder="e.g. Holiday" />
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Add time off</SubmitButton>
    </form>
  );
}

export type SettingsValues = {
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  slotStepMinutes: number;
  cancelCutoffHours: number;
  defaultMeetingUrl: string;
};

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [state, action] = useActionState(saveBookingSettings, undefined);
  const field = (name: keyof SettingsValues, label: string, hint: string) => (
    <div className="pt-field">
      <label htmlFor={`bs-${name}`}>{label}</label>
      <input id={`bs-${name}`} name={name} type="number" defaultValue={initial[name]} required />
      <span className="pt-muted pt-small">{hint}</span>
      <FieldError state={state} name={name} />
    </div>
  );
  return (
    <form action={action} className="pt-form">
      <div className="pt-field-grid">
        {field("minNoticeHours", "Minimum notice (hours)", "How soon a client can book")}
        {field("maxAdvanceDays", "Book up to (days ahead)", "How far ahead slots show")}
        {field("bufferMinutes", "Gap between sessions (min)", "Kept free before and after")}
        {field("slotStepMinutes", "Start times every (min)", "e.g. 30 = 9:00, 9:30…")}
        {field("cancelCutoffHours", "Client changes up to (hours before)", "After this they message you")}
      </div>
      <div className="pt-field">
        <label htmlFor="bs-defaultMeetingUrl">Meeting link for booked sessions</label>
        <input id="bs-defaultMeetingUrl" name="defaultMeetingUrl" type="url" defaultValue={initial.defaultMeetingUrl} placeholder="https://zoom.us/j/…" />
        <span className="pt-muted pt-small">Added to sessions clients book themselves</span>
        <FieldError state={state} name="defaultMeetingUrl" />
      </div>
      <FormMessage state={state} />
      <SubmitButton>Save settings</SubmitButton>
    </form>
  );
}
