import type { Metadata } from "next";
import { cancelByToken, rescheduleByToken } from "@/app/actions/appointments";
import { AuthShell } from "@/components/auth/AuthShell";
import { SessionActions } from "@/components/portal/SessionActions";
import { appointmentByToken, isUpcoming } from "@/lib/appointments";
import { availableSlots, canClientChange, getBookingSettings, groupSlotsByDay } from "@/lib/booking";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Your appointment | Coach Skill",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ booked?: string }>;
}) {
  const [{ token }, { booked }] = await Promise.all([params, searchParams]);
  const found = appointmentByToken(token);
  if (!found) {
    return (
      <AuthShell title="This link isn't valid" subtitle="Check you've copied the whole link from your email.">
        <p className="pt-muted">If it still doesn&apos;t work, reply to your booking email.</p>
      </AuthShell>
    );
  }

  const { appointment: a, type } = found;
  const settings = getBookingSettings();
  const upcoming = isUpcoming(a);
  const canChange = upcoming && canClientChange(a.startsAt, settings);
  const rescheduleDays = canChange
    ? groupSlotsByDay(availableSlots(a.durationMinutes, { excludeSessionId: a.id, bufferMinutes: type?.bufferMinutes }))
    : [];
  const firstName = (a.inviteeName ?? "").split(/\s+/)[0];

  return (
    <AuthShell
      wide
      title={a.title}
      subtitle={a.cancelledAt ? "This appointment was cancelled." : upcoming ? `With Monika Kozlowska${firstName ? ` · booked for ${firstName}` : ""}` : "This appointment has passed."}
    >
      {booked && upcoming && (
        <div role="status" className="pt-alert is-ok">
          <p>You&apos;re booked! We&apos;ve emailed you a calendar invite and the video link.</p>
        </div>
      )}
      <dl className="pt-dl pt-appt">
        <dt>When</dt>
        <dd className={a.cancelledAt ? "pt-strike" : undefined}>
          {formatDateTime(a.startsAt)} <span className="pt-muted">(UK time)</span>
        </dd>
        <dt>Length</dt>
        <dd>{a.durationMinutes} minutes</dd>
        {upcoming && (a.meetingUrl || a.locationText) && (
          <>
            <dt>Where</dt>
            <dd>{a.meetingUrl ? "Video call — use the button below" : a.locationText}</dd>
          </>
        )}
      </dl>

      {upcoming && (
        <div className="pt-appt-actions">
          {a.meetingUrl && (
            <a href={a.meetingUrl} className="pt-btn pt-btn-primary" target="_blank" rel="noreferrer">
              Join the call
            </a>
          )}
          {a.meetingUrl && <p className="pt-muted pt-small">If you&apos;re early, you&apos;ll wait in a lobby until Monika lets you in.</p>}
          <SessionActions
            sessionId={a.id}
            canChange={canChange}
            cutoffHours={settings.cancelCutoffHours}
            rescheduleDays={rescheduleDays}
            icsHref={`/appointments/${token}/ics`}
            reschedule={rescheduleByToken.bind(null, token)}
            cancel={cancelByToken.bind(null, token)}
            cancelConfirm="Cancel this appointment? Monika will be told."
            lateNote="reply to your booking email if you need to change it."
          />
        </div>
      )}
    </AuthShell>
  );
}
