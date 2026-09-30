"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createUser, deleteUser, resendUserInvite, updateUser } from "@/app/actions/users";
import type { FormState } from "@/app/actions/types";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "client";
  invited: boolean;
  isYou: boolean;
};

/** A button that opens a modal, remounting its contents each time so forms start fresh. */
function ModalButton({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  const [opens, setOpens] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (opens > 0) dialogRef.current?.showModal();
  }, [opens]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpens((n) => n + 1)}>
        {label}
      </button>
      {opens > 0 && (
        <dialog key={opens} ref={dialogRef} className="pt-dialog">
          {children}
        </dialog>
      )}
    </>
  );
}

/** Closes whichever modal it's in. */
function CloseButton({ children, variant = "secondary" }: { children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <button type="button" className={`pt-btn pt-btn-${variant}`} onClick={(e) => e.currentTarget.closest("dialog")?.close()}>
      {children}
    </button>
  );
}

function DoneBody({ title, state }: { title: string; state: FormState }) {
  return (
    <div className="pt-dialog-body">
      <h2>{title}</h2>
      <FormMessage state={state} />
      <div className="pt-dialog-actions">
        <CloseButton variant="primary">Done</CloseButton>
      </div>
    </div>
  );
}

function AddUserBody() {
  const [state, action] = useActionState<FormState, FormData>(createUser, undefined);
  const [role, setRole] = useState(state?.fields?.role === "admin" ? "admin" : "client");
  if (state?.fields?.created) {
    return <DoneBody title={state.ok ? "Invite sent" : "User added"} state={state} />;
  }
  const f = state?.fields;

  return (
    <form action={action} className="pt-dialog-body">
      <h2>Add a user</h2>
      <p className="pt-muted">
        They&apos;ll get an email with a secure link to create their password, then they can sign in.
      </p>
      <div className="pt-segmented" role="radiogroup" aria-label="Role">
        {(["client", "admin"] as const).map((r) => (
          <label key={r} className={role === r ? "is-selected" : ""}>
            <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
            {r === "client" ? "Client" : "Administrator"}
          </label>
        ))}
      </div>
      <p className="pt-muted pt-small">
        {role === "client"
          ? "Clients sign in to their own client area. They're added to your Clients list too."
          : "Administrators have full access to this admin area, the same as you."}
      </p>
      <div className="pt-field">
        <label htmlFor="new-user-name">Name</label>
        <input id="new-user-name" name="name" defaultValue={f?.name} maxLength={120} required />
        <FieldError state={state} name="name" />
      </div>
      <div className="pt-field">
        <label htmlFor="new-user-email">Email</label>
        <input id="new-user-email" name="email" type="email" defaultValue={f?.email} maxLength={254} required />
        <FieldError state={state} name="email" />
      </div>
      {role === "client" && (
        <div className="pt-field">
          <label htmlFor="new-user-company">Company (optional)</label>
          <input id="new-user-company" name="company" defaultValue={f?.company} maxLength={120} />
        </div>
      )}
      <FormMessage state={state} />
      <div className="pt-dialog-actions">
        <CloseButton>Cancel</CloseButton>
        <SubmitButton pendingLabel="Sending invite…">Add and send invite</SubmitButton>
      </div>
    </form>
  );
}

export function AddUserButton() {
  return (
    <ModalButton label="Add user" className="pt-btn pt-btn-primary">
      <AddUserBody />
    </ModalButton>
  );
}

function EditUserBody({ user }: { user: UserRow }) {
  const [state, action] = useActionState(updateUser.bind(null, user.id), undefined);
  if (state?.ok) return <DoneBody title="Changes saved" state={state} />;
  return (
    <form action={action} className="pt-dialog-body">
      <h2>Edit {user.name}</h2>
      <div className="pt-field">
        <label htmlFor={`user-name-${user.id}`}>Name</label>
        <input id={`user-name-${user.id}`} name="name" defaultValue={user.name} maxLength={120} required />
        <FieldError state={state} name="name" />
      </div>
      <div className="pt-field">
        <label htmlFor={`user-email-${user.id}`}>Email</label>
        <input id={`user-email-${user.id}`} name="email" type="email" defaultValue={user.email} maxLength={254} required />
        <span className="pt-muted pt-small">This is the email they sign in with.</span>
        <FieldError state={state} name="email" />
      </div>
      <p className="pt-muted pt-small">
        Role: <strong className="pt-strong">{user.role === "admin" ? "Administrator" : "Client"}</strong>. To change
        someone&apos;s role, delete them and add them again.
      </p>
      <FormMessage state={state} />
      <div className="pt-dialog-actions">
        <CloseButton>Cancel</CloseButton>
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </form>
  );
}

function ResendBody({ user }: { user: UserRow }) {
  const [state, action] = useActionState(resendUserInvite.bind(null, user.id), undefined);
  if (state?.ok || state?.link) return <DoneBody title={state.ok ? "Invite sent" : "Invite ready"} state={state} />;
  return (
    <form action={action} className="pt-dialog-body">
      <h2>Resend invite?</h2>
      <p className="pt-muted">
        We&apos;ll email <strong className="pt-strong">{user.email}</strong> a new link to create their password.
        Any earlier link stops working.
      </p>
      <FormMessage state={state} />
      <div className="pt-dialog-actions">
        <CloseButton>Cancel</CloseButton>
        <SubmitButton pendingLabel="Sending…">Send invite</SubmitButton>
      </div>
    </form>
  );
}

function DeleteUserBody({ user }: { user: UserRow }) {
  const [state, action] = useActionState(deleteUser.bind(null, user.id), undefined);
  if (state?.ok) return <DoneBody title="User deleted" state={state} />;
  return (
    <form action={action} className="pt-dialog-body">
      <h2>Delete {user.name}?</h2>
      {user.role === "admin" ? (
        <p className="pt-muted">
          They won&apos;t be able to sign in any more. Notes, messages and resources they created are kept and
          credited to you.
        </p>
      ) : (
        <p className="pt-muted">
          This deletes their client record too: their sign-in, messages, notes, sessions, packages and shared
          resources. Workshop bookings and discovery-call answers are kept. <strong className="pt-strong">This
          can&apos;t be undone.</strong>
        </p>
      )}
      <div className="pt-field">
        <label htmlFor={`confirm-${user.id}`}>
          Type <strong className="pt-strong">{user.name}</strong> to confirm
        </label>
        <input id={`confirm-${user.id}`} name="confirmName" autoComplete="off" required />
        <FieldError state={state} name="confirmName" />
      </div>
      <FormMessage state={state} />
      <div className="pt-dialog-actions">
        <CloseButton>Cancel</CloseButton>
        <SubmitButton pendingLabel="Deleting…" variant="danger">
          Delete
        </SubmitButton>
      </div>
    </form>
  );
}

export function UserActions({ user }: { user: UserRow }) {
  return (
    <div className="pt-btn-row">
      <ModalButton label="Edit" className="pt-btn pt-btn-secondary pt-btn-sm">
        <EditUserBody user={user} />
      </ModalButton>
      {user.invited && (
        <ModalButton label="Resend invite" className="pt-btn pt-btn-secondary pt-btn-sm">
          <ResendBody user={user} />
        </ModalButton>
      )}
      {!user.isYou && (
        <ModalButton label="Delete" className="pt-btn pt-btn-danger pt-btn-sm">
          <DeleteUserBody user={user} />
        </ModalButton>
      )}
    </div>
  );
}
