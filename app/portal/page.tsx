import Link from "next/link";
import { notFound } from "next/navigation";
import { PackagesCard } from "@/components/portal/PackagesCard";
import { JoinButton } from "@/components/JoinButton";
import { EnquiryAnswers } from "@/components/EnquiryAnswers";
import { TabIcon, type IconName } from "@/components/portal/TabIcon";
import { WorkshopCard, type PortalBooking } from "@/components/portal/WorkshopCard";
import { workshopBookingsFor } from "@/lib/attendees";
import { attendeeJoinUrl, guestJoinUrl } from "@/lib/join";
import { requireClient } from "@/lib/dal";
import { formatPence } from "@/lib/money";
import { balancePayUrl } from "@/lib/payments/workshop";
import { activeCredit, listPackages, packageBalances } from "@/lib/packages";
import { getPortalData, splitSessions } from "@/lib/portal";
import { listResourcesForClient } from "@/lib/resources";
import { formatDate, formatTime, TIME_ZONE } from "@/lib/time";

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE });
const londonHour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE });
const badgeWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: TIME_ZONE });
const badgeDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: TIME_ZONE });
const badgeMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: TIME_ZONE });
const fullDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE });

function greeting(now: number) {
  const h = Number(londonHour.format(now));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** "in 3 days", "in 2 hours", "in 20 minutes", "now". */
function startsIn(start: Date, now: number) {
  const minutes = Math.round((start.getTime() - now) / 60_000);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `in ${days} ${days === 1 ? "day" : "days"}`;
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

type Task = { key: string; icon: IconName; tone?: "warn"; title: string; detail?: string; href: string; action: string; external?: boolean };

export default async function PortalHomePage() {
  const user = await requireClient();
  const [data, balances, offers, resources] = await Promise.all([
    getPortalData(user.clientId),
    packageBalances(user.clientId),
    listPackages({ activeOnly: true }),
    listResourcesForClient(user.clientId),
  ]);
  if (!data) notFound();

  const { now } = data;
  const { upcoming, past } = splitSessions(data.sessions);
  const next = upcoming[0];
  const nextIsRequest = next ? next.awaitingApproval && !next.approvedAt : false;
  const latest = data.updates[0];
  const firstName = user.name.split(/\s+/)[0];
  const credit = activeCredit(balances);
  const sessionsLeft = balances.reduce((n, b) => n + b.remaining, 0);
  const completed = past.length;

  const bookingRows = await workshopBookingsFor(data.client);
  const bookings: PortalBooking[] = await Promise.all(
    bookingRows.map(async ({ signup, workshop }) => {
      const isPast = workshop.startsAt ? workshop.startsAt.getTime() < now : false;
      return {
        id: signup.id,
        workshopName: workshop.name,
        startsAt: workshop.startsAt,
        location: workshop.location,
        balancePence: workshop.balancePence,
        amountPaidPence: signup.amountPaidPence,
        balancePaidAt: signup.balancePaidAt,
        payUrl: !isPast && !signup.balancePaidAt && workshop.balancePence > 0 ? await balancePayUrl(signup.id) : null,
        joinUrl: isPast ? null : await attendeeJoinUrl(workshop, { id: signup.id, name: user.name }),
        durationMinutes: workshop.durationMinutes,
        past: isPast,
      };
    }),
  );
  // Workshop attendees without coaching yet see a simpler home: workshop, messages, and what's next.
  const attendeeOnly = data.client.kind === "attendee" && data.sessions.length === 0 && balances.length === 0;
  const joinUrl = next?.meetingUrl && !nextIsRequest ? await guestJoinUrl(next, user.name) : null;

  const tasks: Task[] = [
    ...bookings
      .filter((b) => b.payUrl)
      .map((b) => ({
        key: `balance-${b.id}`,
        icon: "workshops" as const,
        tone: "warn" as const,
        title: `Pay the ${formatPence(b.balancePence)} balance for ${b.workshopName}`,
        detail: b.startsAt ? `Due by ${formatDate(new Date(b.startsAt.getTime() - 7 * 24 * 60 * 60 * 1000))}` : undefined,
        href: b.payUrl!,
        action: "Pay now",
        external: true,
      })),
    ...(data.unreadMessages > 0
      ? [
          {
            key: "messages",
            icon: "messages" as const,
            title: `Monika sent you ${data.unreadMessages === 1 ? "a message" : `${data.unreadMessages} messages`}`,
            href: "/portal/messages",
            action: "Read",
          },
        ]
      : []),
    ...(credit && upcoming.length === 0
      ? [
          {
            key: "book",
            icon: "sessions" as const,
            title: "Book your next session",
            detail: `${sessionsLeft} ${sessionsLeft === 1 ? "session" : "sessions"} left in your package`,
            href: "/portal/sessions#book",
            action: "Choose a time",
          },
        ]
      : []),
  ];

  return (
    <div className="pt-page ov">
      <div className="ov-head">
        <div>
          <p className="ov-date">{longDate.format(now)}</p>
          <h1>
            {greeting(now)}, {firstName}
          </h1>
          <p className="pt-muted">
            {attendeeOnly
              ? "Your workshop, materials from Monika and messages, in one place."
              : "Everything about our work together, in one place."}
          </p>
        </div>
        <div className="ov-actions">
          <Link href="/portal/messages" className="pt-btn pt-btn-secondary">
            Message Monika
          </Link>
          {credit && (
            <Link href="/portal/sessions#book" className="pt-btn pt-btn-primary">
              Book a session
            </Link>
          )}
        </div>
      </div>

      {!attendeeOnly && (
        <section className="pc-next">
          {next ? (
            <>
              <div className="pc-next-date" aria-hidden>
                <span className="pc-next-weekday">{badgeWeekday.format(next.startsAt)}</span>
                <span className="pc-next-day">{badgeDay.format(next.startsAt)}</span>
                <span className="pc-next-month">{badgeMonth.format(next.startsAt)}</span>
              </div>
              <div className="pc-next-body">
                <p className="pc-next-label">
                  Your next session · {startsIn(next.startsAt, now)}
                  {nextIsRequest && <span className="pt-badge is-warn">Awaiting confirmation</span>}
                </p>
                <h2>{next.title}</h2>
                <p className="pt-muted">
                  {fullDay.format(next.startsAt)} at {formatTime(next.startsAt)} (UK time) · {next.durationMinutes} min
                  {next.locationMode === "phone" && " · Monika will ring you"}
                </p>
                {nextIsRequest && (
                  <p className="pt-muted pt-small">Monika will confirm shortly — you&apos;ll get the joining details by email.</p>
                )}
                <div className="pc-next-actions">
                  {joinUrl && (
                    <JoinButton url={joinUrl} startsAt={next.startsAt} durationMinutes={next.durationMinutes} label="Join meeting" />
                  )}
                  {!nextIsRequest && (
                    <a href={`/portal/sessions/${next.id}/ics`} className="pt-link pt-small">
                      Add to calendar
                    </a>
                  )}
                  <Link href="/portal/sessions" className="pt-link pt-small">
                    Reschedule or view all →
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="pc-next-body">
              <p className="pc-next-label">Your next session</p>
              <h2>{credit ? "Nothing booked yet" : "No session booked"}</h2>
              <p className="pt-muted">
                {credit
                  ? `You have ${sessionsLeft} ${sessionsLeft === 1 ? "session" : "sessions"} left — pick a time that suits you.`
                  : "Monika will add your next session here, or choose a package below to book one yourself."}
              </p>
              {credit && (
                <div className="pc-next-actions">
                  <Link href="/portal/sessions#book" className="pt-btn pt-btn-primary">
                    Choose a time
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {!attendeeOnly && (
        <div className="ov-stats pc-stats">
          <StatTile
            icon="packages"
            value={sessionsLeft}
            label="Sessions left"
            detail={credit ? credit.name : balances.length ? "Package used up" : "No package yet"}
            href="/portal/sessions"
          />
          <StatTile icon="sessions" value={completed} label="Sessions completed" detail={`${upcoming.length} coming up`} href="/portal/sessions" />
          <StatTile
            icon="messages"
            value={data.unreadMessages}
            label="Unread messages"
            detail={data.unreadMessages ? "From Monika" : "All read"}
            href="/portal/messages"
          />
        </div>
      )}

      {tasks.length > 0 && (
        <section className="pt-card ov-attention has-items">
          <div className="pt-card-head">
            <h2>To do</h2>
            <span className="pt-badge is-warn">{tasks.length}</span>
          </div>
          <ul className="ov-tasks">
            {tasks.map((t) => (
              <li key={t.key} className="ov-task">
                <span className={`ov-task-icon ${t.tone === "warn" ? "is-warn" : ""}`} aria-hidden>
                  <TabIcon name={t.icon} />
                </span>
                <div className="ov-task-body">
                  <p className="ov-task-title">{t.title}</p>
                  {t.detail && <p className="pt-muted pt-small">{t.detail}</p>}
                </div>
                {t.external ? (
                  <a href={t.href} className="pt-btn pt-btn-primary">
                    {t.action}
                  </a>
                ) : (
                  <Link href={t.href} className="pt-btn pt-btn-secondary">
                    {t.action}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <WorkshopCard bookings={bookings} />

      <div className="ov-grid pc-grid">
        {(!attendeeOnly || latest) && (
          <section className="pt-card">
            <div className="pt-card-head">
              <h2>Latest update from Monika</h2>
              {data.updates.length > 1 && (
                <Link href="/portal/updates" className="pt-link pt-small">
                  All updates →
                </Link>
              )}
            </div>
            {latest ? (
              <article className="pc-update">
                <p className="pt-muted pt-small">
                  {latest.authorName} · {formatDate(latest.note.createdAt)}
                </p>
                <p className="pt-prewrap">{latest.note.body}</p>
              </article>
            ) : (
              <p className="ov-empty">Session recaps and action points from Monika will appear here.</p>
            )}
          </section>
        )}

        <section className="pt-card">
          <div className="pt-card-head">
            <h2>Resources</h2>
            {resources.length > 0 && (
              <Link href="/portal/resources" className="pt-link pt-small">
                All →
              </Link>
            )}
          </div>
          {resources.length === 0 ? (
            <p className="ov-empty">Worksheets, slides and links Monika shares will appear here.</p>
          ) : (
            <ul className="pc-resources">
              {resources.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <a href={r.kind === "link" ? r.url! : `/api/resources/${r.id}/file`} target="_blank" rel="noopener noreferrer" className="pc-resource">
                    <span className="ov-task-icon" aria-hidden>
                      <TabIcon name={r.kind === "link" ? "website" : "resources"} />
                    </span>
                    <span className="pc-resource-text">
                      <span className="ov-agenda-title">{r.title}</span>
                      <span className="pt-muted pt-small">
                        {r.kind === "link" ? "Link" : (r.originalName?.split(".").pop()?.toUpperCase() ?? "File")} · {formatDate(r.createdAt)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <PackagesCard balances={balances} offers={offers} />

      {data.discovery && (
        <details className="pt-card pt-details">
          <summary>
            <span className="pt-details-title">What you told us</span>
            <span className="pt-muted pt-small">Your answers from the discovery form</span>
          </summary>
          <div className="pt-details-body">
            <dl className="pt-dl pt-dl-stacked">
              <EnquiryAnswers enquiry={data.discovery} />
            </dl>
          </div>
        </details>
      )}
    </div>
  );
}
