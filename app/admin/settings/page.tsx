import Link from "next/link";
import { AddUserButton, UserActions } from "@/components/admin/UserForms";
import { listUsers } from "@/lib/accounts";
import { requireAdmin } from "@/lib/dal";
import { formatDate } from "@/lib/time";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const rows = await listUsers();

  return (
    <div className="pt-page">
      <div className="pt-page-head">
        <h1>Settings</h1>
        <p className="pt-muted">
          Manage who can sign in. Your own password is under{" "}
          <Link href="/admin/account" className="pt-link">Your account</Link>.
        </p>
      </div>

      <section>
        <div className="pt-card-head">
          <h2 className="pt-subhead">Users</h2>
          <AddUserButton />
        </div>
        <div className="pt-table-wrap">
          <table className="pt-table pt-table-stack">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>
                  <span className="pt-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, client }) => (
                <tr key={user.id}>
                  <td>
                    {client ? (
                      <Link href={`/admin/clients/${client.id}`} className="pt-table-title">
                        {user.name}
                      </Link>
                    ) : (
                      <span className="pt-table-title">{user.name}</span>
                    )}
                    {user.id === admin.id && <span className="pt-muted"> (you)</span>}
                    <span className="pt-muted pt-small pt-block">{user.email}</span>
                  </td>
                  <td data-label="Role">
                    {user.role === "admin" ? (
                      <span className="pt-badge is-accent">Administrator</span>
                    ) : (
                      <span className="pt-badge">Client</span>
                    )}
                  </td>
                  <td data-label="Status">
                    {user.passwordHash ? (
                      <>
                        <span className="pt-badge is-ok">Active</span>
                        {user.lastLoginAt && (
                          <span className="pt-muted pt-small pt-block">Last in {formatDate(user.lastLoginAt)}</span>
                        )}
                      </>
                    ) : (
                      <span className="pt-badge is-warn">Invited</span>
                    )}
                  </td>
                  <td>
                    <UserActions
                      user={{
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        invited: !user.passwordHash,
                        isYou: user.id === admin.id,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
