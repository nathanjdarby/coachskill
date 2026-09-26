import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listDiscoveryCalls } from "@/lib/db/queries";
import { personaLabel } from "@/lib/discovery";
import { SignOutButton } from "@/components/SignOutButton";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

export default async function AdminDiscoveryPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const rows = await listDiscoveryCalls();

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Discovery call requests</h1>
          <p className="admin-muted">
            Answers submitted through the discovery call form, newest first.{" "}
            <Link href="/admin">Workshop signups →</Link>
          </p>
        </div>
        <SignOutButton />
      </div>

      {rows.length === 0 ? (
        <p className="admin-muted">No discovery call requests yet.</p>
      ) : (
        <div className="admin-discovery-list">
          {rows.map((r) => (
            <details key={r.id} className="admin-discovery-item">
              <summary>
                <span className="admin-discovery-name">{r.fullName}</span>
                <span className="admin-muted">
                  {r.company} · {personaLabel(r.persona)}
                </span>
                <span className="admin-muted admin-discovery-date">
                  {dateFormat.format(r.createdAt)}
                </span>
              </summary>
              <dl>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${r.email}`}>{r.email}</a>
                </dd>
                <dt>Main goal (6 months)</dt>
                <dd>{r.goal}</dd>
                <dt>Challenges</dt>
                <dd>{r.challenges}</dd>
                <dt>Anything else</dt>
                <dd>{r.anythingElse || <span className="admin-muted">—</span>}</dd>
              </dl>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
