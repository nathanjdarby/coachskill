import Link from "next/link";
import { notFound } from "next/navigation";
import { PackagesCard } from "@/components/portal/PackagesCard";
import { EnquiryAnswers } from "@/components/EnquiryAnswers";
import { WorkshopCard, type PortalBooking } from "@/components/portal/WorkshopCard";
import { workshopBookingsFor } from "@/lib/attendees";
import { workshopJoinUrl } from "@/lib/workshop-invite";
import { requireClient } from "@/lib/dal";
import { balancePayUrl } from "@/lib/payments/workshop";
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

  const bookingRows = await workshopBookingsFor(data.client);
  const bookings: PortalBooking[] = await Promise.all(
    bookingRows.map(async ({ signup, workshop }) => {
      const past = workshop.startsAt ? workshop.startsAt.getTime() < data.now : false;
      return {
        id: signup.id,
        workshopName: workshop.name,
        startsAt: workshop.startsAt,
        location: workshop.location,
        balancePence: workshop.balancePence,
        amountPaidPence: signup.amountPaidPence,
        balancePaidAt: signup.balancePaidAt,
        payUrl: !past && !signup.balancePaidAt && workshop.balancePence > 0 ? await balancePayUrl(signup.id) : null,
        joinUrl: past ? null : workshopJoinUrl(workshop),
        past,
      };
    }),
  );
  // Workshop attendees without coaching yet see a simpler home: workshop, messages, and what's next.
  const attendeeOnly = data.client.kind === "attendee" && data.sessions.length === 0 && balances.length === 0;

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <p className="eyebrow">Your client area</p>
        <h1>Welcome, {firstName}</h1>
        <p className="pt-muted">
          {attendeeOnly
            ? "Your workshop, materials from Monika and messages, in one place."
            : "Everything about our work together, in one place."}
        </p>
      </div>

      <WorkshopCard bookings={bookings} />

      <div className="pt-columns">
        {!attendeeOnly && (
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
        )}

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

      {(!attendeeOnly || latest) && (
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
      )}

      {(!attendeeOnly || data.discovery) && (
        <section className="pt-card">
          <h2>{data.discovery ? "What you told us" : "Your goals"}</h2>
          {data.discovery ? (
            <dl className="pt-dl pt-dl-stacked">
              <EnquiryAnswers enquiry={data.discovery} />
            </dl>
          ) : (
            <p className="pt-muted">We&apos;ll capture your goals together in our first session.</p>
          )}
        </section>
      )}
    </div>
  );
}
