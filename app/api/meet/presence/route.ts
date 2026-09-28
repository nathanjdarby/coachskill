import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { appointmentByToken } from "@/lib/appointments";
import { recordPresence } from "@/lib/attendance";
import { currentUser } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { signups, workshops } from "@/lib/db/schema";
import { verifyAttendeeToken } from "@/lib/join";
import { clientIp, rateLimit } from "@/lib/spam";

export const dynamic = "force-dynamic";

const EVENTS = ["join", "beat", "leave"] as const;

/**
 * Join / heartbeat / leave reports from the in-app room. Guests prove who they are
 * with the signed link they opened; hosts with their admin session.
 */
export async function POST(request: NextRequest) {
  if (!rateLimit(`presence:${clientIp(request.headers)}`, 120, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  let body: { target?: unknown; token?: unknown; id?: unknown; event?: unknown; sessionKey?: unknown; name?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const event = EVENTS.find((e) => e === body.event);
  const sessionKey = typeof body.sessionKey === "string" && /^[0-9a-f-]{36}$/i.test(body.sessionKey) ? body.sessionKey : null;
  if (!event || !sessionKey) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  // Monika (or another admin) as host.
  if (typeof body.id === "number") {
    const user = await currentUser();
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const target = body.target === "w" ? { workshopId: body.id } : { appointmentId: body.id };
    await recordPresence({ target, role: "host", name: user.name, sessionKey, event });
    return NextResponse.json({ ok: true });
  }

  // Guests.
  if (typeof body.token !== "string") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (body.target === "a") {
    const found = appointmentByToken(body.token);
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : (found.appointment.inviteeName ?? "Guest");
    await recordPresence({ target: { appointmentId: found.appointment.id }, role: "guest", name, sessionKey, event });
    return NextResponse.json({ ok: true });
  }
  if (body.target === "w") {
    const signupId = verifyAttendeeToken(body.token);
    const row = signupId
      ? getDb()
          .select({ signup: signups, workshop: workshops })
          .from(signups)
          .innerJoin(workshops, eq(signups.workshopId, workshops.id))
          .where(eq(signups.id, signupId))
          .get()
      : undefined;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await recordPresence({
      target: { workshopId: row.workshop.id, signupId: row.signup.id },
      role: "guest",
      name: row.signup.name,
      sessionKey,
      event,
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
