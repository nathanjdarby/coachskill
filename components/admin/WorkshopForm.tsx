"use client";

import { useActionState, useState } from "react";
import { deleteWorkshop, saveWorkshop } from "@/app/actions/workshops";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";
import { newDateFor, type ProgrammeChoice, type WorkshopFormValues } from "@/lib/workshop-form";

export function WorkshopForm({
  id,
  initial,
  programmes,
}: {
  id: number | null;
  initial: WorkshopFormValues;
  programmes: ProgrammeChoice[];
}) {
  const [state, action] = useActionState(saveWorkshop.bind(null, id), undefined);
  // Choosing a workshop for a new date swaps in that workshop's defaults,
  // until the next submit brings back what was entered.
  const [picked, setPicked] = useState<{ values: WorkshopFormValues; state: typeof state } | null>(null);
  const base = picked?.values ?? initial;
  const f = picked && picked.state === state ? undefined : state?.fields;
  const v = (key: keyof WorkshopFormValues) => (f?.[key] ?? String(base[key]));
  const p = id == null ? "new" : `w${id}`;
  const submittedMode = f?.locationMode as WorkshopFormValues["locationMode"] | undefined;
  const [mode, setMode] = useState(submittedMode ?? base.locationMode);

  return (
    <form action={action} className="pt-form" key={`${id == null && state?.ok ? "reset" : "edit"}-${base.programmeId}`}>
      <div className="pt-field">
        <label htmlFor={`${p}-programmeId`}>Workshop</label>
        <select
          id={`${p}-programmeId`}
          name="programmeId"
          defaultValue={v("programmeId")}
          required
          onChange={(e) => {
            const choice = programmes.find((c) => String(c.id) === e.target.value);
            if (id == null && choice) setPicked({ values: newDateFor(choice), state });
          }}
        >
          <option value="" disabled>
            Choose a workshop…
          </option>
          {programmes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <FieldError state={state} name="programmeId" />
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-name`}>Name on emails and invites (optional)</label>
        <input id={`${p}-name`} name="name" defaultValue={v("name")} maxLength={120} placeholder="The workshop's title if blank" />
      </div>
      <div className="pt-field-grid">
        <div className="pt-field">
          <label htmlFor={`${p}-startsAt`}>Date &amp; time (UK)</label>
          <input id={`${p}-startsAt`} name="startsAt" type="datetime-local" defaultValue={v("startsAt")} required />
          <FieldError state={state} name="startsAt" />
        </div>
        <div className="pt-field">
          <label htmlFor={`${p}-durationMinutes`}>Length (minutes)</label>
          <input id={`${p}-durationMinutes`} name="durationMinutes" type="number" min={15} max={1440} step={5} defaultValue={v("durationMinutes")} required />
          <FieldError state={state} name="durationMinutes" />
        </div>
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-locationMode`}>Where</label>
        <select
          id={`${p}-locationMode`}
          name="locationMode"
          key={`loc-${submittedMode ?? base.locationMode}`}
          defaultValue={submittedMode ?? base.locationMode}
          onChange={(e) => setMode(e.target.value as WorkshopFormValues["locationMode"])}
        >
          <option value="jitsi">Online — automatic private video room</option>
          <option value="custom">Online — my own meeting link (Zoom, Teams…)</option>
          <option value="in_person">In person</option>
        </select>
        {mode === "jitsi" && (
          <p className="pt-muted pt-small">Attendees get the join link in their confirmation, calendar invite, reminders and client area.</p>
        )}
      </div>
      {mode === "custom" && (
        <div className="pt-field">
          <label htmlFor={`${p}-meetingUrl`}>Meeting link</label>
          <input id={`${p}-meetingUrl`} name="meetingUrl" type="url" defaultValue={v("meetingUrl")} placeholder="https://zoom.us/j/…" maxLength={500} required />
          <FieldError state={state} name="meetingUrl" />
        </div>
      )}
      <div className="pt-field">
        <label htmlFor={`${p}-location`}>{mode === "in_person" ? "Venue" : "Location note (optional)"}</label>
        <input
          id={`${p}-location`}
          name="location"
          defaultValue={v("location")}
          placeholder={mode === "in_person" ? "Venue name and address" : "e.g. Online"}
          maxLength={200}
        />
      </div>
      <div className="pt-field-grid pt-field-grid-3">
        <div className="pt-field">
          <label htmlFor={`${p}-capacity`}>Places</label>
          <input id={`${p}-capacity`} name="capacity" type="number" min={1} max={500} defaultValue={v("capacity")} placeholder="No limit" />
          <FieldError state={state} name="capacity" />
        </div>
        <div className="pt-field">
          <label htmlFor={`${p}-deposit`}>Deposit (£)</label>
          <input id={`${p}-deposit`} name="deposit" inputMode="decimal" defaultValue={v("deposit")} required />
          <FieldError state={state} name="deposit" />
        </div>
        <div className="pt-field">
          <label htmlFor={`${p}-balance`}>Balance (£)</label>
          <input id={`${p}-balance`} name="balance" inputMode="decimal" defaultValue={v("balance")} required />
          <FieldError state={state} name="balance" />
        </div>
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-slug`}>Link name (optional)</label>
        <input id={`${p}-slug`} name="slug" defaultValue={v("slug")} placeholder="Made from the name and month if blank" maxLength={60} />
        <FieldError state={state} name="slug" />
      </div>
      <label className="pt-check">
        <input type="checkbox" name="published" defaultChecked={f ? f.published === "on" : base.published} />
        <span>Show on the public workshop page</span>
      </label>
      {id != null && (
        <label className="pt-check">
          <input type="checkbox" name="notify" defaultChecked />
          <span>If the time or joining details change, email booked attendees an update</span>
        </label>
      )}
      <FormMessage state={state} />
      <SubmitButton>{id == null ? "Add date" : "Save changes"}</SubmitButton>
    </form>
  );
}

/** Deletes a workshop date after a confirm; the server refuses if anyone has paid or been accepted. */
export function DeleteWorkshopButton({ id }: { id: number }) {
  const [state, action] = useActionState(async () => deleteWorkshop(id), undefined);
  return (
    <form action={action} className="pt-inline-form">
      <button
        type="submit"
        className="pt-btn pt-btn-danger"
        onClick={(e) => {
          if (!confirm("Delete this date? Any unpaid or declined enquiries for it are removed too. This can't be undone.")) e.preventDefault();
        }}
      >
        Delete date
      </button>
      <FormMessage state={state} />
    </form>
  );
}
