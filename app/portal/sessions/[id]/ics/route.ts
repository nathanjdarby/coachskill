import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { currentUser } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import { buildIcs } from "@/lib/ics";
import { guestJoinUrl } from "@/lib/join";
import { callPhone } from "@/lib/meeting";

/** "Add to calendar": the client's own session as an .ics file. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== "client" || !user.clientId) return new NextResponse("Not found", { status: 404 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Not found", { status: 404 });

  const [session] = await getDb()
    .select()
    .from(coachingSessions)
    .where(and(eq(coachingSessions.id, id), eq(coachingSessions.clientId, user.clientId)))
    .limit(1);
  // No calendar entry until Monika has confirmed the booking.
  if (!session || (session.awaitingApproval && !session.approvedAt)) return new NextResponse("Not found", { status: 404 });

  const ics = buildIcs({
    sessionId: session.id,
    sequence: session.icsSequence,
    method: session.cancelledAt ? "CANCEL" : "REQUEST",
    start: session.startsAt,
    durationMinutes: session.durationMinutes,
    title: `${session.title} with Monika`,
    url: await guestJoinUrl(session, null),
    location: callPhone(session) ? `Phone call — Monika will ring ${callPhone(session)}` : null,
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="coach-skill-session-${session.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
