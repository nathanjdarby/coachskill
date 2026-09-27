import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { workshopBookingsFor } from "@/lib/attendees";
import { currentUser } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { workshopIcs } from "@/lib/workshop-invite";

/** "Add to calendar" for one of the client's own workshop bookings. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ signupId: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== "client" || !user.clientId) return new NextResponse("Not found", { status: 404 });
  const signupId = Number((await params).signupId);
  const client = getDb().select().from(clients).where(eq(clients.id, user.clientId)).get();
  if (!client || !Number.isInteger(signupId)) return new NextResponse("Not found", { status: 404 });

  // Only bookings that show in their client area (same matching as the portal).
  const booking = (await workshopBookingsFor(client)).find((b) => b.signup.id === signupId);
  if (!booking?.workshop.startsAt) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(workshopIcs(booking.workshop), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="coach-skill-workshop-${booking.workshop.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
