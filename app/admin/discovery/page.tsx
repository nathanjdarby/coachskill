import { DiscoveryActions, Disclosure } from "@/components/admin/ClientForms";
import { EnquiryAnswers } from "@/components/EnquiryAnswers";
import Link from "next/link";
import { isUpcoming, schedulingForDiscovery } from "@/lib/appointments";
import { requireAdmin } from "@/lib/dal";
import { telHref } from "@/lib/phone";
import { enquirySubtitle } from "@/lib/discovery";
import { listDiscoveryCallsWithClients } from "@/lib/portal";
import { formatDateTime } from "@/lib/time";

export default async function AdminDiscoveryPage() {
  await requireAdmin();
  const rows = await listDiscoveryCallsWithClients();
  // Only for the badges; calls are arranged from the client's page.
  const scheduling = await schedulingForDiscovery(rows.map((r) => r.call.id));

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <h1>Discovery requests</h1>
        <p className="pt-muted">
          Enquiries from the website&apos;s enquiry form, newest first. Read each one and decide: <strong>Work with</strong> adds
          them as a client, and you then arrange their discovery call — video or phone — from their client page.
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
                {call.callPreference === "phone" && <span className="pt-badge">Prefers phone</span>}
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
                {call.phone && (
                  <>
                    <dt>Phone</dt>
                    <dd>
                      <a href={telHref(call.phone)} className="pt-link">
                        {call.phone}
                      </a>
                    </dd>
                  </>
                )}
                <EnquiryAnswers enquiry={call} />
              </dl>
              {clientId && (
                <p className="pt-details-note pt-small">
                  {nextCall
                    ? `Discovery call booked for ${formatDateTime(nextCall.startsAt)}.`
                    : link
                      ? "Booking link sent — waiting for them to pick a time."
                      : "Next: arrange their discovery call."}{" "}
                  <Link href={`/admin/clients/${clientId}#discovery-call`} className="pt-link">
                    Open their client page →
                  </Link>
                </p>
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
