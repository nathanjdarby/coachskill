import Link from "next/link";
import { notFound } from "next/navigation";
import { toChoice } from "@/components/admin/WorkshopDatesTable";
import { DeleteWorkshopButton, WorkshopForm } from "@/components/admin/WorkshopForm";
import { requireAdmin } from "@/lib/dal";
import { workshopHostJoinUrl } from "@/lib/join";
import { formatPence } from "@/lib/money";
import { formatDateTime, toLondonInputValue } from "@/lib/time";
import { listProgrammesForAdmin, listWorkshopsForAdmin, workshopStatus } from "@/lib/workshops";

export default async function AdminWorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [runs, programmes] = await Promise.all([listWorkshopsForAdmin(), listProgrammesForAdmin()]);
  const w = runs.find((r) => r.id === id);
  if (!w) notFound();
  const programme = programmes.find((p) => p.id === w.programmeId);
  const hostLink = await workshopHostJoinUrl(w, admin.name);
  const status = workshopStatus(w);

  return (
    <div className="pt-page">
      <Link href={programme ? `/admin/workshops/${programme.id}` : "/admin/workshops"} className="pt-link pt-small">
        ← {programme ? programme.title : "All workshops"}
      </Link>

      <div className="pt-page-head">
        <h1>{w.name}</h1>
        <p className="pt-muted">
          {w.startsAt ? `${formatDateTime(w.startsAt)} (UK)` : "No date set"}
          {w.location ? ` · ${w.location}` : ""}
        </p>
        {w.locationMode !== "in_person" && (
          <p className="pt-small">
            {w.meetingUrl ? (
              <>
                <span className="pt-muted">Join link: </span>
                <a href={hostLink ?? w.meetingUrl} className="pt-link" target="_blank" rel="noopener noreferrer">
                  {w.meetingUrl.replace(/^https:\/\//, "")}
                </a>
              </>
            ) : (
              <span className="pt-muted">Online — add the meeting link</span>
            )}
          </p>
        )}
        <div className="pt-badges">
          <span className={`pt-badge ${status.tone}`}>{status.label}</span>
        </div>
      </div>

      <section className="pt-card pt-workshop">
        <dl className="pt-workshop-stats">
          <div>
            <dt>Places</dt>
            <dd>
              {w.seatsTaken}
              {w.capacity != null ? ` / ${w.capacity}` : ""}
            </dd>
          </div>
          <div>
            <dt>Fully paid</dt>
            <dd>{w.balancePaid}</dd>
          </div>
          <div>
            <dt>Awaiting balance</dt>
            <dd>{w.balanceRequested}</dd>
          </div>
          <div>
            <dt>Collected</dt>
            <dd>{formatPence(w.paidPence)}</dd>
          </div>
        </dl>

        <p className="pt-small pt-muted">
          Deposit {formatPence(w.depositPence)} · Balance {formatPence(w.balancePence)}
        </p>

        <div className="pt-workshop-actions">
          <Link href={`/admin/signups?workshop=${w.id}`} className="pt-btn pt-btn-secondary">
            View signups
          </Link>
          <DeleteWorkshopButton id={w.id} />
        </div>
      </section>

      <details className="pt-card pt-details">
        <summary>
          <span className="pt-details-title">Edit</span>
          <span className="pt-muted pt-small">Date, places, prices and link</span>
        </summary>
        <div className="pt-details-body">
          <WorkshopForm
            id={w.id}
            programmes={programmes.map(toChoice)}
            initial={{
              programmeId: w.programmeId == null ? "" : String(w.programmeId),
              name: w.name,
              slug: w.slug,
              startsAt: w.startsAt ? toLondonInputValue(w.startsAt) : "",
              durationMinutes: String(w.durationMinutes),
              location: w.location ?? "",
              locationMode: w.locationMode,
              meetingUrl: w.locationMode === "custom" ? (w.meetingUrl ?? "") : "",
              capacity: w.capacity == null ? "" : String(w.capacity),
              deposit: String(w.depositPence / 100),
              balance: String(w.balancePence / 100),
              published: w.published,
            }}
          />
        </div>
      </details>
    </div>
  );
}
