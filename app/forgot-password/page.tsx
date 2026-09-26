import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password | Coach Skill" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a link to choose a new password.">
      <ForgotPasswordForm />
      <p className="pt-muted pt-small pt-auth-foot">
        <Link href="/login" className="pt-link">← Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
