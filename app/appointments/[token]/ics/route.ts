import { NextRequest, NextResponse } from "next/server";
import { appointmentByToken } from "@/lib/appointments";
import { buildIcs } from "@/lib/ics";
import { guestJoinUrl } from "@/lib/join";

/** "Add to calendar" for someone with an appointment link. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const found = appointmentByToken((await params).token);
  if (!found) return new NextResponse("Not found", { status: 404 });
  const { appointment: a } = found;

  const ics = buildIcs({
    sessionId: a.id,
    sequence: a.icsSequence,
    method: a.cancelledAt ? "CANCEL" : "REQUEST",
    start: a.startsAt,
    durationMinutes: a.durationMinutes,
    title: `${a.title} with Monika`,
    url: await guestJoinUrl(a, null),
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="coach-skill-appointment-${a.id}.ics"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
