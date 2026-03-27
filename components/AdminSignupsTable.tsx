"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SignupListRow } from "@/lib/db/queries";

function formatDate(d: Date) {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Workshop</th>
            <th>Name</th>
            <th>Email</th>
            <th>Source</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {signups.map((s) => (
            <tr key={s.id}>
              <td>{formatDate(s.createdAt)}</td>
              <td>{s.workshopName}</td>
              <td>{s.name}</td>
              <td>{s.email}</td>
              <td>{s.source}</td>
              <td>
                <span className={statusBadgeClass(s.status)}>{s.status}</span>
              </td>
              <td>
                <NotesCell
                  initialNotes={s.notes ?? ""}
                  disabled={busyId === s.id}
                  onSave={(notes) => saveNotes(s.id, notes, s.status)}
                />
              </td>
              <td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        style={{
          width: "100%",
          maxWidth: 220,
          resize: "vertical",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 6,
          color: "var(--text-primary)",
          font: "inherit",
          fontSize: "0.8125rem",
          padding: 6,
        }}
      />
      <button
        type="button"
        className="admin-link-btn"
        style={{ marginTop: 6, fontSize: "0.75rem", padding: "4px 8px" }}
        disabled={disabled}
        onClick={() => onSave(value)}
      >
        Save note
      </button>
    </div>
  );
}
