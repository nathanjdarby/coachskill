import { requireClient } from "@/lib/dal";
import { listResourcesForClient } from "@/lib/resources";
import { formatDate } from "@/lib/time";

function kindLabel(r: { kind: "file" | "link"; originalName: string | null }) {
  if (r.kind === "link") return "Link";
  const ext = r.originalName?.split(".").pop()?.toLowerCase();
  return ext === "pdf" ? "PDF" : ext === "docx" ? "Word" : ext === "pptx" ? "Slides" : ext === "xlsx" ? "Sheet" : "Image";
}

export default async function PortalResourcesPage() {
  const user = await requireClient();
  const items = await listResourcesForClient(user.clientId);

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Resources</h1>
        <p className="pt-muted">Worksheets, templates and recordings Monika has shared with you.</p>
      </div>
      {items.length === 0 ? (
        <section className="pt-card">
          <p className="pt-muted">Nothing here yet. Anything Monika shares with you will appear here.</p>
        </section>
      ) : (
        <ul className="pt-resource-list">
          {items.map((r) => (
            <li key={r.id}>
              <a
                href={r.kind === "link" ? r.url! : `/api/resources/${r.id}/file`}
                className="pt-resource"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={`pt-resource-type is-${kindLabel(r).toLowerCase()}`}>{kindLabel(r)}</span>
                <span className="pt-resource-body">
                  <span className="pt-resource-title">{r.title}</span>
                  {r.description && <span className="pt-muted pt-small pt-prewrap">{r.description}</span>}
                  <span className="pt-muted pt-small">Shared {formatDate(r.createdAt)}</span>
                </span>
                <span aria-hidden className="pt-link-list-chevron">
                  {r.kind === "link" ? "↗" : "↓"}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
