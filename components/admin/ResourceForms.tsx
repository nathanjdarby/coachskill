"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { addResourceShare } from "@/app/actions/resources";
import type { FormState } from "@/app/actions/types";
import { FieldError, FormMessage, SubmitButton } from "@/components/portal/FormBits";

export type Option = { id: number; label: string };

/** Who can see it: every client, one client, or a workshop date's attendees. */
function ShareFields({ state, clients, workshops, idPrefix }: { state: FormState; clients: Option[]; workshops: Option[]; idPrefix: string }) {
  const [scope, setScope] = useState("client");
  return (
    <>
      <div className="pt-field">
        <label htmlFor={`${idPrefix}-scope`}>Share with</label>
        <select id={`${idPrefix}-scope`} name="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="client">One client</option>
          <option value="workshop">Everyone booked on a workshop date</option>
          <option value="all_clients">All clients</option>
        </select>
        <FieldError state={state} name="scope" />
      </div>
      {scope === "client" && (
        <div className="pt-field">
          <label htmlFor={`${idPrefix}-client`}>Client</label>
          <select id={`${idPrefix}-client`} name="clientId" defaultValue="" required>
            <option value="" disabled>
              Choose a client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {scope === "workshop" && (
        <div className="pt-field">
          <label htmlFor={`${idPrefix}-workshop`}>Workshop date</label>
          <select id={`${idPrefix}-workshop`} name="workshopId" defaultValue="" required>
            <option value="" disabled>
              Choose a date…
            </option>
            {workshops.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
          <span className="pt-muted pt-small">Matched to client accounts by the email they booked with.</span>
        </div>
      )}
      <label className="pt-check">
        <input type="checkbox" name="notify" />
        <span>Email them that it&apos;s been shared</span>
      </label>
    </>
  );
}

export function UploadResourceForm({ clients, workshops, maxMb, accept }: { clients: Option[]; workshops: Option[]; maxMb: number; accept: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<"file" | "link">("file");
  const [state, setState] = useState<FormState>(undefined);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const file = data.get("file");
    if (kind === "file" && file instanceof File && file.size > maxMb * 1024 * 1024) {
      setState({ errors: { file: `Files can be up to ${maxMb} MB.` } });
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/admin/resources/upload", { method: "POST", body: data });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; errors?: Record<string, string>; error?: string };
      if (res.ok && body.ok) {
        formRef.current?.reset();
        setKind("file");
        setState({ ok: true, message: "Shared. It's now in their Resources tab." });
        router.refresh();
      } else {
        setState({ errors: body.errors, message: body.error ?? (res.status === 413 ? `That file is too large (max ${maxMb} MB).` : undefined), ok: false });
      }
    } catch {
      setState({ ok: false, message: "The upload failed. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="pt-form">
      <div className="pt-segmented" role="radiogroup" aria-label="Type">
        {(["file", "link"] as const).map((k) => (
          <label key={k} className={kind === k ? "is-selected" : ""}>
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            {k === "file" ? "Upload a file" : "Share a link"}
          </label>
        ))}
      </div>
      <div className="pt-field">
        <label htmlFor="res-title">Title</label>
        <input id="res-title" name="title" maxLength={200} placeholder="e.g. Value pitch worksheet" required />
        <FieldError state={state} name="title" />
      </div>
      {kind === "file" ? (
        <div className="pt-field">
          <label htmlFor="res-file">File</label>
          <input id="res-file" name="file" type="file" accept={accept} required />
          <span className="pt-muted pt-small">PDF, Word, PowerPoint, Excel or an image, up to {maxMb} MB.</span>
          <FieldError state={state} name="file" />
        </div>
      ) : (
        <div className="pt-field">
          <label htmlFor="res-url">Link</label>
          <input id="res-url" name="url" type="url" placeholder="https://… (e.g. a recording)" maxLength={1000} required />
          <FieldError state={state} name="url" />
        </div>
      )}
      <div className="pt-field">
        <label htmlFor="res-description">Note for the client (optional)</label>
        <textarea id="res-description" name="description" rows={2} maxLength={1000} />
      </div>
      <ShareFields state={state} clients={clients} workshops={workshops} idPrefix="res" />
      <FormMessage state={state} />
      <button type="submit" className="pt-btn pt-btn-primary" disabled={pending}>
        {pending ? "Uploading…" : "Share"}
      </button>
    </form>
  );
}

export function AddShareForm({ resourceId, clients, workshops }: { resourceId: number; clients: Option[]; workshops: Option[] }) {
  const [state, action] = useActionState(addResourceShare.bind(null, resourceId), undefined);
  return (
    <form action={action} className="pt-form" key={state?.ok ? "reset" : "edit"}>
      <ShareFields state={state} clients={clients} workshops={workshops} idPrefix={`share-${resourceId}`} />
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Add</SubmitButton>
    </form>
  );
}
