import Link from "next/link";
import { SessionRequestButtons } from "@/components/admin/SessionRequestButtons";
import { WaitingBanner } from "@/components/admin/WaitingBanner";
import { requireAdmin } from "@/lib/dal";
import {
  adminDashboardCounts,
  listClientsOverview,
  listDiscoveryCallsWithClients,
  listSessionRequests,
} from "@/lib/portal";
import { formatDate, formatDateTime } from "@/lib/time";

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();
  const [counts, clients, requests, sessionRequests] = await Promise.all([
    adminDashboardCounts(),
    listClientsOverview(),
    listDiscoveryCallsWithClients(),
    listSessionRequests(),
  ]);

  const unread = clients.filter((c) => c.unread > 0);
  const upcoming = clients
    .filter((c) => c.nextSession)
    .sort((a, b) => a.nextSession!.startsAt.getTime() - b.nextSession!.startsAt.getTime())
    .slice(0, 5);
  const newRequests = requests.filter((r) => !r.clientId && !r.call.declinedAt).slice(0, 5);

  const stats = [
    { label: "Active clients", value: counts.activeClients, href: "/admin/clients" },
    { label: "Unread messages", value: counts.unreadMessages, href: "/admin/clients" },
    { label: "Appointments in the next 7 days", value: counts.sessionsThisWeek, href: "/admin/calendar" },
    { label: "New discovery requests", value: counts.newDiscoveryRequests, href: "/admin/discovery" },
  ];

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <h1>Hello, {admin.name.split(/\s+/)[0]}</h1>
        <p className="pt-muted">Here&apos;s what&apos;s happening with your clients.</p>
      </div>

      <WaitingBanner />

      {sessionRequests.length > 0 && (
        <section className="pt-card pt-requests" id="requests">
          <div className="pt-card-head">
            <h2>Session requests</h2>
            <span className="pt-badge is-warn">{sessionRequests.length} to approve</span>
          </div>
          <p className="pt-muted pt-small pt-card-sub">
            Clients&apos; bookings aren&apos;t confirmed until you approve them. Anything not approved by its start time
            is released automatically.
          </p>
          <ul className="pt-list">
            {sessionRequests.map(({ session: s, clientName }) => (
              <li key={s.id} className="pt-request">
                <div>
                  <Link href={s.clientId ? `/admin/clients/${s.clientId}#sessions` : `/admin/sessions/${s.id}`} className="pt-table-title">
                    {clientName ?? s.inviteeName ?? "Client"}
                  </Link>
                  <span className="pt-muted pt-small pt-block">
                    {s.title} · {formatDateTime(s.startsAt)} · {s.durationMinutes} min
                  </span>
                </div>
                <SessionRequestButtons sessionId={s.id} label={`${clientName ?? "this"}'s request`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="pt-stats">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="pt-card pt-stat">
            <span className="pt-stat-value">{s.value}</span>
            <span className="pt-muted pt-small">{s.label}</span>
          </Link>
        ))}
      </div>

      <div className="pt-columns">
        <section className="pt-card">
          <h2>Unread messages</h2>
          {unread.length === 0 ? (
            <p className="pt-muted">You&apos;re all caught up.</p>
          ) : (
            <ul className="pt-list">
              {unread.map(({ client, unread: n }) => (
                <li key={client.id}>
                  <Link href={`/admin/clients/${client.id}#messages`} className="pt-list-link">
                    <span>{client.fullName}</span>
                    <span className="pt-badge is-accent">{n} new</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pt-card">
          <div className="pt-card-head">
            <h2>Upcoming sessions</h2>
            <Link href="/admin/calendar" className="pt-link pt-small">
              Calendar →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="pt-muted">No sessions booked.</p>
          ) : (
            <ul className="pt-list">
              {upcoming.map(({ client, nextSession }) => (
                <li key={client.id}>
                  <Link href={`/admin/clients/${client.id}#sessions`} className="pt-list-link">
                    <span>
                      {client.fullName}
                      <span className="pt-muted pt-small pt-block">{nextSession!.title}</span>
                    </span>
                    <span className="pt-muted pt-small">{formatDateTime(nextSession!.startsAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="pt-card">
        <div className="pt-card-head">
          <h2>New discovery requests</h2>
          <Link href="/admin/discovery" className="pt-link pt-small">
            View all →
          </Link>
        </div>
        {newRequests.length === 0 ? (
          <p className="pt-muted">No new requests.</p>
        ) : (
          <ul className="pt-list">
            {newRequests.map(({ call }) => (
              <li key={call.id}>
                <Link href={`/admin/discovery#request-${call.id}`} className="pt-list-link">
                  <span>
                    {call.fullName}
                    <span className="pt-muted pt-small pt-block">{call.company}</span>
                  </span>
                  <span className="pt-muted pt-small">{formatDate(call.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
