import Link from "next/link";
import { AddCalendarForm, CalendarSourceCard, FeedLink } from "@/components/admin/CalendarConnections";
import { feedUrl } from "@/lib/calendar-feed";
import { listCalendarSources, maskCalendarUrl } from "@/lib/calendar-sync";
import { requireAdmin } from "@/lib/dal";

export default async function ConnectionsPage() {
  await requireAdmin();
  const sources = listCalendarSources();
  const feed = await feedUrl();

  return (
    <div className="pt-page pt-narrow">
      <Link href="/admin/scheduling" className="pt-link pt-small">
        ← Scheduling
      </Link>
      <div className="pt-page-head">
        <h1>Calendar sync</h1>
        <p className="pt-muted">
          Keep Coach Skill and your own calendar in step, both ways. Only busy times are read from your calendar — never
          what the events are.
        </p>
      </div>

      <section className="pt-card">
        <h2>Block busy times from your calendar</h2>
        <p className="pt-muted pt-small pt-card-sub">
          When you&apos;re busy in your own calendar, those times can&apos;t be booked here. Checked about every 15 minutes.
        </p>
        {sources.length > 0 && (
          <ul className="cs-sources">
            {sources.map((s) => (
              <CalendarSourceCard
                key={s.id}
                source={{
                  id: s.id,
                  label: s.label,
                  maskedUrl: maskCalendarUrl(s.url),
                  active: s.active,
                  blockAllDay: s.blockAllDay,
                  lastSuccessAt: s.lastSuccessAt,
                  lastError: s.lastError,
                  busyCount: s.busyCount,
                }}
              />
            ))}
          </ul>
        )}
        <details className="pt-inline-details" open={sources.length === 0}>
          <summary className="pt-link">{sources.length ? "Connect another calendar" : "Connect a calendar"}</summary>
          <div className="cs-help">
            <p className="pt-small">
              <strong>Google Calendar</strong> (on a computer): Settings → click your calendar on the left → Integrate
              calendar → copy <em>Secret address in iCal format</em>. Google can take a few hours to show new events at
              this address.
            </p>
            <p className="pt-small">
              <strong>Outlook / Microsoft 365</strong>: Settings → Calendar → Shared calendars → Publish a calendar →
              choose <em>Can view when I&apos;m busy</em> → Publish → copy the ICS link.
            </p>
            <p className="pt-small">
              <strong>Apple iCloud</strong>: in the Calendar app, share the calendar as a <em>Public Calendar</em> and
              copy the link. Anyone with that link can see the calendar, so use one without private details.
            </p>
          </div>
          <AddCalendarForm />
        </details>
      </section>

      <section className="pt-card">
        <h2>See your bookings in your calendar</h2>
        <p className="pt-muted pt-small pt-card-sub">
          Subscribe to this private address and every session, discovery call and workshop appears in your calendar,
          with join links. Keep it to yourself — anyone with it can see your bookings.
        </p>
        <FeedLink url={feed} />
        <div className="cs-help">
          <p className="pt-small">
            <strong>Google Calendar</strong> (on a computer): Other calendars <em>+</em> → From URL → paste → Add calendar.
          </p>
          <p className="pt-small">
            <strong>Apple Calendar</strong>: File → New Calendar Subscription (on iPhone: Settings → Calendar →
            Accounts → Add Account → Other → Add Subscribed Calendar) → paste.
          </p>
          <p className="pt-small">
            <strong>Outlook</strong>: Add calendar → Subscribe from web → paste.
          </p>
          <p className="pt-muted pt-small">Calendar apps refresh subscriptions on their own schedule — Google can take several hours.</p>
        </div>
      </section>
    </div>
  );
}
