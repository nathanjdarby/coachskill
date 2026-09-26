"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

export function ChangePasswordForm({ email, minLength }: { email: string; minLength: number }) {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="pt-form" key={state?.ok ? "done" : "edit"}>
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="pt-field">
        <label htmlFor="current">Current password</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required />
        <FieldError state={state} name="current" />
      </div>
      <div className="pt-field-grid">
        <div className="pt-field">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={minLength} required />
        </div>
        <div className="pt-field">
          <label htmlFor="confirm">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={minLength} required />
        </div>
      </div>
      <FieldError state={state} name="password" />
      <FormMessage state={state} />
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
