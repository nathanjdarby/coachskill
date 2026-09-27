import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { FollowUpControls, SessionNotes } from "@/components/admin/SessionNotes";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { clients, coachingSessions, eventTypes } from "@/lib/db/schema";
import { FOLLOW_UP_DELAY_MIN, composeFollowUp, endOf } from "@/lib/follow-up";
import { personalJoinUrl } from "@/lib/meeting";
import { formatDateTime } from "@/lib/time";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const row = getDb()
    .select({ a: coachingSessions, typeName: eventTypes.name, colour: eventTypes.colour, clientName: clients.fullName })
    .from(coachingSessions)
    .leftJoin(eventTypes, eq(coachingSessions.eventTypeId, eventTypes.id))
    .leftJoin(clients, eq(coachingSessions.clientId, clients.id))
    .where(eq(coachingSessions.id, id))
    .get();
  if (!row) notFound();

  const { a } = row;
  const who = row.clientName ?? a.inviteeName ?? a.inviteeEmail ?? "—";
  const firstName = who.split(/\s+/)[0];
  const end = endOf(a);
  const composed = a.cancelledAt ? null : await composeFollowUp(a);
  const preview =
    composed && !("error" in composed)
      ? {
          to: composed.email.to,
          subject: `Thanks for today — ${a.title}`,
          greeting: `Thank you, ${composed.email.name.split(/\s+/)[0]}`,
          intro: `Thank you for our ${a.title.toLowerCase()} today.`,
          nextText: composed.email.nextText,
          buttonLabel: composed.email.button?.label ?? null,
        }
      : null;
  const back = a.clientId
    ? { href: `/admin/clients/${a.clientId}#sessions`, label: `← ${who}` }
    : a.discoveryCallId
      ? { href: `/admin/discovery#request-${a.discoveryCallId}`, label: "← Discovery requests" }
      : { href: "/admin/calendar", label: "← Calendar" };

  return (
    <div className="pt-page pt-narrow">
      <Link href={back.href} className="pt-link pt-small">
        {back.label}
      </Link>
      <div className="pt-page-head">
        <h1>{a.title}</h1>
        <p className="pt-muted">
          {who} · {formatDateTime(a.startsAt)} (UK) · {a.durationMinutes} min
        </p>
        {a.cancelledAt && <span className="pt-badge is-danger">Cancelled</span>}
      </div>

      {!a.cancelledAt && a.meetingUrl && (
        <p>
          <a
            href={personalJoinUrl(a.meetingUrl, { name: admin.name, subject: a.title })!}
            className="pt-btn pt-btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Join the call
          </a>
        </p>
      )}

      <section className="pt-card">
        <h2>Notes</h2>
        <SessionNotes
          appointmentId={a.id}
          firstName={firstName}
          initialNotes={a.notes ?? ""}
          initialRecap={a.recap ?? ""}
          followUpSent={Boolean(a.followUpSentAt)}
          preview={preview}
        />
      </section>

      {!a.cancelledAt && (
        <section className="pt-card">
          <h2>Follow-up email</h2>
          {composed && "error" in composed ? (
            <p className="pt-muted">{composed.error}</p>
          ) : (
            <FollowUpControls
              appointmentId={a.id}
              enabled={a.followUpEnabled}
              sentAt={a.followUpSentAt ? formatDateTime(a.followUpSentAt) : null}
              dueLabel={`Goes out ${FOLLOW_UP_DELAY_MIN} minutes after the end, around ${formatDateTime(new Date(end.getTime() + FOLLOW_UP_DELAY_MIN * 60_000))}.`}
              canSendNow
            />
          )}
        </section>
      )}
    </div>
  );
}
