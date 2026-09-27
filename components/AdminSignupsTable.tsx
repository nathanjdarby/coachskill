"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { markBalancePaid, sendBalanceLink } from "@/app/actions/workshops";
import type { FormState } from "@/app/actions/types";
import { FormMessage } from "@/components/portal/FormBits";
import type { SignupListRow } from "@/lib/db/queries";
import { formatPence } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/time";

function statusBadgeClass(status: string) {
  if (status === "pending") return "admin-badge pending";
  if (status === "accepted") return "admin-badge accepted";
  if (status === "on_hold") return "admin-badge on_hold";
  if (status === "declined") return "admin-badge declined";
  return "admin-badge";
}

export function AdminSignupsTable({ signups }: { signups: SignupListRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, FormState>>({});

  async function runPaymentAction(id: number, action: (id: number) => Promise<FormState>, confirmText?: string) {
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

  async function patchStatus(
    id: number,
    status: "accepted" | "on_hold" | "declined",
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/signups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Update failed");
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function saveNotes(
    id: number,
    notes: string,
    currentStatus: SignupListRow["status"],
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/signups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: currentStatus, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Save failed");
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  }

  if (signups.length === 0) {
    return (
      <p className="admin-muted">No signups match the current filters.</p>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table admin-table-stack">
        <thead>
          <tr>
            <th>When</th>
            <th>Workshop</th>
            <th>Name</th>
            <th>Email</th>
            <th>Source</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {signups.map((s) => (
            <tr key={s.id}>
              <td data-label="When">{formatDateTime(s.createdAt)}</td>
              <td data-label="Workshop">{s.workshopName}</td>
              <td className="admin-cell-title">{s.name}</td>
              <td data-label="Email" className="admin-cell-email">{s.email}</td>
              <td data-label="Source">{s.source}</td>
              <td data-label="Status">
                <span className={statusBadgeClass(s.status)}>{s.status}</span>
              </td>
              <td data-label="Payment">
                <PaymentStatus signup={s} />
              </td>
              <td className="admin-cell-notes">
                <NotesCell
                  initialNotes={s.notes ?? ""}
                  disabled={busyId === s.id}
                  onSave={(notes) => saveNotes(s.id, notes, s.status)}
                />
              </td>
              <td className="admin-cell-actions">
                <div className="admin-actions">
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => patchStatus(s.id, "accepted")}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => patchStatus(s.id, "on_hold")}
                  >
                    On hold
                  </button>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => patchStatus(s.id, "declined")}
                  >
                    Decline
                  </button>
                </div>
                {s.depositPaidAt && !s.balancePaidAt && s.status !== "declined" && (
                  <div className="admin-actions admin-pay-actions">
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => runPaymentAction(s.id, sendBalanceLink)}
                    >
                      {s.balanceRequestSentAt ? "Resend balance link" : "Send balance link"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() =>
                        runPaymentAction(s.id, markBalancePaid, `Mark ${s.name}'s balance as paid outside Stripe?`)
                      }
                    >
                      Mark balance paid
                    </button>
                  </div>
                )}
                <FormMessage state={results[s.id]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentStatus({ signup: s }: { signup: SignupListRow }) {
  if (!s.depositPaidAt) return <span className="admin-muted">No payment</span>;
  return (
    <span className="pt-pay-status">
      <span>Deposit paid · {formatPence(s.amountPaidPence)} total</span>
      {s.balancePaidAt ? (
        <span className="admin-badge accepted">Balance paid {formatDate(s.balancePaidAt)}</span>
      ) : s.balanceRequestSentAt ? (
        <span className="admin-badge pending">
          Balance requested {formatDate(s.balanceRequestSentAt)}
          {s.balanceReminderSentAt ? ` · reminded ${formatDate(s.balanceReminderSentAt)}` : ""}
        </span>
      ) : s.status === "pending" || s.status === "accepted" ? (
        <span className="admin-muted">Balance link sends a week before</span>
      ) : (
        <span className="admin-muted">No automatic balance email while {s.status.replace("_", " ")}</span>
      )}
    </span>
  );
}

function NotesCell({
  initialNotes,
  disabled,
  onSave,
}: {
  initialNotes: string;
  disabled: boolean;
  onSave: (notes: string) => void;
}) {
  const [value, setValue] = useState(initialNotes);

  useEffect(() => {
    setValue(initialNotes);
  }, [initialNotes]);

  return (
    <div className="admin-notes">
      <textarea
        rows={2}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Internal notes"
      />
      <button
        type="button"
        className="admin-link-btn"
        disabled={disabled}
        onClick={() => onSave(value)}
      >
        Save note
      </button>
    </div>
  );
}
