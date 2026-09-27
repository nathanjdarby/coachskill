import { PackagesCard } from "@/components/portal/PackagesCard";
import { requireClient } from "@/lib/dal";
import { listPackages, packageBalances } from "@/lib/packages";
import { listSessions, splitSessions } from "@/lib/portal";
import { formatDateTime } from "@/lib/time";

export default async function PortalSessionsPage({ searchParams }: { searchParams: Promise<{ purchase?: string }> }) {
  const user = await requireClient();
  const [{ purchase }, sessions, balances, offers] = await Promise.all([
    searchParams,
    listSessions(user.clientId),
    packageBalances(user.clientId),
    listPackages({ activeOnly: true }),
  ]);
  const { upcoming, past } = splitSessions(sessions);

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Sessions</h1>
        <p className="pt-muted">All times are UK time.</p>
      </div>

      {purchase === "success" && (
        <div role="status" className="pt-alert is-ok">
          <p>Thank you — your package is confirmed. It can take a moment to appear; refresh if you don&apos;t see it yet.</p>
        </div>
      )}
      {purchase === "canceled" && (
        <div role="status" className="pt-alert is-warn">
          <p>Payment cancelled — nothing was charged.</p>
        </div>
      )}

      <PackagesCard balances={balances} offers={offers} />

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
