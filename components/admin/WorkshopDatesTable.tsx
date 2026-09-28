import Link from "next/link";
import { formatPence } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import type { WorkshopProgramme } from "@/lib/db/schema";
import { workshopStatus, type WorkshopAdminRow } from "@/lib/workshops";
import type { ProgrammeChoice } from "@/lib/workshop-form";

/** Just what the date form needs to know about a workshop. */
export function toChoice(p: WorkshopProgramme): ProgrammeChoice {
  const { id, title, durationMinutes, capacity, depositPence, balancePence } = p;
  return { id, title, durationMinutes, capacity, depositPence, balancePence };
}

/** Upcoming dates soonest first (undated drafts last), then past dates most recent first. */
export function splitDates(runs: WorkshopAdminRow[]) {
  const time = (w: WorkshopAdminRow) => w.startsAt?.getTime() ?? Infinity;
  return {
    upcoming: runs.filter((w) => !w.past).sort((a, b) => time(a) - time(b)),
    past: runs.filter((w) => w.past).sort((a, b) => time(b) - time(a)),
  };
}

export function WorkshopDatesTable({ runs }: { runs: WorkshopAdminRow[] }) {
  return (
    <div className="pt-table-wrap">
      <table className="pt-table pt-table-stack">
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Places</th>
            <th>Fully paid</th>
            <th>Collected</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((w) => {
            const status = workshopStatus(w);
            return (
              <tr key={w.id}>
                <td>
                  <Link href={`/admin/workshops/dates/${w.id}`} className="pt-table-title">
                    {w.startsAt ? formatDateTime(w.startsAt) : "No date set"}
                  </Link>
                  <span className="pt-muted pt-small pt-block">
                    {w.name}
                    {w.location ? ` · ${w.location}` : ""}
                  </span>
                </td>
                <td data-label="Status">
                  <span className={`pt-badge ${status.tone}`}>{status.label}</span>
                </td>
                <td data-label="Places">
                  {w.seatsTaken}
                  {w.capacity != null ? ` / ${w.capacity}` : ""}
                </td>
                <td data-label="Fully paid">
                  {w.balancePaid}
                  {w.balanceRequested > 0 && <span className="pt-muted pt-small pt-block">{w.balanceRequested} awaiting</span>}
                </td>
                <td data-label="Collected">{formatPence(w.paidPence)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The Upcoming and Past date tables. */
export function WorkshopDates({ runs, emptyText }: { runs: WorkshopAdminRow[]; emptyText: string }) {
  const { upcoming, past } = splitDates(runs);
  return (
    <>
      <h3 className="pt-subhead">Upcoming</h3>
      {upcoming.length === 0 ? (
        <section className="pt-card">
          <p className="pt-muted">{emptyText}</p>
        </section>
      ) : (
        <WorkshopDatesTable runs={upcoming} />
      )}
      {past.length > 0 && (
        <>
          <h3 className="pt-subhead">Past</h3>
          <WorkshopDatesTable runs={past} />
        </>
      )}
    </>
  );
}
