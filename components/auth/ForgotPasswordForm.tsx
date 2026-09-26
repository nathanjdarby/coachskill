"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="pt-form">
      <div className="pt-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError state={state} name="email" />
      </div>
      <SubmitButton pendingLabel="Sending…">Email me a reset link</SubmitButton>
    </form>
  );
}
