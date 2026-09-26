"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/portal/FormBits";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="pt-form">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="pt-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </div>
      <div className="pt-field">
        <div className="pt-field-row">
          <label htmlFor="password">Password</label>
          <Link href="/forgot-password" className="pt-link pt-small">
            Forgot password?
          </Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
