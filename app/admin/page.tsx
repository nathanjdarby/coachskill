import Link from "next/link";
import { SessionRequestButtons } from "@/components/admin/SessionRequestButtons";
import { WaitingBanner } from "@/components/admin/WaitingBanner";
import { TabIcon, type IconName } from "@/components/portal/TabIcon";
import { agendaWindow, groupByDay, listAgenda } from "@/lib/calendar";
import { requireAdmin } from "@/lib/dal";
import { formatPence } from "@/lib/money";
import {
  adminDashboardCounts,
  listClientsOverview,
  listDiscoveryCallsWithClients,
  listSessionRequests,
  packageIncomeSince,
} from "@/lib/portal";
import { formatDate, formatDateTime, formatDay, formatTime, londonDate, londonLocalToUtc, TIME_ZONE } from "@/lib/time";
import { listUpcomingWorkshops } from "@/lib/workshops";

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE });
const londonHour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE });
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: TIME_ZONE });

function greeting(now: Date) {
  const h = Number(londonHour.format(now));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** "Today", "Tomorrow", else "Wed, 7 Oct". */
function dayLabel(date: Date, now: Date) {
  const key = (d: Date) => Object.values(londonDate(d)).join("-");
  if (key(date) === key(now)) return "Today";
  if (key(date) === key(new Date(now.getTime() + 24 * 60 * 60 * 1000))) return "Tomorrow";
  return formatDay(date);
}

function StatTile({ icon, value, label, detail, href }: { icon: IconName; value: string | number; label: string; detail?: string; href: string }) {
  return (
    <Link href={href} className="ov-stat">
      <span className="ov-stat-icon" aria-hidden>
        <TabIcon name={icon} />
      </span>
      <span className="ov-stat-value">{value}</span>
      <span className="ov-stat-label">{label}</span>
      {detail && <span className="ov-stat-detail">{detail}</span>}
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();
  const now = new Date();
  const today = londonDate(now);
  const monthStart = londonLocalToUtc(today.year, today.month, 1, 0, 0);
  const { from, to } = agendaWindow(7, now);

  const [counts, clients, requests, sessionRequests, agendaItems, workshops, income] = await Promise.all([
    adminDashboardCounts(),
    listClientsOverview(),
    listDiscoveryCallsWithClients(),
    listSessionRequests(),
    listAgenda(from, to, admin.name),
    listUpcomingWorkshops(now),
    packageIncomeSince(monthStart),
  ]);

  const unread = clients.filter((c) => c.unread > 0);
  const newRequests = requests.filter((r) => !r.clientId && !r.call.declinedAt);
  // Still to come (or on now), without the busy blocks from Monika's own calendars.
  const agenda = groupByDay(agendaItems.filter((i) => i.kind !== "busy" && i.end.getTime() > now.getTime()));
  const placesBooked = workshops.reduce((n, w) => n + w.seatsTaken, 0);
  const attention = sessionRequests.length + newRequests.length + unread.length;

  return (
    <div className="pt-page ov">
      <div className="ov-head">
        <div>
          <p className="ov-date">{longDate.format(now)}</p>
          <h1>
            {greeting(now)}, {admin.name.split(/\s+/)[0]}
          </h1>
          <p className="pt-muted">
            {attention === 0
              ? "You're all caught up."
              : `${attention} ${attention === 1 ? "thing needs" : "things need"} your attention.`}
          </p>
        </div>
        <div className="ov-actions">
          <Link href="/admin/calendar" className="pt-btn pt-btn-secondary">
            Open calendar
          </Link>
          <Link href="/admin/workshops" className="pt-btn pt-btn-primary">
            Add a workshop date
          </Link>
        </div>
      </div>

      <WaitingBanner />

      <div className="ov-stats">
        <StatTile icon="clients" value={counts.activeClients} label="Active clients" href="/admin/clients" />
        <StatTile icon="sessions" value={counts.sessionsThisWeek} label="Appointments" detail="Next 7 days" href="/admin/calendar" />
        <StatTile
          icon="workshops"
          value={placesBooked}
          label="Workshop places booked"
          detail={`${workshops.length} upcoming ${workshops.length === 1 ? "date" : "dates"}`}
          href="/admin/workshops"
        />
        <StatTile
          icon="packages"
          value={formatPence(income.pence)}
          label="Package income"
          detail={`${monthName.format(now)} · ${income.count} sold`}
          href="/admin/packages"
        />
      </div>

      <section className={`pt-card ov-attention ${attention ? "has-items" : ""}`} id="requests">
        <div className="pt-card-head">
          <h2>Needs your attention</h2>
          {attention > 0 && <span className="pt-badge is-warn">{attention}</span>}
        </div>
        {attention === 0 ? (
          <p className="ov-empty">
            <span aria-hidden>✓</span> No session requests, new enquiries or unread messages.
          </p>
        ) : (
          <ul className="ov-tasks">
            {sessionRequests.map(({ session: s, clientName }) => (
              <li key={`req-${s.id}`} className="ov-task">
                <span className="ov-task-icon is-warn" aria-hidden>
                  <TabIcon name="sessions" />
                </span>
                <div className="ov-task-body">
                  <p className="ov-task-title">
                    <Link href={s.clientId ? `/admin/clients/${s.clientId}#sessions` : `/admin/sessions/${s.id}`} className="pt-table-title">
                      {clientName ?? s.inviteeName ?? "Client"}
                    </Link>{" "}
                    requested a session
                  </p>
                  <p className="pt-muted pt-small">
                    {s.title} · {formatDateTime(s.startsAt)} · {s.durationMinutes} min · released automatically if not approved by then
                  </p>
                </div>
                <SessionRequestButtons sessionId={s.id} label={`${clientName ?? "this"}'s request`} />
              </li>
            ))}
            {newRequests.slice(0, 5).map(({ call }) => (
              <li key={`disc-${call.id}`} className="ov-task">
                <span className="ov-task-icon" aria-hidden>
                  <TabIcon name="discovery" />
                </span>
                <div className="ov-task-body">
                  <p className="ov-task-title">
                    <Link href={`/admin/discovery#request-${call.id}`} className="pt-table-title">
                      {call.fullName}
                    </Link>{" "}
                    asked for a discovery call
                  </p>
                  <p className="pt-muted pt-small">
                    {[call.company, `Received ${formatDate(call.createdAt)}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Link href={`/admin/discovery#request-${call.id}`} className="pt-btn pt-btn-secondary">
                  Review
                </Link>
              </li>
            ))}
            {newRequests.length > 5 && (
              <li className="ov-task-more">
                <Link href="/admin/discovery" className="pt-link pt-small">
                  {newRequests.length - 5} more discovery {newRequests.length - 5 === 1 ? "request" : "requests"} →
                </Link>
              </li>
            )}
            {unread.map(({ client, unread: n }) => (
              <li key={`msg-${client.id}`} className="ov-task">
                <span className="ov-task-icon" aria-hidden>
                  <TabIcon name="messages" />
                </span>
                <div className="ov-task-body">
                  <p className="ov-task-title">
                    <Link href={`/admin/clients/${client.id}#messages`} className="pt-table-title">
                      {client.fullName}
                    </Link>{" "}
                    sent {n === 1 ? "a message" : `${n} messages`}
                  </p>
                </div>
                <Link href={`/admin/clients/${client.id}#messages`} className="pt-btn pt-btn-secondary">
                  Reply
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="ov-grid">
        <section className="pt-card">
          <div className="pt-card-head">
            <h2>Coming up</h2>
            <Link href="/admin/calendar" className="pt-link pt-small">
              Calendar →
            </Link>
          </div>
          {agenda.length === 0 ? (
            <p className="ov-empty">Nothing booked in the next 7 days.</p>
          ) : (
            <ol className="ov-agenda">
              {agenda.map(({ date, items }) => (
                <li key={date}>
                  <h3 className="ov-agenda-day">{dayLabel(items[0].start, now)}</h3>
                  <ul>
                    {items.map((item) => {
                      const live = item.start.getTime() - 15 * 60_000 <= now.getTime() && item.end.getTime() > now.getTime();
                      return (
                        <li key={`${item.kind}-${item.id}`} className="ov-agenda-item" style={{ ["--dot" as string]: item.colour }}>
                          <span className="ov-agenda-time">{formatTime(item.start)}</span>
                          <Link href={item.href} className="ov-agenda-body">
                            <span className="ov-agenda-title">{item.title}</span>
                            <span className="pt-muted pt-small">{item.who}</span>
                          </Link>
                          {item.status && <span className={`pt-badge is-${item.status.tone}`}>{item.status.label}</span>}
                          {live && item.joinUrl && (
                            <a href={item.joinUrl} className="pt-btn pt-btn-primary ov-join" target="_blank" rel="noopener noreferrer">
                              Join
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="ov-side">
          <section className="pt-card">
            <div className="pt-card-head">
              <h2>Workshop dates</h2>
              <Link href="/admin/workshops" className="pt-link pt-small">
                All →
              </Link>
            </div>
            {workshops.length === 0 ? (
              <p className="ov-empty">No upcoming dates on sale.</p>
            ) : (
              <ul className="ov-workshops">
                {workshops.slice(0, 4).map((w) => {
                  const pct = w.capacity ? Math.min(100, Math.round((w.seatsTaken / w.capacity) * 100)) : null;
                  return (
                    <li key={w.id}>
                      <Link href={`/admin/workshops/dates/${w.id}`} className="ov-workshop">
                        <span className="ov-workshop-top">
                          <span className="ov-agenda-title">{w.name}</span>
                          <span className="pt-muted pt-small">
                            {w.seatsTaken}
                            {w.capacity != null ? ` / ${w.capacity}` : ""} booked
                          </span>
                        </span>
                        <span className="pt-muted pt-small">{w.startsAt ? formatDateTime(w.startsAt) : "No date"}</span>
                        {pct != null && (
                          <span className="ov-meter" aria-hidden>
                            <span style={{ width: `${pct}%` }} className={pct >= 100 ? "is-full" : ""} />
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="pt-card">
            <div className="pt-card-head">
              <h2>Quick links</h2>
            </div>
            <ul className="ov-quick">
              <li>
                <Link href="/admin/clients">Add a client</Link>
              </li>
              <li>
                <Link href="/admin/resources">Share a resource</Link>
              </li>
              <li>
                <Link href="/admin/scheduling/availability">Update availability</Link>
              </li>
              <li>
                <Link href="/workshop" target="_blank">
                  View the workshops page ↗
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
