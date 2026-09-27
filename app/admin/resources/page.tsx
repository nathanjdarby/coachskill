import { deleteResource, removeResourceShare } from "@/app/actions/resources";
import { ConfirmSubmit } from "@/components/admin/ClientForms";
import { AddShareForm, UploadResourceForm } from "@/components/admin/ResourceForms";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { clients as clientsTable } from "@/lib/db/schema";
import { listResourcesForAdmin } from "@/lib/resources";
import { formatDate } from "@/lib/time";
import { ALLOWED_EXTENSIONS, maxUploadBytes } from "@/lib/uploads";
import { listWorkshopsForAdmin } from "@/lib/workshops";

function fileSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AdminResourcesPage() {
  await requireAdmin();
  const [items, clientRows, runs] = await Promise.all([
    listResourcesForAdmin(),
    getDb().select({ id: clientsTable.id, name: clientsTable.fullName }).from(clientsTable).orderBy(clientsTable.fullName),
    listWorkshopsForAdmin(),
  ]);
  const clientOptions = clientRows.map((c) => ({ id: c.id, label: c.name }));
  const workshopOptions = runs
    .filter((w) => w.startsAt)
    .map((w) => ({ id: w.id, label: `${w.name} — ${formatDate(w.startsAt!)}` }));
  const maxMb = Math.round(maxUploadBytes() / 1024 / 1024);

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Resources</h1>
        <p className="pt-muted">Worksheets, templates and recordings for clients. They appear in each client&apos;s Resources tab.</p>
      </div>

      <details className="pt-card pt-details" open={items.length === 0}>
        <summary>
          <span className="pt-details-title">Share something new</span>
          <span className="pt-muted pt-small">Upload a file or add a link</span>
        </summary>
        <div className="pt-details-body">
          <UploadResourceForm
            clients={clientOptions}
            workshops={workshopOptions}
            maxMb={maxMb}
            accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
          />
        </div>
      </details>

      {items.map((r) => (
        <section key={r.id} className="pt-card">
          <div className="pt-card-head">
            <h2>{r.title}</h2>
            <span className="pt-badge">{r.kind === "link" ? "Link" : (r.originalName?.split(".").pop() ?? "File").toUpperCase()}</span>
          </div>
          <p className="pt-muted pt-small">
            {r.kind === "file" ? `${r.originalName} · ${fileSize(r.sizeBytes)} · ` : ""}
            Added {formatDate(r.createdAt)}
            {" · "}
            <a
              href={r.kind === "link" ? r.url! : `/api/resources/${r.id}/file`}
              className="pt-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open
            </a>
          </p>
          {r.description && <p className="pt-prewrap pt-mt-sm">{r.description}</p>}

          <div className="pt-share-list">
            {r.shares.length === 0 && <span className="pt-muted pt-small">Not shared with anyone yet.</span>}
            {r.shares.map((s) => (
              <span key={s.id} className="pt-share-chip">
                {s.label}
                {s.matched !== undefined && <span className="pt-muted"> · {s.matched} matched</span>}
                <form action={removeResourceShare.bind(null, s.id)}>
                  <ConfirmSubmit label="×" confirmText={`Stop sharing with ${s.label}?`} />
                </form>
              </span>
            ))}
          </div>

          <details className="pt-details pt-details-inline">
            <summary>
              <span className="pt-details-title">Share with more people</span>
            </summary>
            <div className="pt-details-body">
              <AddShareForm resourceId={r.id} clients={clientOptions} workshops={workshopOptions} />
            </div>
          </details>
          <form action={deleteResource.bind(null, r.id)} className="pt-mt">
            <ConfirmSubmit label="Delete resource" confirmText={`Delete "${r.title}"? Clients will no longer see it.`} />
          </form>
        </section>
      ))}
    </div>
  );
}
