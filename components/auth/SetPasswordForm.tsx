"use client";

import { useActionState } from "react";
import { setPassword } from "@/app/actions/auth";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

export function SetPasswordForm({ token, email, minLength }: { token: string; email: string; minLength: number }) {
  const [state, action] = useActionState(setPassword.bind(null, token), undefined);
  return (
    <form action={action} className="pt-form">
      {/* Lets password managers save the new password against the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="pt-field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
          aria-describedby="password-hint"
        />
        <p className="pt-muted pt-small" id="password-hint">
          At least {minLength} characters.
        </p>
      </div>
      <div className="pt-field">
        <label htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={minLength} required />
        <FieldError state={state} name="password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save password and sign in</SubmitButton>
    </form>
  );
}
