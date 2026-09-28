"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { markBalancePaid, onboardSignup, sendBalanceLink } from "@/app/actions/workshops";
import type { FormState } from "@/app/actions/types";
import { FormMessage } from "@/components/portal/FormBits";
import type { SignupListRow } from "@/lib/db/queries";
import { formatPence } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/time";

type Status = SignupListRow["status"];

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  accepted: "Accepted",
  on_hold: "On hold",
  declined: "Declined",
};

const STATUS_TONE: Record<Status, string> = {
  pending: "is-warn",
  accepted: "is-ok",
  on_hold: "is-info",
  declined: "is-danger",
};

/** Workshop signups as cards: who, which date, payment, account, notes and actions. */
export function AdminSignupsTable({
  signups,
  attendedMinutes = {},
}: {
  signups: SignupListRow[];
  /** Minutes each signup spent in the in-app workshop call, if they joined it. */
  attendedMinutes?: Record<number, number>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, FormState>>({});

  async function patch(id: number, body: { status: Status; notes?: string }) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/signups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Update failed");
      }
      setResults((r) => ({ ...r, [id]: body.notes !== undefined ? { ok: true, message: "Note saved." } : undefined }));
      router.refresh();
    } catch (e) {
      setResults((r) => ({ ...r, [id]: { ok: false, message: e instanceof Error ? e.message : "Update failed" } }));
    } finally {
      setBusyId(null);
    }
  }

  async function run(id: number, action: (id: number) => Promise<FormState>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusyId(id);
    try {
      const result = await action(id);
      setResults((r) => ({ ...r, [id]: result }));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (signups.length === 0) {
    return (
      <section className="pt-card">
        <p className="pt-muted">No signups match the current filters.</p>
      </section>
    );
  }

  return (
    <ul className="su-list">
      {signups.map((s) => {
        const busy = busyId === s.id;
        const canCollect = Boolean(s.depositPaidAt) && !s.balancePaidAt && s.status !== "declined";
        const canInvite = Boolean(s.depositPaidAt) && s.account !== "active" && s.status !== "declined";
        return (
          <li key={s.id} className={`su-card pt-card ${s.status === "declined" ? "is-declined" : ""}`}>
            <div className="su-head">
              <div className="su-who">
                <h2>{s.name}</h2>
                <a href={`mailto:${s.email}`} className="pt-link su-email">
                  {s.email}
                </a>
              </div>
              <div className="pt-badges">
                <span className={`pt-badge ${STATUS_TONE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                {s.balancePaidAt ? (
                  <span className="pt-badge is-ok">Fully paid</span>
                ) : s.depositPaidAt ? (
                  <span className="pt-badge">Deposit paid</span>
                ) : (
                  <span className="pt-badge">Unpaid</span>
                )}
                {attendedMinutes[s.id] !== undefined && <span className="pt-badge is-info">Attended · {attendedMinutes[s.id]} min</span>}
              </div>
            </div>

            <dl className="su-facts">
              <div>
                <dt>Workshop</dt>
                <dd>
                  {s.workshopStartsAt ? formatDateTime(s.workshopStartsAt) : "Date not set"}
                  <span className="pt-muted pt-small pt-block">{s.workshopName}</span>
                </dd>
              </div>
              <div>
                <dt>Booked</dt>
                <dd>
                  {formatDateTime(s.createdAt)}
                  <span className="pt-muted pt-small pt-block">via {s.source === "stripe" ? "Stripe" : s.source}</span>
                </dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>
                  <PaymentStatus signup={s} />
                </dd>
              </div>
              <div>
                <dt>Client area</dt>
                <dd>
                  {s.account === "active" ? (
                    s.clientId ? (
                      <a href={`/admin/clients/${s.clientId}`} className="pt-link">
                        Account active →
                      </a>
                    ) : (
                      "Account active"
                    )
                  ) : s.account === "invited" ? (
                    <>
                      Invited
                      <span className="pt-muted pt-small pt-block">Hasn&apos;t set a password yet</span>
                    </>
                  ) : (
                    <span className="pt-muted">No account</span>
                  )}
                </dd>
              </div>
            </dl>

            <NotesField
              id={s.id}
              initialNotes={s.notes ?? ""}
              disabled={busy}
              onSave={(notes) => patch(s.id, { status: s.status, notes })}
            />

            <div className="su-actions">
              <div className="su-segmented" role="group" aria-label="Status">
                {(["accepted", "on_hold", "declined"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={busy}
                    aria-pressed={s.status === st}
                    className={s.status === st ? "is-current" : ""}
                    onClick={() => s.status !== st && patch(s.id, { status: st })}
                  >
                    {st === "accepted" ? "Accept" : st === "declined" ? "Decline" : "On hold"}
                  </button>
                ))}
              </div>
              <div className="su-more">
                {canCollect && (
                  <>
                    <button type="button" className="pt-btn pt-btn-secondary" disabled={busy} onClick={() => run(s.id, sendBalanceLink)}>
                      {s.balanceRequestSentAt ? "Resend balance link" : "Send balance link"}
                    </button>
                    <button
                      type="button"
                      className="pt-btn pt-btn-secondary"
                      disabled={busy}
                      onClick={() => run(s.id, markBalancePaid, `Mark ${s.name}'s balance as paid outside Stripe?`)}
                    >
                      Mark balance paid
                    </button>
                  </>
                )}
                {canInvite && (
                  <button type="button" className="pt-btn pt-btn-secondary" disabled={busy} onClick={() => run(s.id, onboardSignup)}>
                    {s.account === "invited" ? "Resend account invite" : "Create account & invite"}
                  </button>
                )}
              </div>
            </div>
            <FormMessage state={results[s.id]} />
          </li>
        );
      })}
    </ul>
  );
}

function PaymentStatus({ signup: s }: { signup: SignupListRow }) {
  if (!s.depositPaidAt) return <span className="pt-muted">No payment yet</span>;
  return (
    <>
      {formatPence(s.amountPaidPence)} paid
      <span className="pt-muted pt-small pt-block">
        {s.balancePaidAt
          ? `Balance paid ${formatDate(s.balancePaidAt)}`
          : s.balanceRequestSentAt
            ? `Balance requested ${formatDate(s.balanceRequestSentAt)}${s.balanceReminderSentAt ? `, reminded ${formatDate(s.balanceReminderSentAt)}` : ""}`
            : s.status === "pending" || s.status === "accepted"
              ? "Balance link sends a week before"
              : `No balance email while ${STATUS_LABEL[s.status].toLowerCase()}`}
      </span>
    </>
  );
}

function NotesField({
  id,
  initialNotes,
  disabled,
  onSave,
}: {
  id: number;
  initialNotes: string;
  disabled: boolean;
  onSave: (notes: string) => void;
}) {
  const [value, setValue] = useState(initialNotes);
  useEffect(() => {
    setValue(initialNotes);
  }, [initialNotes]);
  const changed = value !== initialNotes;
  return (
    <div className="su-notes">
      <label className="pt-sr-only" htmlFor={`notes-${id}`}>
        Internal notes
      </label>
      <textarea id={`notes-${id}`} rows={2} value={value} disabled={disabled} onChange={(e) => setValue(e.target.value)} placeholder="Internal notes (only you see these)" />
      <button type="button" className="pt-btn pt-btn-secondary" disabled={disabled || !changed} onClick={() => onSave(value)}>
        Save note
      </button>
    </div>
  );
}
