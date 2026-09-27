"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { recordManualPackage } from "@/app/actions/packages";
import {
  addClient,
  addNote,
  addSession,
  becomeClient,
  deleteClient,
  deleteDiscoveryCall,
  inviteClient,
  setDiscoveryDeclined,
  updateClient,
} from "@/app/actions/admin";
import type { FormState } from "@/app/actions/types";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

type InviteTarget = { clientId: number; name: string; email: string; hasDiscovery: boolean };

/**
 * Modal that invites a client to create their portal account. The account is
 * created against this client record, so it's linked to all their information.
 */
function InviteDialog({
  clientId,
  name,
  email,
  hasDiscovery,
  justAdded = false,
  dialogRef,
}: InviteTarget & { justAdded?: boolean; dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const [state, action] = useActionState(inviteClient.bind(null, clientId), undefined);
  const firstName = name.split(/\s+/)[0];
  const titleId = `invite-title-${clientId}`;
  const done = state?.ok || Boolean(state?.link);
  const close = () => dialogRef.current?.close();

  return (
    <dialog ref={dialogRef} className="pt-dialog" aria-labelledby={titleId}>
      {done ? (
        <div className="pt-dialog-body">
          <h2 id={titleId}>{state?.ok ? "Invite sent" : "Invite ready"}</h2>
          <FormMessage state={state} />
          <div className="pt-dialog-actions">
            <button type="button" className="pt-btn pt-btn-secondary" onClick={close}>
              Done
            </button>
            {justAdded && (
              <Link href={`/admin/clients/${clientId}`} className="pt-btn pt-btn-primary">
                Open {firstName}&apos;s page →
              </Link>
            )}
          </div>
        </div>
      ) : (
        <form action={action} className="pt-dialog-body">
          {justAdded && <p className="pt-badge is-ok pt-dialog-badge">✓ {name} added to your clients</p>}
          <h2 id={titleId}>Invite {firstName} to their client area?</h2>
          <p className="pt-muted">
            We&apos;ll email <strong className="pt-strong">{email}</strong> a secure link to create a password. Their
            account is linked to this client record, so when they sign in they&apos;ll see:
          </p>
          <ul className="pt-ticks">
            {hasDiscovery && <li>Their goals from the discovery call</li>}
            <li>Sessions you book</li>
            <li>Updates you share</li>
            <li>Messages with you</li>
          </ul>
          <p className="pt-muted pt-small">The link works once and expires in 7 days.</p>
          <FormMessage state={state} />
          <div className="pt-dialog-actions">
            <button type="button" className="pt-btn pt-btn-secondary" onClick={close}>
              Not now
            </button>
            <SubmitButton pendingLabel="Sending…">Send invite</SubmitButton>
          </div>
        </form>
      )}
    </dialog>
  );
}

/** Client page button that opens the invite modal (fresh each time). */
export function InviteButton({ label, ...target }: InviteTarget & { label: string }) {
  const [opens, setOpens] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (opens > 0) dialogRef.current?.showModal();
  }, [opens]);

  return (
    <>
      <button type="button" className="pt-btn pt-btn-secondary" onClick={() => setOpens((n) => n + 1)}>
        {label}
      </button>
      {opens > 0 && <InviteDialog key={opens} {...target} dialogRef={dialogRef} />}
    </>
  );
}

/**
 * "Work with" on a discovery request: adds them as a client, then offers to
 * send the invite in a modal. Stays mounted through the page refresh.
 */
export function DiscoveryActions({
  discoveryCallId,
  name,
  email,
  clientId: existingClientId,
  declined,
}: {
  discoveryCallId: number;
  name: string;
  email: string;
  clientId: number | null;
  declined: boolean;
}) {
  const [state, action] = useActionState(becomeClient.bind(null, discoveryCallId), undefined);
  const [declineState, declineAction] = useActionState(
    setDiscoveryDeclined.bind(null, discoveryCallId, !declined),
    undefined,
  );
  const [deleteState, deleteAction] = useActionState(deleteDiscoveryCall.bind(null, discoveryCallId), undefined);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const firstName = name.split(/\s+/)[0];
  const newClientId = state?.ok ? Number(state.fields?.clientId) : null;
  const clientId = newClientId ?? existingClientId;
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (newClientId) dialogRef.current?.showModal();
  }, [newClientId]);

  return (
    <div className="pt-inline-form">
      {clientId ? (
        <Link href={`/admin/clients/${clientId}`} className="pt-btn pt-btn-secondary">
          Open client →
        </Link>
      ) : confirmingDelete ? (
        <div className="pt-btn-row">
          <span className="pt-small">Delete {firstName}&apos;s request permanently?</span>
          <form action={deleteAction}>
            <SubmitButton pendingLabel="Deleting…" variant="danger">
              Yes, delete
            </SubmitButton>
          </form>
          <button type="button" className="pt-btn pt-btn-secondary" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="pt-btn-row">
          {!declined && (
            <form action={action}>
              <SubmitButton pendingLabel="Adding…">Work with {firstName}</SubmitButton>
            </form>
          )}
          <form action={declineAction}>
            <SubmitButton pendingLabel="Saving…" variant="secondary">
              {declined ? "Restore request" : "Decline"}
            </SubmitButton>
          </form>
          <button type="button" className="pt-btn pt-btn-danger" onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
        </div>
      )}
      {!state?.ok && <FormMessage state={state} />}
      {!declineState?.ok && <FormMessage state={declineState} />}
      {!deleteState?.ok && <FormMessage state={deleteState} />}
      {newClientId && (
        <InviteDialog
          clientId={newClientId}
          name={name}
          email={email}
          hasDiscovery
          justAdded
          dialogRef={dialogRef}
        />
      )}
    </div>
  );
}

