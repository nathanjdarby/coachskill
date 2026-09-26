import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { MIN_PASSWORD_LENGTH } from "@/lib/accounts";
import { requireAdmin } from "@/lib/dal";

export default async function AdminAccountPage() {
  const admin = await requireAdmin();
  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Your account</h1>
        <p className="pt-muted">
          {admin.name} · {admin.email}
        </p>
      </div>
      <section className="pt-card">
        <h2>Change password</h2>
        <ChangePasswordForm email={admin.email} minLength={MIN_PASSWORD_LENGTH} />
      </section>
    </div>
  );
}
