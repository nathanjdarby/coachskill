import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AuthShell } from "@/components/auth/AuthShell";
import { MeetingRoom } from "@/components/MeetingRoom";
import { appointmentByToken } from "@/lib/appointments";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { roomNameFrom, roomSetup } from "@/lib/jaas";
import { guestRoomWindow, usesInAppRoom } from "@/lib/join";
import { personalJoinUrl } from "@/lib/meeting";
import { formatDateTime, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Your call | Coach Skill", referrer: "no-referrer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The in-app call for a client or prospect, opened from their signed link. */
export default async function GuestRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = appointmentByToken(token);
  if (!found) {
    return (
      <AuthShell title="This link isn't valid" subtitle="Check you've copied the whole link from your email.">
        <p className="pt-muted">If it still doesn&apos;t work, reply to your booking email.</p>
      </AuthShell>
    );
  }
  const { appointment: a } = found;
  const manage = `/appointments/${token}`;
  if (a.cancelledAt) {
    return (
      <AuthShell title="This call was cancelled" subtitle={`${a.title} · ${formatDateTime(a.startsAt)} (UK)`}>
        <Link href={manage} className="pt-link">
          View the appointment
        </Link>
      </AuthShell>
    );
  }
  const clientName = a.clientId ? getDb().select({ name: clients.fullName }).from(clients).where(eq(clients.id, a.clientId)).get()?.name : null;
  const name = clientName ?? a.inviteeName ?? "Guest";
  // Zoom/Teams links, or before the in-app room is switched on: go straight to the link.
  if (!usesInAppRoom(a.meetingUrl)) redirect(personalJoinUrl(a.meetingUrl, { name, subject: a.title }) ?? manage);

  const room = guestRoomWindow(a.startsAt, a.durationMinutes);
  if (room.state !== "open") {
    return (
      <AuthShell
        title={room.state === "early" ? `Your call opens at ${formatTime(room.opensAt)}` : "This call has ended"}
        subtitle={`${a.title} · ${formatDateTime(a.startsAt)} (UK time)`}
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
        <Link href={manage} className="pt-link">
          View the appointment
        </Link>
      </AuthShell>
    );
  }

  const setup = roomSetup({
    room: roomNameFrom(a.meetingUrl)!,
    user: { id: `appointment-${a.id}-guest`, name, email: a.inviteeEmail },
    moderator: false,
    expiresAt: room.closesAt,
  });
  return (
    <MeetingRoom
      setup={setup}
      displayName={name}
      subject={a.title}
      title={`${a.title} with Monika`}
      whenLabel={`${formatDateTime(a.startsAt)} (UK) · ${a.durationMinutes} min`}
      backHref={manage}
      presence={{ target: "a", token }}
    />
  );
}
