import { notFound } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { PageHeader } from "@/components/portal/PageHeader";
import { MIN_PASSWORD_LENGTH } from "@/lib/accounts";
import { requireClient } from "@/lib/dal";
import { getPortalData } from "@/lib/portal";

export default async function PortalAccountPage() {
  const user = await requireClient();
  const data = await getPortalData(user.clientId);
  if (!data) notFound();

  return (
    <div className="pt-page ov">
      <PageHeader eyebrow="Account" title="Your account" lead={`Signed in as ${user.email}`} />
      <div className="pc-account-grid">
        <section className="pt-card">
          <h2>Your details</h2>
          <dl className="pt-dl">
            <dt>Name</dt>
            <dd>{data.client.fullName}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Company</dt>
            <dd>{data.client.company || <span className="pt-muted">—</span>}</dd>
          </dl>
          <p className="pt-muted pt-small pt-mt">Need to change something? Send Monika a message.</p>
        </section>
        <section className="pt-card">
          <h2>Change password</h2>
          <ChangePasswordForm email={user.email} minLength={MIN_PASSWORD_LENGTH} />
        </section>
      </div>
      {/* On mobile the top bar has no room for Sign out, so it lives here */}
      <form action={logout} className="pt-mobile-only">
        <button type="submit" className="pt-btn pt-btn-secondary pt-btn-block">
          Sign out
        </button>
      </form>
    </div>
  );
}
