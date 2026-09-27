"use client";

import { useState, useTransition } from "react";
import { cancelMySession, rescheduleSession } from "@/app/actions/booking";
import type { FormState } from "@/app/actions/types";
import { BookingPicker, type SlotDay } from "./BookingPicker";
import { FormMessage } from "./FormBits";

/** Add to calendar / reschedule / cancel for one upcoming session. */
export function SessionActions({
  sessionId,
  canChange,
  cutoffHours,
  rescheduleDays,
}: {
  sessionId: number;
  canChange: boolean;
  cutoffHours: number;
  rescheduleDays: SlotDay[];
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();

  return (
    <div className="pt-session-actions">
      <div className="pt-session-buttons">
        <a href={`/portal/sessions/${sessionId}/ics`} className="pt-link pt-small">
          Add to calendar
        </a>
        {canChange && (
          <>
            <button type="button" className="pt-link-btn pt-small" onClick={() => setOpen((o) => !o)}>
              {open ? "Keep this time" : "Reschedule"}
            </button>
            <button
              type="button"
              className="pt-link-btn pt-small pt-danger"
              disabled={pending}
              onClick={() => {
                if (!confirm("Cancel this session? It will go back into your package.")) return;
                startTransition(async () => setResult(await cancelMySession(sessionId)));
              }}
            >
              {pending ? "Cancelling…" : "Cancel"}
            </button>
          </>
        )}
      </div>
      {!canChange && (
        <p className="pt-muted pt-small">
          Within {cutoffHours} hours — message Monika if you need to change it.
        </p>
      )}
      <FormMessage state={result} />
      {open && (
        <div className="pt-reschedule">
          <BookingPicker days={rescheduleDays} action={rescheduleSession.bind(null, sessionId)} submitLabel="Move to" />
        </div>
      )}
    </div>
  );
}
