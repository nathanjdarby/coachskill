import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { SessionNotes } from "@/components/admin/SessionNotes";
import { MeetingRoom } from "@/components/MeetingRoom";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { clients, coachingSessions } from "@/lib/db/schema";
import { roomNameFrom, roomSetup } from "@/lib/jaas";
import { hostTokenExpiry, usesInAppRoom } from "@/lib/join";
import { personalJoinUrl } from "@/lib/meeting";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Call | Coach Skill admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Monika's side of an in-app call: she's the host, with her notes beside the call. */
export default async function HostRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const row = getDb()
    .select({ a: coachingSessions, clientName: clients.fullName })
    .from(coachingSessions)
    .leftJoin(clients, eq(coachingSessions.clientId, clients.id))
    .where(eq(coachingSessions.id, id))
    .get();
  if (!row) notFound();
  const { a } = row;
  if (!usesInAppRoom(a.meetingUrl)) redirect(personalJoinUrl(a.meetingUrl, { name: admin.name, subject: a.title }) ?? `/admin/sessions/${id}`);

  const who = row.clientName ?? a.inviteeName ?? a.inviteeEmail ?? "Guest";
  const setup = roomSetup({
    room: roomNameFrom(a.meetingUrl)!,
    user: { id: `admin-${admin.id}`, name: admin.name, email: admin.email },
    moderator: true,
    expiresAt: hostTokenExpiry(new Date(a.startsAt.getTime() + a.durationMinutes * 60_000)),
  });
  return (
    <MeetingRoom
      setup={setup}
      displayName={admin.name}
      subject={a.title}
      title={`${a.title} · ${who}`}
      whenLabel={`${formatDateTime(a.startsAt)} (UK) · ${a.durationMinutes} min`}
      backHref={`/admin/sessions/${a.id}`}
      presence={{ target: "a", id: a.id }}
      notes={
        <SessionNotes
          appointmentId={a.id}
          firstName={who.split(/\s+/)[0]}
          initialNotes={a.notes ?? ""}
          initialRecap={a.recap ?? ""}
          followUpSent={Boolean(a.followUpSentAt)}
          preview={null}
        />
      }
    />
  );
}
