import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { MeetingRoom } from "@/components/MeetingRoom";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { workshops } from "@/lib/db/schema";
import { roomNameFrom, roomSetup } from "@/lib/jaas";
import { hostTokenExpiry, usesInAppRoom } from "@/lib/join";
import { personalJoinUrl, workshopJoinUrl } from "@/lib/meeting";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Workshop call | Coach Skill admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Monika hosting a workshop in the in-app room. */
export default async function HostWorkshopRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const w = getDb().select().from(workshops).where(eq(workshops.id, id)).get();
  if (!w || !w.startsAt) notFound();
  const url = workshopJoinUrl(w);
  if (!usesInAppRoom(url)) redirect(personalJoinUrl(url, { name: admin.name, subject: w.name }) ?? "/admin/workshops");

  const setup = roomSetup({
    room: roomNameFrom(url)!,
    user: { id: `admin-${admin.id}`, name: admin.name, email: admin.email },
    moderator: true,
    expiresAt: hostTokenExpiry(new Date(w.startsAt.getTime() + w.durationMinutes * 60_000)),
  });
  return (
    <MeetingRoom
      setup={setup}
      displayName={admin.name}
      subject={w.name}
      title={w.name}
      whenLabel={`${formatDateTime(w.startsAt)} (UK) · ${w.durationMinutes} min`}
      backHref="/admin/workshops"
      presence={{ target: "w", id: w.id }}
    />
  );
}
