import Link from "next/link";
import { bookSession } from "@/app/actions/booking";
import { BookingPicker } from "@/components/portal/BookingPicker";
import { JoinButton } from "@/components/JoinButton";
import { DateChip } from "@/components/portal/DateChip";
import { PageHeader } from "@/components/portal/PageHeader";
import { PackagesCard } from "@/components/portal/PackagesCard";
import { SessionActions } from "@/components/portal/SessionActions";
import { availableSlots, canClientChange, getBookingSettings, groupSlotsByDay } from "@/lib/booking";
import { requireClient } from "@/lib/dal";
import { COACHING_SLUG, durationFor, getEventTypeBySlug } from "@/lib/event-types";
import { guestJoinUrl } from "@/lib/join";
import { activeCredit, listPackages, packageBalances } from "@/lib/packages";
import { listSessions, splitSessions } from "@/lib/portal";
import { formatDateTime, formatTime } from "@/lib/time";

/** A booking Monika hasn't confirmed yet. */
const isRequest = (s: { awaitingApproval: boolean; approvedAt: Date | null }) => s.awaitingApproval && !s.approvedAt;

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
    <div className="pt-page ov">
      <PageHeader
        eyebrow="Your coaching"
        title="Sessions"
        lead={
          <>
            {upcoming.length ? `${upcoming.length} coming up` : "Nothing booked yet"}
            {past.length ? ` · ${past.length} completed` : ""} · all times are UK time
          </>
        }
        actions={
          <>
            <Link href="/check-setup" className="pt-btn pt-btn-secondary">
              Check camera &amp; mic
            </Link>
            {credit && (
              <a href="#book" className="pt-btn pt-btn-primary">
                Book a session
              </a>
            )}
          </>
        }
      />

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

      <div className="ov-grid">
        <section className="pt-card">
          <div className="pt-card-head">
            <h2>Upcoming</h2>
            {upcoming.length > 0 && <span className="pt-muted pt-small">{upcoming.length}</span>}
          </div>
          {upcoming.length === 0 ? (
            <p className="ov-empty">
              {credit ? "No sessions booked yet — choose a time below." : "No sessions booked yet. Monika will add your next one here."}
            </p>
          ) : (
            <ul className="pc-sessions">
              {upcoming.map((s, i) => (
                <li key={s.id} className={`pc-session ${i === 0 ? "is-next" : ""}`}>
                  <DateChip date={s.startsAt} />
                  <div className="pc-session-body">
                    <p className="pt-session-title">
                      {s.title} {i === 0 && <span className="pt-badge is-accent">Next</span>}{" "}
                      {isRequest(s) && <span className="pt-badge is-warn">Awaiting confirmation</span>}
                    </p>
                    <p className="pt-muted pt-small">
                      {formatTime(s.startsAt)} · {s.durationMinutes} min
                      {s.locationMode === "phone" && " · Phone call — Monika will ring you"}
                    </p>
                    {isRequest(s) && (
                      <p className="pt-muted pt-small">Monika will confirm this shortly — you&apos;ll get the joining details by email.</p>
                    )}
                    <div className="pc-session-actions">
                      {s.meetingUrl && !isRequest(s) && (
                        <JoinButton
                          url={joinUrls.get(s.id)!}
                          startsAt={s.startsAt}
                          durationMinutes={s.durationMinutes}
                          className="pt-btn pt-btn-secondary"
                        />
                      )}
                      <SessionActions
                        sessionId={s.id}
                        showCalendar={!isRequest(s)}
                        cancelConfirm={isRequest(s) ? "Withdraw this request? The session goes back into your package." : undefined}
                        canChange={changeable.get(s.id) != null}
                        cutoffHours={settings.cancelCutoffHours}
                        rescheduleDays={changeable.get(s.id) ?? []}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="ov-side">
          <PackagesCard balances={balances} offers={offers} />
          {!credit && balances.length === 0 && offers.length === 0 && (
            <section className="pt-card">
              <h2>Your package</h2>
              <p className="ov-empty">Monika books your sessions for you — message her any time.</p>
            </section>
          )}
        </div>
      </div>

      {credit && (
        <section className="pt-card" id="book">
          <div className="pt-card-head">
            <h2>Book a session</h2>
            <span className="pt-muted pt-small">
              {bookMinutes} min · {credit.remaining} {credit.remaining === 1 ? "session" : "sessions"} left
            </span>
          </div>
          <p className="pt-muted pt-small pt-card-sub">Pick a day and time. Monika confirms each booking — you&apos;ll get the calendar invite once she has.</p>
          <BookingPicker days={bookDays} action={bookSession} submitLabel="Request this time" />
        </section>
      )}

      {past.length > 0 && (
        <details className="pt-card pt-details">
          <summary>
            <span className="pt-details-title">Past sessions</span>
            <span className="pt-muted pt-small">{past.length} completed</span>
          </summary>
          <div className="pt-details-body">
            <ul className="pc-sessions">
              {past.map((s) => (
                <li key={s.id} className="pc-session is-past">
                  <DateChip date={s.startsAt} muted />
                  <div className="pc-session-body">
                    <p className="pt-session-title">{s.title}</p>
                    <p className="pt-muted pt-small">
                      {formatDateTime(s.startsAt)} · {s.durationMinutes} min
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
