import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { agendaWindow, groupByDay, listAgenda } from "@/lib/calendar";
import { formatDay, formatTime } from "@/lib/time";

const RANGES = [14, 60] as const;

export default async function AdminCalendarPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const days = (await searchParams).days === "60" ? 60 : 14;
  const { from, to } = agendaWindow(days);
  const agenda = groupByDay(await listAgenda(from, to));

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Calendar</h1>
        <p className="pt-muted">Sessions, discovery calls and workshops. All times are UK time.</p>
      </div>

      <div className="cal-toolbar">
        <div className="su-segmented" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/calendar?days=${r}`} className={`cal-range ${days === r ? "is-current" : ""}`} aria-current={days === r ? "true" : undefined}>
              Next {r} days
            </Link>
          ))}
        </div>
        <Link href="/admin/scheduling" className="pt-link pt-small">
          Availability & booking types →
        </Link>
      </div>

      {agenda.length === 0 ? (
        <section className="pt-card">
          <p className="pt-muted">Nothing booked in the next {days} days.</p>
        </section>
      ) : (
        <ol className="cal-days">
          {agenda.map(({ date, items }) => (
            <li key={date} className="cal-day">
              <h2 className="cal-day-title">{formatDay(items[0].start)}</h2>
              <ul className="cal-items">
                {items.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className={`cal-item ${item.kind === "busy" ? "is-busy" : ""}`}>
                    <span className="cal-dot" style={{ background: item.colour }} aria-hidden />
                    <span className="cal-time">
                      {item.allDay ? (
                        "All day"
                      ) : (
                        <>
                          {formatTime(item.start)}
                          <span className="pt-muted">–{formatTime(item.end)}</span>
                        </>
                      )}
                    </span>
                    <Link href={item.href} className="cal-body">
                      <span className="cal-title">{item.title}</span>
                      <span className="pt-muted pt-small">{item.who}</span>
                    </Link>
                    {item.joinUrl && (
                      <a href={item.joinUrl} className="pt-btn pt-btn-secondary cal-join" target="_blank" rel="noopener noreferrer">
                        Join
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
