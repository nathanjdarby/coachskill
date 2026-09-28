import Link from "next/link";
import { NEW_WORKSHOP, WorkshopForm } from "@/components/admin/WorkshopForm";
import { requireAdmin } from "@/lib/dal";
import { workshopHostJoinUrl } from "@/lib/join";
import { formatPence } from "@/lib/money";
import { formatDateTime, toLondonInputValue } from "@/lib/time";
import { listWorkshopsForAdmin } from "@/lib/workshops";

export default async function AdminWorkshopsPage() {
  const admin = await requireAdmin();
  const runs = await listWorkshopsForAdmin();
  const hostLinks = new Map(await Promise.all(runs.map(async (w) => [w.id, await workshopHostJoinUrl(w, admin.name)] as const)));

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <h1>Workshops</h1>
        <p className="pt-muted">
          Each date is its own run. Balance links are emailed automatically a week before, with a reminder 3 days
          before.
        </p>
      </div>

      <details className="pt-card pt-details">
        <summary>
          <span className="pt-details-title">Add a workshop date</span>
          <span className="pt-muted pt-small">Set the date, places and prices</span>
        </summary>
        <div className="pt-details-body">
          <WorkshopForm id={null} initial={NEW_WORKSHOP} />
        </div>
      </details>

      {runs.length === 0 && (
        <section className="pt-card">
          <p className="pt-muted">No workshops yet.</p>
        </section>
      )}

      {runs.map((w) => {
        const { past } = w;
        return (
          <section key={w.id} className="pt-card pt-workshop">
            <div className="pt-card-head">
              <h2>{w.name}</h2>
              <span className={`pt-badge ${past ? "" : w.published ? "is-ok" : "is-warn"}`}>
                {past ? "Past" : w.published ? "On sale" : w.startsAt ? "Hidden" : "No date"}
              </span>
            </div>
            <p className="pt-muted">
              {w.startsAt ? `${formatDateTime(w.startsAt)} (UK)` : "No date set"}
              {w.location ? ` · ${w.location}` : ""}
            </p>
            {w.locationMode !== "in_person" && (
              <p className="pt-small">
                {w.meetingUrl ? (
                  <>
                    <span className="pt-muted">Join link: </span>
                    <a href={hostLinks.get(w.id) ?? w.meetingUrl} className="pt-link" target="_blank" rel="noopener noreferrer">
                      {w.meetingUrl.replace(/^https:\/\//, "")}
                    </a>
                  </>
                ) : (
                  <span className="pt-muted">Online — add the meeting link</span>
                )}
              </p>
            )}

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
            </div>

            <details className="pt-details pt-details-inline">
              <summary>
                <span className="pt-details-title">Edit</span>
              </summary>
              <div className="pt-details-body">
                <WorkshopForm
                  id={w.id}
                  initial={{
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
          </section>
        );
      })}

      <p className="pt-small pt-muted">
        <Link href="/admin/signups" className="pt-link">
          All signups →
        </Link>
      </p>
    </div>
  );
}
