"use client";

import { useActionState } from "react";
import { saveWorkshop } from "@/app/actions/workshops";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

export type WorkshopFormValues = {
  name: string;
  slug: string;
  startsAt: string;
  durationMinutes: string;
  location: string;
  capacity: string;
  deposit: string;
  balance: string;
  published: boolean;
};

export const NEW_WORKSHOP: WorkshopFormValues = {
  name: "Value Selling Workshop",
  slug: "",
  startsAt: "",
  durationMinutes: "150",
  location: "",
  capacity: "5",
  deposit: "25",
  balance: "374",
  published: true,
};

export function WorkshopForm({ id, initial }: { id: number | null; initial: WorkshopFormValues }) {
  const [state, action] = useActionState(saveWorkshop.bind(null, id), undefined);
  const f = state?.fields;
  const v = (key: keyof WorkshopFormValues) => (f?.[key] ?? String(initial[key]));
  const p = id == null ? "new" : `w${id}`;

  return (
    <form action={action} className="pt-form" key={id == null && state?.ok ? "reset" : "edit"}>
      <div className="pt-field">
        <label htmlFor={`${p}-name`}>Name</label>
        <input id={`${p}-name`} name="name" defaultValue={v("name")} maxLength={120} required />
        <FieldError state={state} name="name" />
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
        <label htmlFor={`${p}-location`}>Location (optional)</label>
        <input id={`${p}-location`} name="location" defaultValue={v("location")} placeholder="e.g. Online (Zoom) or a venue address" maxLength={200} />
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
        <input type="checkbox" name="published" defaultChecked={f ? f.published === "on" : initial.published} />
        <span>Show on the public workshop page</span>
      </label>
      <FormMessage state={state} />
      <SubmitButton>{id == null ? "Create workshop" : "Save changes"}</SubmitButton>
    </form>
  );
}
