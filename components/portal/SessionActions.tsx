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
  icsHref = `/portal/sessions/${sessionId}/ics`,
  reschedule = rescheduleSession.bind(null, sessionId),
  cancel = () => cancelMySession(sessionId),
  cancelConfirm = "Cancel this session? It will go back into your package.",
  lateNote = "message Monika if you need to change it.",
}: {
  sessionId: number;
  canChange: boolean;
  cutoffHours: number;
  rescheduleDays: SlotDay[];
  /** Overrides for the public appointment page (people without an account). */
  icsHref?: string;
  reschedule?: (state: FormState, formData: FormData) => Promise<FormState>;
  cancel?: () => Promise<FormState>;
  cancelConfirm?: string;
  lateNote?: string;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();

  return (
    <div className="pt-session-actions">
      <div className="pt-session-buttons">
        <a href={icsHref} className="pt-link pt-small">
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
                if (!confirm(cancelConfirm)) return;
                startTransition(async () => setResult(await cancel()));
              }}
            >
              {pending ? "Cancelling…" : "Cancel"}
            </button>
          </>
        )}
      </div>
      {!canChange && (
        <p className="pt-muted pt-small">
          Within {cutoffHours} hours — {lateNote}
        </p>
      )}
      <FormMessage state={result} />
      {open && (
        <div className="pt-reschedule">
          <BookingPicker days={rescheduleDays} action={reschedule} submitLabel="Move to" />
        </div>
      )}
    </div>
  );
}
