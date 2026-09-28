import Link from "next/link";
import { bookSession } from "@/app/actions/booking";
import { BookingPicker } from "@/components/portal/BookingPicker";
import { JoinButton } from "@/components/JoinButton";
import { PackagesCard } from "@/components/portal/PackagesCard";
import { SessionActions } from "@/components/portal/SessionActions";
import { availableSlots, canClientChange, getBookingSettings, groupSlotsByDay } from "@/lib/booking";
import { requireClient } from "@/lib/dal";
import { COACHING_SLUG, durationFor, getEventTypeBySlug } from "@/lib/event-types";
import { guestJoinUrl } from "@/lib/join";
import { activeCredit, listPackages, packageBalances } from "@/lib/packages";
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
  const settings = getBookingSettings();
  const credit = activeCredit(balances);
  const coachingType = getEventTypeBySlug(COACHING_SLUG);
  const bookMinutes = credit ? durationFor(coachingType, credit.sessionMinutes) : 0;
  const bookDays = credit ? groupSlotsByDay(availableSlots(bookMinutes, { bufferMinutes: coachingType?.bufferMinutes })) : [];
  const joinUrls = new Map(await Promise.all(upcoming.map(async (s) => [s.id, await guestJoinUrl(s, user.name)] as const)));
  const changeable = new Map(
    upcoming.map((s) => [
      s.id,
      canClientChange(s.startsAt, settings)
        ? groupSlotsByDay(availableSlots(s.durationMinutes, { excludeSessionId: s.id }))
        : null,
    ]),
  );

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Sessions</h1>
        <p className="pt-muted">
          All times are UK time.{" "}
          <Link href="/check-setup" className="pt-link">
            Check your camera &amp; mic
          </Link>
        </p>
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

      {credit && (
        <section className="pt-card" id="book">
          <h2>Book a session</h2>
          <p className="pt-muted pt-small pt-card-sub">
            {bookMinutes} minutes · uses 1 of your {credit.remaining} remaining {credit.remaining === 1 ? "session" : "sessions"}
          </p>
          <BookingPicker days={bookDays} action={bookSession} submitLabel="Book" />
        </section>
      )}

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
                    {s.locationMode === "phone" && " · Phone call — Monika will ring you"}
                  </p>
                </div>
                {s.meetingUrl && (
                  <JoinButton
                    url={joinUrls.get(s.id)!}
                    startsAt={s.startsAt}
                    durationMinutes={s.durationMinutes}
                    className="pt-btn pt-btn-secondary"
                  />
                )}
                <SessionActions
                  sessionId={s.id}
                  canChange={changeable.get(s.id) != null}
                  cutoffHours={settings.cancelCutoffHours}
                  rescheduleDays={changeable.get(s.id) ?? []}
                />
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
