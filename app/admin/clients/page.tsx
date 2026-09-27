import Link from "next/link";
import { AddClientForm } from "@/components/admin/ClientForms";
import { AccessBadge, KindBadge, StatusBadge } from "@/components/portal/AccessBadge";
import { requireAdmin } from "@/lib/dal";
import { listClientsOverview } from "@/lib/portal";
import { formatDate, formatDateTime } from "@/lib/time";

export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const [rows, { deleted }] = await Promise.all([listClientsOverview(), searchParams]);

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <h1>Clients</h1>
        <p className="pt-muted">
          Everyone you&apos;re working with. Turn a discovery request into a client from{" "}
          <Link href="/admin/discovery" className="pt-link">Discovery requests</Link>, or add someone directly below.
        </p>
      </div>

      {deleted && (
        <div role="status" className="pt-alert is-ok">
          <p>Client deleted.</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="pt-card">
          <p className="pt-muted">No clients yet.</p>
        </div>
      ) : (
        <div className="pt-table-wrap">
          <table className="pt-table pt-table-stack">
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th>Portal</th>
                <th>Next session</th>
                <th>Messages</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ client, access, lastLoginAt, unread, nextSession }) => (
                <tr key={client.id}>
                  <td>
                    <Link href={`/admin/clients/${client.id}`} className="pt-table-title">
                      {client.fullName}
                    </Link>
                    <span className="pt-muted pt-small pt-block">{client.company || client.email}</span>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={client.status} /> <KindBadge kind={client.kind} />
                  </td>
                  <td data-label="Portal">
                    <AccessBadge access={access} />
                    {lastLoginAt && (
                      <span className="pt-muted pt-small pt-block">Last in {formatDate(lastLoginAt)}</span>
                    )}
                  </td>
                  <td className="pt-small" data-label="Next session">
                    {nextSession ? formatDateTime(nextSession.startsAt) : <span className="pt-muted">—</span>}
                  </td>
                  <td data-label="Messages">{unread > 0 ? <span className="pt-badge is-accent">{unread} new</span> : <span className="pt-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="pt-card pt-details">
        <summary>
          <span className="pt-details-title">Add a client directly</span>
          <span className="pt-muted pt-small">For someone who didn&apos;t come through the discovery call form</span>
        </summary>
        <div className="pt-details-body">
          <AddClientForm />
        </div>
      </details>
    </div>
  );
}
