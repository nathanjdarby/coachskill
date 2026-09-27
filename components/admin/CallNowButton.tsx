"use client";

import { useState, useTransition } from "react";
import { startCallNow } from "@/app/actions/appointments";
import type { FormState } from "@/app/actions/types";
import { CopyLink } from "@/components/portal/FormBits";

/** Starts a Quick call straight away and hands Monika the join button. */
export function CallNowButton({ target, firstName }: { target: { clientId: number } | { discoveryCallId: number }; firstName: string }) {
  const [result, setResult] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();

  if (result?.ok && result.link) {
    return (
      <div className="cn-started" role="status">
        <p className="pt-small">{result.message}</p>
        <a href={result.link} className="pt-btn pt-btn-primary" target="_blank" rel="noreferrer">
          Join the call now
        </a>
        {result.fields?.guestLink && (
          <details className="pt-inline-details">
            <summary className="pt-link pt-small">{firstName}&apos;s link</summary>
            <CopyLink link={result.fields.guestLink} label={`${firstName}'s join link`} />
          </details>
        )}
      </div>
    );
  }
  return (
    <div className="cn">
      <button
        type="button"
        className="pt-btn pt-btn-secondary"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Start a video call with ${firstName} now? They'll be emailed a link to join.`)) return;
          startTransition(async () => setResult(await startCallNow(target)));
        }}
      >
        {pending ? "Starting…" : "Start a call now"}
      </button>
      {result && !result.ok && <p className="pt-danger pt-small">{result.message}</p>}
    </div>
  );
}
