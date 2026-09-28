import Link from "next/link";
import { inArray } from "drizzle-orm";
import { AutoRefresh } from "@/components/portal/AutoRefresh";
import { waitingNow } from "@/lib/attendance";
import { getDb } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import { jaasEnabled } from "@/lib/jaas";

/** "Tara is waiting in your call — Join now", kept fresh while the page is open. */
export function WaitingBanner() {
  if (!jaasEnabled()) return null;
  const waiting = waitingNow();
  const titles = new Map(
    waiting.length
      ? getDb()
          .select({ id: coachingSessions.id, title: coachingSessions.title })
          .from(coachingSessions)
          .where(inArray(coachingSessions.id, waiting.map((w) => w.appointmentId)))
          .all()
          .map((r) => [r.id, r.title] as const)
      : [],
  );
  return (
    <>
      <AutoRefresh seconds={30} />
      {waiting.map((w) => (
        <div key={w.appointmentId} role="alert" className="pt-alert is-ok wb">
          <p>
            <strong>{w.names.join(", ")}</strong> {w.names.length === 1 ? "is" : "are"} waiting in your{" "}
            {(titles.get(w.appointmentId) ?? "call").toLowerCase()}.
          </p>
          <Link href={`/meet/host/a/${w.appointmentId}`} className="pt-btn pt-btn-primary">
            Join now
          </Link>
        </div>
      ))}
    </>
  );
}
