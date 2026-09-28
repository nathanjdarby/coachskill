import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AuthShell } from "@/components/auth/AuthShell";
import { MeetingRoom } from "@/components/MeetingRoom";
import { getDb } from "@/lib/db";
import { signups, workshops } from "@/lib/db/schema";
import { roomNameFrom, roomSetup } from "@/lib/jaas";
import { guestRoomWindow, usesInAppRoom, verifyAttendeeToken } from "@/lib/join";
import { personalJoinUrl, workshopJoinUrl } from "@/lib/meeting";
import { SEAT_STATUSES } from "@/lib/signup-status";
import { formatDateTime, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Workshop | Coach Skill", referrer: "no-referrer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The in-app workshop call for someone holding a place, opened from their signed link. */
export default async function AttendeeRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const signupId = verifyAttendeeToken(token);
  const row = signupId
    ? getDb()
        .select({ signup: signups, workshop: workshops })
        .from(signups)
        .innerJoin(workshops, eq(signups.workshopId, workshops.id))
        .where(eq(signups.id, signupId))
        .get()
    : undefined;
  const holdsPlace =
    row && row.signup.depositPaidAt && (SEAT_STATUSES as readonly string[]).includes(row.signup.status) && row.workshop.startsAt;
  if (!row || !holdsPlace) {
    return (
      <AuthShell title="This link isn't valid" subtitle="It may be for a booking that has changed.">
        <p className="pt-muted">Reply to your booking email and Monika will sort it out.</p>
      </AuthShell>
    );
  }
  const { signup, workshop: w } = row;
  const url = workshopJoinUrl(w);
  if (!usesInAppRoom(url)) redirect(personalJoinUrl(url, { name: signup.name, subject: w.name }) ?? "/portal");

  const room = guestRoomWindow(w.startsAt!, w.durationMinutes);
  if (room.state !== "open") {
    return (
      <AuthShell
        title={room.state === "early" ? `The workshop opens at ${formatTime(room.opensAt)}` : "This workshop has ended"}
        subtitle={`${w.name} · ${formatDateTime(w.startsAt!)} (UK time)`}
      >
        {room.state === "early" && (
          <p className="pt-muted">
            Come back to this link up to 15 minutes before the start.{" "}
            <Link href="/check-setup" className="pt-link">
              Check your camera and mic
            </Link>{" "}
            in the meantime.
          </p>
        )}
      </AuthShell>
    );
  }

  const setup = roomSetup({
    room: roomNameFrom(url)!,
    user: { id: `signup-${signup.id}`, name: signup.name, email: signup.email },
    moderator: false,
    expiresAt: room.closesAt,
  });
  return (
    <MeetingRoom
      setup={setup}
      displayName={signup.name}
      subject={w.name}
      title={w.name}
      whenLabel={`${formatDateTime(w.startsAt!)} (UK) · ${w.durationMinutes} min`}
      backHref="/portal"
      presence={{ target: "w", token }}
    />
  );
}
