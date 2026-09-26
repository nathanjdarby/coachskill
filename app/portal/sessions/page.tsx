import { requireClient } from "@/lib/dal";
import { listSessions, splitSessions } from "@/lib/portal";
import { formatDateTime } from "@/lib/time";

export default async function PortalSessionsPage() {
  const user = await requireClient();
  const { upcoming, past } = splitSessions(await listSessions(user.clientId));

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Sessions</h1>
        <p className="pt-muted">All times are UK time.</p>
      </div>

      <section className="pt-card">
        <h2>Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="pt-muted">No sessions booked yet.</p>
        ) : (
          <ul className="pt-sessions">
            {upcoming.map((s, i) => (
              <li key={s.id} className={`pt-session ${i === 0 ? "is-next" : ""}`}>
                <div>
                  <p className="pt-session-title">{s.title}</p>
                  <p className="pt-muted pt-small">
                    {formatDateTime(s.startsAt)} · {s.durationMinutes} min
                  </p>
                </div>
                {s.meetingUrl && (
                  <a href={s.meetingUrl} className="pt-btn pt-btn-secondary" target="_blank" rel="noreferrer">
                    Join
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="pt-card">
          <h2>Past</h2>
          <ul className="pt-sessions">
            {past.map((s) => (
              <li key={s.id} className="pt-session">
                <div>
                  <p className="pt-session-title">{s.title}</p>
                  <p className="pt-muted pt-small">
                    {formatDateTime(s.startsAt)} · {s.durationMinutes} min
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
