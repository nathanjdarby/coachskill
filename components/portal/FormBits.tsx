"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/types";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`pt-btn pt-btn-${variant}`}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return (
    <div role="status" className={`pt-alert ${state.ok ? "is-ok" : "is-warn"}`}>
      <p>{state.message}</p>
      {state.link && <CopyLink link={state.link} />}
    </div>
  );
}

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="pt-copy">
      <input readOnly value={link} aria-label="Account link" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="pt-btn pt-btn-secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function FieldError({ state, name }: { state: FormState; name: string }) {
  const error = state?.errors?.[name];
  return error ? (
    <p className="pt-field-error" id={`${name}-error`}>
      {error}
    </p>
  ) : null;
}