/** A <details> whose initial open state isn't reset by later re-renders. */
export function Disclosure({
  defaultOpen,
  children,
  ...rest
}: { defaultOpen: boolean; children: React.ReactNode } & React.HTMLAttributes<HTMLDetailsElement>) {
  const [initialOpen] = useState(defaultOpen);
  return (
    <details open={initialOpen} {...rest}>
      {children}
    </details>
  );
}

export function EditClientForm({
  clientId,
  fullName,
  email,
  company,
  status,
  kind,
  hasAccount,
}: {
  clientId: number;
  fullName: string;
  email: string;
  company: string;
  status: string;
  kind: string;
  hasAccount: boolean;
}) {
  const [state, action] = useActionState(updateClient.bind(null, clientId), undefined);
  return (
    <form action={action} className="pt-form">
      <div className="pt-field">
        <label htmlFor="fullName">Name</label>
        <input id="fullName" name="fullName" defaultValue={fullName} required maxLength={120} />
        <FieldError state={state} name="fullName" />
      </div>
      <div className="pt-field">
        <label htmlFor="client-email">Email</label>
        <input id="client-email" name="email" type="email" defaultValue={email} required maxLength={254} />
        {hasAccount && <span className="pt-muted pt-small">They sign in with this email, so changing it changes their login.</span>}
        <FieldError state={state} name="email" />
      </div>
      <div className="pt-field">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" defaultValue={company} maxLength={120} />
      </div>
      <div className="pt-field">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="pt-field">
        <label htmlFor="kind">Type</label>
        <select id="kind" name="kind" defaultValue={kind}>
          <option value="client">Coaching client</option>
          <option value="attendee">Workshop attendee</option>
        </select>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}

export function NoteForm({ clientId, canShare }: { clientId: number; canShare: boolean }) {
  const [state, action] = useActionState(addNote.bind(null, clientId), undefined);
  return (
    <form action={action} className="pt-form">
      <div className="pt-field">
        <label htmlFor="note-body">New note</label>
        <textarea
          id="note-body"
          name="body"
          rows={4}
          maxLength={10_000}
          placeholder="Session recap, action points, observations…"
          required
        />
        <FieldError state={state} name="body" />
      </div>
      <label className="pt-check">
        <input type="checkbox" name="shared" defaultChecked={false} />
        <span>
          Share with the client as an update
          <span className="pt-muted pt-small">
            {canShare
              ? " — they'll see it in their portal and get an email."
              : " — they'll see it once they've created their account."}
          </span>
        </span>
      </label>
      <FormMessage state={state} />
      <SubmitButton>Save note</SubmitButton>
    </form>
  );
}

export type PackageOption = { id: number; label: string };

export function SessionForm({
  clientId,
  packageOptions = [],
  defaultPackageId = null,
}: {
  clientId: number;
  packageOptions?: PackageOption[];
  defaultPackageId?: number | null;
}) {
  const [state, action] = useActionState(addSession.bind(null, clientId), undefined);
  const f = state?.fields;
  return (
    <form action={action} className="pt-form" key={state?.ok ? "reset" : "edit"}>
      <div className="pt-field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={state?.ok ? "" : f?.title} placeholder="e.g. Session 2 — pitch structure" maxLength={200} required />
        <FieldError state={state} name="title" />
      </div>
      <div className="pt-field-grid">
        <div className="pt-field">
          <label htmlFor="startsAt">Date &amp; time (UK)</label>
          <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={state?.ok ? "" : f?.startsAt} required />
          <FieldError state={state} name="startsAt" />
        </div>
        <div className="pt-field">
          <label htmlFor="durationMinutes">Length (minutes)</label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={5}
            max={600}
            step={5}
            defaultValue={state?.ok ? "60" : (f?.durationMinutes ?? "60")}
            required
          />
          <FieldError state={state} name="durationMinutes" />
        </div>
      </div>
      {packageOptions.length > 0 && (
        <div className="pt-field">
          <label htmlFor="clientPackageId">Count against package</label>
          <select
            id="clientPackageId"
            name="clientPackageId"
            defaultValue={state?.ok || !f ? String(defaultPackageId ?? "") : f.clientPackageId}
          >
            <option value="">Don&apos;t use a package session</option>
            {packageOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <FieldError state={state} name="clientPackageId" />
        </div>
      )}
      <div className="pt-field">
        <label htmlFor="meetingUrl">Meeting link (optional)</label>
        <input id="meetingUrl" name="meetingUrl" type="url" defaultValue={state?.ok ? "" : f?.meetingUrl} placeholder="https://zoom.us/j/…" maxLength={500} />
        <FieldError state={state} name="meetingUrl" />
      </div>
      <FormMessage state={state} />
      <SubmitButton>Add session</SubmitButton>
    </form>
  );
}

export function AddClientForm() {
  const [state, action] = useActionState<FormState, FormData>(addClient, undefined);
  const clientId = state?.fields?.clientId;
  if (clientId) {
    return (
      <div>
        <FormMessage state={state} />
        <Link href={`/admin/clients/${clientId}`} className="pt-btn pt-btn-secondary">
          Open client →
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="pt-form">
      <div className="pt-field-grid">
        <div className="pt-field">
          <label htmlFor="new-fullName">Name</label>
          <input id="new-fullName" name="fullName" defaultValue={state?.fields?.fullName} maxLength={120} required />
          <FieldError state={state} name="fullName" />
        </div>
        <div className="pt-field">
          <label htmlFor="new-email">Email</label>
          <input id="new-email" name="email" type="email" defaultValue={state?.fields?.email} maxLength={254} required />
          <FieldError state={state} name="email" />
        </div>
      </div>
      <div className="pt-field">
        <label htmlFor="new-company">Company (optional)</label>
        <input id="new-company" name="company" defaultValue={state?.fields?.company} maxLength={120} />
      </div>
      <label className="pt-check">
        <input type="checkbox" name="invite" defaultChecked />
        <span>Email them an invite to create their account now</span>
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Adding…">Add client</SubmitButton>
    </form>
  );
}

export function ConfirmSubmit({ label, confirmText }: { label: string; confirmText: string }) {
  return (
    <button
      type="submit"
      className="pt-link-btn pt-danger"
      onClick={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}

export function RecordPackageForm({ clientId, options }: { clientId: number; options: PackageOption[] }) {
  const [state, action] = useActionState(recordManualPackage.bind(null, clientId), undefined);
  if (options.length === 0) {
    return (
      <p className="pt-muted pt-small">
        Create a package first in{" "}
        <Link href="/admin/packages" className="pt-link">
          Packages
        </Link>
        .
      </p>
    );
  }
  return (
    <form action={action} className="pt-form" key={state?.ok ? "reset" : "edit"}>
      <div className="pt-field">
        <label htmlFor="packageId">Package paid outside Stripe</label>
        <select id="packageId" name="packageId" defaultValue="" required>
          <option value="" disabled>
            Choose a package…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <FieldError state={state} name="packageId" />
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Record as paid</SubmitButton>
    </form>
  );
}

export function DeleteClientForm({ clientId, fullName }: { clientId: number; fullName: string }) {
  const [state, action] = useActionState(deleteClient.bind(null, clientId), undefined);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === fullName.trim().toLowerCase();
  return (
    <form action={action} className="pt-form">
      <p className="pt-muted pt-small">
        Permanently deletes {fullName}&apos;s client record, sign-in, messages, notes, sessions, packages and resource
        shares. Workshop bookings and discovery-call answers are kept but unlinked. This can&apos;t be undone — to keep
        their history instead, set their status to Completed.
      </p>
      <div className="pt-field">
        <label htmlFor="confirmName">Type &quot;{fullName}&quot; to confirm</label>
        <input id="confirmName" name="confirmName" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        <FieldError state={state} name="confirmName" />
      </div>
      <FormMessage state={state} />
      <button type="submit" className="pt-btn pt-btn-danger" disabled={!matches}>
        Delete client permanently
      </button>
    </form>
  );
}
