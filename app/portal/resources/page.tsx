import { PageHeader } from "@/components/portal/PageHeader";
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
    <div className="pt-page ov">
      <PageHeader
        eyebrow="From Monika"
        title="Resources"
        lead={
          items.length
            ? `${items.length} ${items.length === 1 ? "item" : "items"} — worksheets, templates and links Monika has shared with you.`
            : "Worksheets, templates and links Monika has shared with you."
        }
      />
      {items.length === 0 ? (
        <section className="pt-card">
          <p className="ov-empty">Nothing here yet. Anything Monika shares with you will appear here.</p>
        </section>
      ) : (
        <ul className="pc-resource-grid">
          {items.map((r) => {
            const kind = kindLabel(r);
            return (
              <li key={r.id}>
                <a
                  href={r.kind === "link" ? r.url! : `/api/resources/${r.id}/file`}
                  className="pc-resource-card"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={`pt-resource-type is-${kind.toLowerCase()}`}>{kind}</span>
                  <span className="pc-resource-card-title">{r.title}</span>
                  {r.description && <span className="pt-muted pt-small pt-prewrap pc-resource-card-desc">{r.description}</span>}
                  <span className="pc-resource-card-foot">
                    <span className="pt-muted pt-small">Shared {formatDate(r.createdAt)}</span>
                    <span className="pc-resource-card-action">{r.kind === "link" ? "Open ↗" : "Download ↓"}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
