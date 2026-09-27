import Link from "next/link";
import { notFound } from "next/navigation";
import { PackagesCard } from "@/components/portal/PackagesCard";
import { requireClient } from "@/lib/dal";
import { listPackages, packageBalances } from "@/lib/packages";
import { getPortalData, splitSessions } from "@/lib/portal";
import { formatDate, formatDateTime } from "@/lib/time";

export default async function PortalHomePage() {
  const user = await requireClient();
  const [data, balances, offers] = await Promise.all([
    getPortalData(user.clientId),
    packageBalances(user.clientId),
    listPackages({ activeOnly: true }),
  ]);
  if (!data) notFound();

  const { upcoming } = splitSessions(data.sessions);
  const next = upcoming[0];
  const latest = data.updates[0];
  const firstName = user.name.split(/\s+/)[0];

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <p className="eyebrow">Your client area</p>
        <h1>Welcome, {firstName}</h1>
        <p className="pt-muted">Everything about our work together, in one place.</p>
      </div>

      <div className="pt-columns">
        <section className="pt-card pt-highlight">
          <h2>Next session</h2>
          {next ? (
            <>
              <p className="pt-session-title">{next.title}</p>
              <p className="pt-muted">
                {formatDateTime(next.startsAt)} (UK time) · {next.durationMinutes} min
              </p>
              {next.meetingUrl && (
                <a href={next.meetingUrl} className="pt-btn pt-btn-primary pt-mt" target="_blank" rel="noreferrer">
                  Join meeting
                </a>
              )}
            </>
          ) : (
            <p className="pt-muted">Nothing booked yet — Monika will add your next session here.</p>
          )}
          <Link href="/portal/sessions" className="pt-link pt-small pt-card-foot">
            All sessions →
          </Link>
        </section>

        <section className="pt-card">
          <h2>Messages</h2>
          <p className="pt-muted">
            {data.unreadMessages > 0
              ? `You have ${data.unreadMessages} new message${data.unreadMessages === 1 ? "" : "s"}.`
              : "Questions between sessions? Send Monika a message any time."}
          </p>
          <Link href="/portal/messages" className="pt-btn pt-btn-secondary pt-mt">
            {data.unreadMessages > 0 ? "Read messages" : "Send a message"}
          </Link>
        </section>
      </div>

      <PackagesCard balances={balances} offers={offers} />

      <section className="pt-card">
        <div className="pt-card-head">
          <h2>Latest update</h2>
          {data.updates.length > 1 && (
            <Link href="/portal/updates" className="pt-link pt-small">
              All updates →
            </Link>
          )}
        </div>
        {latest ? (
          <>
            <p className="pt-muted pt-small">
              {latest.authorName} · {formatDate(latest.note.createdAt)}
            </p>
            <p className="pt-prewrap pt-mt-sm">{latest.note.body}</p>
          </>
        ) : (
          <p className="pt-muted">Session recaps and action points from Monika will appear here.</p>
        )}
      </section>

      <section className="pt-card">
        <h2>Your goals</h2>
        {data.discovery ? (
          <dl className="pt-dl pt-dl-stacked">
            <dt>Main goal for the next 6 months</dt>
            <dd>{data.discovery.goal}</dd>
            <dt>What&apos;s been holding you back</dt>
            <dd>{data.discovery.challenges}</dd>
            {data.discovery.anythingElse && (
              <>
                <dt>Other things you shared</dt>
                <dd>{data.discovery.anythingElse}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="pt-muted">We&apos;ll capture your goals together in our first session.</p>
        )}
      </section>
    </div>
  );
}
