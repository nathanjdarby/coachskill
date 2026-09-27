"use client";

import { useActionState } from "react";
import { savePackage } from "@/app/actions/packages";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

export type PackageFormValues = {
  name: string;
  description: string;
  price: string;
  sessionCount: string;
  sessionMinutes: string;
  sortOrder: string;
  active: boolean;
};

export const NEW_PACKAGE: PackageFormValues = {
  name: "",
  description: "",
  price: "",
  sessionCount: "3",
  sessionMinutes: "60",
  sortOrder: "0",
  active: true,
};

export function PackageForm({ id, initial }: { id: number | null; initial: PackageFormValues }) {
  const [state, action] = useActionState(savePackage.bind(null, id), undefined);
  const f = state?.fields;
  const v = (key: keyof PackageFormValues) => f?.[key] ?? String(initial[key]);
  const p = id == null ? "newpkg" : `pkg${id}`;

  return (
    <form action={action} className="pt-form" key={id == null && state?.ok ? "reset" : "edit"}>
      <div className="pt-field">
        <label htmlFor={`${p}-name`}>Name</label>
        <input id={`${p}-name`} name="name" defaultValue={v("name")} placeholder="e.g. 3-month development journey" maxLength={120} required />
        <FieldError state={state} name="name" />
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-description`}>Description (optional)</label>
        <textarea id={`${p}-description`} name="description" rows={3} defaultValue={v("description")} maxLength={1000} placeholder="What's included, who it's for" />
      </div>
      <div className="pt-field-grid pt-field-grid-3">
        <div className="pt-field">
          <label htmlFor={`${p}-price`}>Price (£)</label>
          <input id={`${p}-price`} name="price" inputMode="decimal" defaultValue={v("price")} required />
          <FieldError state={state} name="price" />
        </div>
        <div className="pt-field">
          <label htmlFor={`${p}-sessionCount`}>Sessions</label>
          <input id={`${p}-sessionCount`} name="sessionCount" type="number" min={1} max={100} defaultValue={v("sessionCount")} required />
          <FieldError state={state} name="sessionCount" />
        </div>
        <div className="pt-field">
          <label htmlFor={`${p}-sessionMinutes`}>Minutes each</label>
          <input id={`${p}-sessionMinutes`} name="sessionMinutes" type="number" min={15} max={480} step={5} defaultValue={v("sessionMinutes")} required />
          <FieldError state={state} name="sessionMinutes" />
        </div>
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-sortOrder`}>Order on the page</label>
        <input id={`${p}-sortOrder`} name="sortOrder" type="number" defaultValue={v("sortOrder")} />
        <FieldError state={state} name="sortOrder" />
      </div>
      <label className="pt-check">
        <input type="checkbox" name="active" defaultChecked={f ? f.active === "on" : initial.active} />
        <span>Available to buy in the client area</span>
      </label>
      <FormMessage state={state} />
      <SubmitButton>{id == null ? "Create package" : "Save changes"}</SubmitButton>
    </form>
  );
}
