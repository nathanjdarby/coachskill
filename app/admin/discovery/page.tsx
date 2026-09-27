import { DiscoveryActions, Disclosure } from "@/components/admin/ClientForms";
import { requireAdmin } from "@/lib/dal";
import { personaLabel } from "@/lib/discovery";
import { listDiscoveryCallsWithClients } from "@/lib/portal";
import { formatDateTime } from "@/lib/time";

export default async function AdminDiscoveryPage() {
  await requireAdmin();
  const rows = await listDiscoveryCallsWithClients();

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <h1>Discovery requests</h1>
        <p className="pt-muted">
          Answers from the discovery call form, newest first. When you decide to work with someone, add them as a client,
          then invite them to create an account — it&apos;s linked to everything they told you here.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="pt-muted">No discovery requests yet.</p>
      ) : (
        <div className="pt-stack">
          {rows.map(({ call, clientId }) => (
            <Disclosure key={call.id} id={`request-${call.id}`} className="pt-card pt-details" defaultOpen={!clientId && !call.declinedAt}>
              <summary>
                <span className="pt-details-title">{call.fullName}</span>
                <span className="pt-muted pt-small">
                  {call.company} · {personaLabel(call.persona)}
                </span>
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
                <dt>Main goal (6 months)</dt>
                <dd>{call.goal}</dd>
                <dt>Challenges</dt>
                <dd>{call.challenges}</dd>
                <dt>Anything else</dt>
                <dd>{call.anythingElse || <span className="pt-muted">—</span>}</dd>
              </dl>
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
          ))}
        </div>
      )}
    </div>
  );
}
