"use client";

import { useActionState, useState } from "react";
import { saveEventType } from "@/app/actions/scheduling";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

export type EventTypeValues = {
  name: string;
  durationMinutes: string;
  bufferMinutes: string;
  audience: string;
  locationMode: string;
  customUrl: string;
  colour: string;
  active: boolean;
};

export const NEW_EVENT_TYPE: EventTypeValues = {
  name: "",
  durationMinutes: "30",
  bufferMinutes: "",
  audience: "invite_only",
  locationMode: "jitsi",
  customUrl: "",
  colour: "#60a5fa",
  active: true,
};

export function EventTypeForm({
  id,
  initial,
  builtIn = false,
  packageLength = false,
}: {
  id: number | null;
  initial: EventTypeValues;
  builtIn?: boolean;
  /** The 1:1 type can take its length from the client's package. */
  packageLength?: boolean;
}) {
  const [state, action] = useActionState(saveEventType.bind(null, id), undefined);
  const f = state?.fields;
  const v = (key: keyof EventTypeValues) => f?.[key] ?? String(initial[key]);
  const [location, setLocation] = useState(v("locationMode"));
  const p = id == null ? "newtype" : `type${id}`;

  return (
    <form action={action} className="pt-form" key={id == null && state?.ok ? "reset" : "edit"}>
      <div className="pt-field">
        <label htmlFor={`${p}-name`}>Name</label>
        <input id={`${p}-name`} name="name" defaultValue={v("name")} maxLength={80} placeholder="e.g. Follow-up call" required />
        <FieldError state={state} name="name" />
      </div>
      <div className="pt-field-grid pt-field-grid-3">
        <div className="pt-field">
          <label htmlFor={`${p}-duration`}>Length (minutes)</label>
          <input
            id={`${p}-duration`}
            name="durationMinutes"
            type="number"
            min={5}
            max={600}
            step={5}
            defaultValue={v("durationMinutes")}
            placeholder={packageLength ? "From package" : undefined}
          />
          <FieldError state={state} name="durationMinutes" />
        </div>
        <div className="pt-field">
          <label htmlFor={`${p}-buffer`}>Gap after (min)</label>
          <input id={`${p}-buffer`} name="bufferMinutes" type="number" min={0} max={240} step={5} defaultValue={v("bufferMinutes")} placeholder="Default" />
          <FieldError state={state} name="bufferMinutes" />
        </div>
        <div className="pt-field">
          <label htmlFor={`${p}-colour`}>Colour</label>
          <input id={`${p}-colour`} name="colour" type="color" defaultValue={v("colour")} className="pt-colour" />
          <FieldError state={state} name="colour" />
        </div>
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-audience`}>Who can book it</label>
        <select key={`aud-${v("audience")}`} id={`${p}-audience`} name="audience" defaultValue={v("audience")} disabled={builtIn}>
          <option value="clients_with_credits">Clients, using their package sessions</option>
          <option value="invite_only">People you send an appointment or booking link to</option>
          <option value="admin_only">Only you (added from a client&apos;s page)</option>
        </select>
        {builtIn && <input type="hidden" name="audience" value={v("audience")} />}
        <FieldError state={state} name="audience" />
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-location`}>Where</label>
        {/* React resets forms after an action and a <select> falls back to its first-mount value,
            so it's re-keyed on the submitted value to keep the choice after a validation error. */}
        <select
          key={`loc-${v("locationMode")}`}
          id={`${p}-location`}
          name="locationMode"
          defaultValue={v("locationMode")}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="jitsi">Video — a private room is created for each booking</option>
          <option value="custom">Video — always use my own link</option>
          <option value="in_person">In person</option>
        </select>
        <FieldError state={state} name="locationMode" />
      </div>
      {location === "custom" && (
        <div className="pt-field">
          <label htmlFor={`${p}-url`}>Your meeting link</label>
          <input id={`${p}-url`} name="customUrl" type="url" defaultValue={v("customUrl")} placeholder="https://zoom.us/j/…" />
          <FieldError state={state} name="customUrl" />
        </div>
      )}
      {!builtIn && (
        <label className="pt-check">
          <input type="checkbox" name="active" defaultChecked={f ? f.active === "on" : initial.active} />
          <span>Available to book</span>
        </label>
      )}
      <FormMessage state={state} />
      <SubmitButton>{id == null ? "Create booking type" : "Save changes"}</SubmitButton>
    </form>
  );
}
