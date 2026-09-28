import Link from "next/link";
import { NEW_PROGRAMME, ProgrammeForm } from "@/components/admin/ProgrammeForm";
import { toChoice, WorkshopDates } from "@/components/admin/WorkshopDatesTable";
import { WorkshopForm } from "@/components/admin/WorkshopForm";
import { NEW_WORKSHOP } from "@/lib/workshop-form";
import { requireAdmin } from "@/lib/dal";
import { formatDateTime } from "@/lib/time";
import { categoryLabel } from "@/lib/workshop-categories";
import { listProgrammesForAdmin, listWorkshopsForAdmin } from "@/lib/workshops";

export default async function AdminWorkshopsPage() {
  await requireAdmin();
  const [programmes, runs] = await Promise.all([listProgrammesForAdmin(), listWorkshopsForAdmin()]);

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <h1>Workshops</h1>
        <p className="pt-muted">
          Each workshop has its own public page on{" "}
          <Link href="/workshop" className="pt-link" target="_blank">
            /workshop
          </Link>
          , and can run on as many dates as you like. Balance links are emailed automatically a week before each date,
          with a reminder 3 days before.
        </p>
      </div>

      <h2 className="pt-subhead">Your workshops</h2>
      {programmes.length === 0 ? (
        <section className="pt-card">
          <p className="pt-muted">No workshops yet — add your first one below.</p>
        </section>
      ) : (
        <div className="pt-table-wrap">
          <table className="pt-table pt-table-stack">
            <thead>
              <tr>
                <th>Workshop</th>
                <th>Page</th>
                <th>Next date</th>
                <th>Upcoming dates</th>
              </tr>
            </thead>
            <tbody>
              {programmes.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/workshops/${p.id}`} className="pt-table-title">
                      {p.title}
                    </Link>
                    <span className="pt-muted pt-small pt-block">{categoryLabel(p.category)}</span>
                  </td>
                  <td data-label="Page">
                    <span className={`pt-badge ${p.published ? "is-ok" : "is-warn"}`}>{p.published ? "Published" : "Draft"}</span>
                  </td>
                  <td className="pt-small" data-label="Next date">
                    {p.upcoming[0]?.startsAt ? formatDateTime(p.upcoming[0].startsAt) : <span className="pt-muted">—</span>}
                  </td>
                  <td data-label="Upcoming dates">{p.upcoming.length || <span className="pt-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="pt-card pt-details">
        <summary>
          <span className="pt-details-title">Add a workshop</span>
          <span className="pt-muted pt-small">Choose the type, write the details and its page is created for you</span>
        </summary>
        <div className="pt-details-body">
          <ProgrammeForm id={null} initial={NEW_PROGRAMME} />
        </div>
      </details>

      <h2 className="pt-subhead">All dates</h2>
      {programmes.length > 0 && (
        <details className="pt-card pt-details">
          <summary>
            <span className="pt-details-title">Add a date</span>
            <span className="pt-muted pt-small">Pick the workshop, then set the date, places and prices</span>
          </summary>
          <div className="pt-details-body">
            <WorkshopForm id={null} initial={NEW_WORKSHOP} programmes={programmes.map(toChoice)} />
          </div>
        </details>
      )}
      <WorkshopDates runs={runs} emptyText="No upcoming dates." />

      <p className="pt-small pt-muted">
        <Link href="/admin/signups" className="pt-link">
          All signups →
        </Link>
      </p>
    </div>
  );
}
