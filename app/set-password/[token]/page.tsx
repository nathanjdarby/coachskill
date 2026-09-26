import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { MIN_PASSWORD_LENGTH, lookupPasswordToken } from "@/lib/accounts";

export const metadata: Metadata = { title: "Set your password | Coach Skill", referrer: "no-referrer" };

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await lookupPasswordToken(token);

  if (!found) {
    return (
      <AuthShell title="This link has expired" subtitle="Links work once and expire after a while for your security.">
        <p className="pt-muted">
          If you were invited to the client area, ask Monika to send you a new invite. If you already have an account,
          you can request a new reset link.
        </p>
        <div className="pt-auth-actions">
          <Link href="/forgot-password" className="pt-btn pt-btn-primary">Request a new link</Link>
          <Link href="/login" className="pt-link">Go to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  const firstName = found.user.name.split(/\s+/)[0];
  const isInvite = found.token.purpose === "invite";
  return (
    <AuthShell
      title={isInvite ? `Welcome, ${firstName}` : "Choose a new password"}
      subtitle={
        isInvite
          ? found.user.role === "admin"
            ? "Set a password for your Coach Skill admin account."
            : "Create a password for your Coach Skill client area. You'll use it with this email to sign in."
          : `Resetting the password for ${found.user.email}.`
      }
    >
      {isInvite && <p className="pt-auth-email">{found.user.email}</p>}
      <SetPasswordForm token={token} email={found.user.email} minLength={MIN_PASSWORD_LENGTH} />
    </AuthShell>
  );
}
