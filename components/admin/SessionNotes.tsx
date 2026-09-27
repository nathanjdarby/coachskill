"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveSessionNotes, sendFollowUpNow, setFollowUpEnabled } from "@/app/actions/session-notes";
import type { FormState } from "@/app/actions/types";
import { FormMessage } from "@/components/portal/FormBits";

type SaveState = "saved" | "unsaved" | "saving" | "error";

/** Private notes and the shared recap, saved automatically as Monika types. */
export function SessionNotes({
  appointmentId,
  firstName,
  initialNotes,
  initialRecap,
  followUpSent,
  preview,
}: {
  appointmentId: number;
  firstName: string;
  initialNotes: string;
  initialRecap: string;
  followUpSent: boolean;
  /** The parts of the follow-up email that don't depend on the recap (null when it can't be sent). */
  preview: { to: string; subject: string; greeting: string; intro: string; nextText: string; buttonLabel: string | null } | null;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [recap, setRecap] = useState(initialRecap);
  const [state, setState] = useState<SaveState>("saved");
  const latest = useRef({ notes: initialNotes, recap: initialRecap });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save() {
    setState("saving");
    const result = await saveSessionNotes(appointmentId, latest.current);
    setState(result?.ok ? "saved" : "error");
  }

  function change(patch: Partial<{ notes: string; recap: string }>) {
    latest.current = { ...latest.current, ...patch };
    if (patch.notes !== undefined) setNotes(patch.notes);
    if (patch.recap !== undefined) setRecap(patch.recap);
    setState("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 1500);
  }

  // Save anything pending when leaving the page.
  useEffect(() => {
    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void saveSessionNotes(appointmentId, latest.current);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [appointmentId]);

  return (
    <div className="sn">
      <p className={`sn-status ${state === "error" ? "pt-danger" : "pt-muted"}`} aria-live="polite">
        {state === "saving" ? "Saving…" : state === "unsaved" ? "Typing…" : state === "error" ? "Couldn't save — check your connection" : "✓ Saved"}
      </p>
      <div className="pt-field">
        <label htmlFor="sn-notes">Private notes</label>
        <textarea
          id="sn-notes"
          rows={8}
          value={notes}
          onChange={(e) => change({ notes: e.target.value })}
          placeholder="Only you see these."
        />
      </div>
      <div className="pt-field">
        <label htmlFor="sn-recap">Recap for {firstName}</label>
        <textarea
          id="sn-recap"
          rows={6}
          value={recap}
          onChange={(e) => change({ recap: e.target.value })}
          placeholder="What you covered and the agreed next steps. Leave a blank line between paragraphs."
        />
        <p className="pt-muted pt-small">
          {followUpSent
            ? "The follow-up has been sent, so changes here won't be emailed."
            : `Included in the follow-up email${firstName ? ` to ${firstName}` : ""}, and saved to their Updates if they're a client.`}
        </p>
      </div>
      {preview && !followUpSent && (
        <details className="pt-inline-details">
          <summary className="pt-link pt-small">Preview the follow-up email</summary>
          <div className="sn-preview">
            <p className="pt-muted pt-small">
              To {preview.to} · {preview.subject}
            </p>
            <p className="sn-preview-heading">{preview.greeting}</p>
            <p>{preview.intro}</p>
            {recap.trim() && (
              <>
                <p>Here&apos;s a quick recap:</p>
                {recap
                  .split(/\n{2,}/)
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
              </>
            )}
            <p>{preview.nextText}</p>
            {preview.buttonLabel && <span className="pt-btn pt-btn-primary sn-preview-btn">{preview.buttonLabel}</span>}
          </div>
        </details>
      )}
    </div>
  );
}

/** Whether and when the follow-up email goes out, with a send-now button. */
export function FollowUpControls({
  appointmentId,
  enabled,
  sentAt,
  dueLabel,
  canSendNow,
}: {
  appointmentId: number;
  enabled: boolean;
  sentAt: string | null;
  dueLabel: string;
  canSendNow: boolean;
}) {
  const [result, setResult] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();

  if (sentAt) return <p className="pt-small">✓ Follow-up sent {sentAt}.</p>;
  return (
    <div className="sn-follow">
      <label className="pt-check">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => startTransition(async () => setResult(await setFollowUpEnabled(appointmentId, e.target.checked)))}
        />
        <span>Send a follow-up email automatically</span>
      </label>
      <p className="pt-muted pt-small">{enabled ? dueLabel : "No follow-up will be sent for this appointment."}</p>
      {canSendNow && (
        <button
          type="button"
          className="pt-btn pt-btn-secondary"
          disabled={pending}
          onClick={() => {
            if (!confirm("Send the follow-up email now?")) return;
            startTransition(async () => setResult(await sendFollowUpNow(appointmentId)));
          }}
        >
          {pending ? "Sending…" : "Send follow-up now"}
        </button>
      )}
      {result?.message && <FormMessage state={result} />}
    </div>
  );
}
