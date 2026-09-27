import { formatPence } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/time";

export type PortalBooking = {
  id: number;
  workshopName: string;
  startsAt: Date | null;
  location: string | null;
  balancePence: number;
  amountPaidPence: number;
  balancePaidAt: Date | null;
  /** Link to pay the balance, when there's one to pay. */
  payUrl: string | null;
  past: boolean;
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** The client's workshop booking(s): when and where, and what's left to pay. */
export function WorkshopCard({ bookings }: { bookings: PortalBooking[] }) {
  if (bookings.length === 0) return null;
  return (
    <section className="pt-card pt-highlight">
      <h2>{bookings.length === 1 ? "Your workshop" : "Your workshops"}</h2>
      <ul className="pt-bookings">
        {bookings.map((b) => (
          <li key={b.id}>
            <p className="pt-session-title">{b.workshopName}</p>
            <p className="pt-muted">
              {b.startsAt ? `${formatDateTime(b.startsAt)} (UK time)` : "Date to be confirmed"}
              {b.location ? ` · ${b.location}` : ""}
            </p>
            {b.past ? (
              <span className="pt-badge">Attended</span>
            ) : b.balancePaidAt ? (
              <span className="pt-badge is-ok">Fully paid — see you there</span>
            ) : (
              <div className="pt-booking-due">
                <p className="pt-small">
                  Deposit paid ({formatPence(b.amountPaidPence)}). Balance of {formatPence(b.balancePence)}
                  {b.startsAt ? ` due by ${formatDate(new Date(b.startsAt.getTime() - WEEK))}` : " due a week before"}.
                </p>
                {b.payUrl && (
                  <a href={b.payUrl} className="pt-btn pt-btn-primary">
                    Pay {formatPence(b.balancePence)} balance
                  </a>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
