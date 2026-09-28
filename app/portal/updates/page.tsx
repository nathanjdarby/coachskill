import Link from "next/link";
import { notFound } from "next/navigation";
import { DateChip } from "@/components/portal/DateChip";
import { PageHeader } from "@/components/portal/PageHeader";
import { requireClient } from "@/lib/dal";
import { getPortalData } from "@/lib/portal";
import { formatTime } from "@/lib/time";

export default async function PortalUpdatesPage() {
  const user = await requireClient();
  const data = await getPortalData(user.clientId);
  if (!data) notFound();

  return (
    <div className="pt-page ov pt-narrow">
      <PageHeader
        eyebrow="Your coaching"
        title="Updates"
        lead="Session recaps, action points and notes Monika has shared with you, newest first."
        actions={
          <Link href="/portal/messages" className="pt-btn pt-btn-secondary">
            Reply to Monika
          </Link>
        }
      />
      {data.updates.length === 0 ? (
        <section className="pt-card">
          <p className="ov-empty">No updates yet. After each session, Monika&apos;s recap and your action points will appear here.</p>
        </section>
      ) : (
        <ol className="pc-timeline">
          {data.updates.map(({ note, authorName }, i) => (
            <li key={note.id} className={`pc-timeline-item ${i === 0 ? "is-latest" : ""}`}>
              <DateChip date={note.createdAt} muted={i > 0} />
              <article className="pt-card pc-timeline-card">
                <p className="pt-muted pt-small">
                  {authorName} · {formatTime(note.createdAt)}
                  {i === 0 && <span className="pt-badge is-accent">Latest</span>}
                </p>
                <p className="pt-prewrap">{note.body}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
