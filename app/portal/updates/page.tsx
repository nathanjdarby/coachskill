import { notFound } from "next/navigation";
import { requireClient } from "@/lib/dal";
import { getPortalData } from "@/lib/portal";
import { formatDateTime } from "@/lib/time";

export default async function PortalUpdatesPage() {
  const user = await requireClient();
  const data = await getPortalData(user.clientId);
  if (!data) notFound();

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Updates</h1>
        <p className="pt-muted">Session recaps, action points and notes Monika has shared with you.</p>
      </div>
      {data.updates.length === 0 ? (
        <div className="pt-card">
          <p className="pt-muted">No updates yet.</p>
        </div>
      ) : (
        <ul className="pt-stack">
          {data.updates.map(({ note, authorName }) => (
            <li key={note.id} className="pt-card">
              <p className="pt-muted pt-small">
                {authorName} · {formatDateTime(note.createdAt)}
              </p>
              <p className="pt-prewrap pt-mt-sm">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
