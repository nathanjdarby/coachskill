import { notFound } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { MIN_PASSWORD_LENGTH } from "@/lib/accounts";
import { requireClient } from "@/lib/dal";
import { getPortalData } from "@/lib/portal";

export default async function PortalAccountPage() {
  const user = await requireClient();
  const data = await getPortalData(user.clientId);
  if (!data) notFound();

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Your account</h1>
      </div>
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
  );
}
