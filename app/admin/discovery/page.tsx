import { DiscoveryActions, Disclosure } from "@/components/admin/ClientForms";
import { EnquiryAnswers } from "@/components/EnquiryAnswers";
import { DiscoveryScheduling, type SchedulingType } from "@/components/admin/DiscoveryScheduling";
import { isUpcoming, schedulingForDiscovery } from "@/lib/appointments";
import { availableSlots, groupSlotsByDay } from "@/lib/booking";
import { personalJoinUrl } from "@/lib/meeting";
import { requireAdmin } from "@/lib/dal";
import { durationFor, listEventTypes } from "@/lib/event-types";
import { enquirySubtitle } from "@/lib/discovery";
import { listDiscoveryCallsWithClients } from "@/lib/portal";
import { formatDateTime } from "@/lib/time";

export default async function AdminDiscoveryPage() {
  const admin = await requireAdmin();
  const rows = await listDiscoveryCallsWithClients();
  const scheduling = await schedulingForDiscovery(rows.map((r) => r.call.id));
  // Types Monika can send to prospects, with her free times for each.
  const types: SchedulingType[] = listEventTypes({ activeOnly: true })
    .filter((t) => t.audience === "invite_only")
    .map((t) => {
      const minutes = durationFor(t);
      return { id: t.id, label: t.name, minutes, days: groupSlotsByDay(availableSlots(minutes, { bufferMinutes: t.bufferMinutes })) };
    });

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <h1>Discovery requests</h1>
        <p className="pt-muted">
          Enquiries from the website&apos;s enquiry form, newest first. Schedule a call yourself or email a link so they can pick
          a time. When you decide to work with someone, add them as a client — their calls and answers move across.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="pt-muted">No discovery requests yet.</p>
      ) : (
        <div className="pt-stack">
          {rows.map(({ call, clientId }) => {
            const { appointments, link } = scheduling.get(call.id) ?? { appointments: [], link: null };
            const nextCall = appointments.find((a) => isUpcoming(a));
            return (
            <Disclosure key={call.id} id={`request-${call.id}`} className="pt-card pt-details" defaultOpen={!clientId && !call.declinedAt}>
              <summary>
                <span className="pt-details-title">{call.fullName}</span>
                <span className="pt-muted pt-small">
                  {enquirySubtitle(call)}
                </span>
                {nextCall && <span className="pt-badge is-info">Call {formatDateTime(nextCall.startsAt)}</span>}
                {!nextCall && link && <span className="pt-badge is-info">Link sent</span>}
                {clientId ? (
                  <span className="pt-badge is-ok">Client</span>
                ) : call.declinedAt ? (
                  <span className="pt-badge">Declined</span>
                ) : (
                  <span className="pt-badge is-accent">New</span>
                )}
                <span className="pt-muted pt-small pt-push">{formatDateTime(call.createdAt)}</span>
              </summary>
              <dl className="pt-dl">
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${call.email}`} className="pt-link">
                    {call.email}
                  </a>
                </dd>
                <EnquiryAnswers enquiry={call} />
              </dl>
              {!call.declinedAt && (
                <DiscoveryScheduling
                  discoveryCallId={call.id}
                  firstName={call.fullName.split(/\s+/)[0]}
                  types={types}
                  appointments={appointments.map((a) => ({
                    id: a.id,
                    title: a.title,
                    startsAt: a.startsAt,
                    durationMinutes: a.durationMinutes,
                    meetingUrl: personalJoinUrl(a.meetingUrl, { name: admin.name, subject: a.title }),
                    cancelledAt: a.cancelledAt,
                    upcoming: isUpcoming(a),
                    colour: a.typeColour,
                  }))}
                  link={link && { id: link.id, url: link.url, expiresAt: link.expiresAt }}
                />
              )}
              <div className="pt-details-actions">
                <DiscoveryActions
                  discoveryCallId={call.id}
                  name={call.fullName}
                  email={call.email}
                  clientId={clientId}
                  declined={Boolean(call.declinedAt)}
                />
              </div>
            </Disclosure>
            );
          })}
        </div>
      )}
    </div>
  );
}
