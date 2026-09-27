import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { bookFromLink } from "@/app/actions/appointments";
import { AuthShell } from "@/components/auth/AuthShell";
import { BookingPicker } from "@/components/portal/BookingPicker";
import { bookingLinkByToken, bookingLinkState, manageUrl } from "@/lib/appointments";
import { availableSlots, groupSlotsByDay } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import { durationFor } from "@/lib/event-types";

export const metadata: Metadata = {
  title: "Book a time | Coach Skill",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function BookPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = bookingLinkByToken(token);
  if (!found) {
    return (
      <AuthShell title="This link isn't valid" subtitle="Check you've copied the whole link from your email.">
        <p className="pt-muted">If it still doesn&apos;t work, reply to Monika&apos;s email and she&apos;ll send you a new one.</p>
      </AuthShell>
    );
  }

  const { link, type } = found;
  const state = bookingLinkState(link);
  if (state === "used") {
    const appt = link.appointmentId
      ? getDb().select().from(coachingSessions).where(eq(coachingSessions.id, link.appointmentId)).get()
      : null;
    if (appt) redirect(new URL(await manageUrl(appt)).pathname);
  }
  if (state !== "open") {
    return (
      <AuthShell
        title={state === "used" ? "This link has been used" : "This link has expired"}
        subtitle="Booking links work once and only for a while."
      >
        <p className="pt-muted">Reply to Monika&apos;s email and she&apos;ll find a time with you.</p>
      </AuthShell>
    );
  }

  const duration = durationFor(type);
  const days = groupSlotsByDay(availableSlots(duration, { bufferMinutes: type.bufferMinutes }));
  const firstName = link.inviteeName.split(/\s+/)[0];
  return (
    <AuthShell
      wide
      title={`Book your ${type.name.toLowerCase()}`}
      subtitle={`Hi ${firstName}, pick a time that suits you. It's a ${duration}-minute video call with Monika; you'll get the link by email as soon as you've booked.`}
    >
      <BookingPicker days={days} action={bookFromLink.bind(null, token)} submitLabel="Book" />
    </AuthShell>
  );
}
