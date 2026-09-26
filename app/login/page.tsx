import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { currentUser, homeFor } from "@/lib/dal";

export const metadata: Metadata = { title: "Sign in | Coach Skill" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const user = await currentUser();
  if (user) redirect(homeFor(user));
  const { callbackUrl } = await searchParams;

  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Sign in to your Coach Skill account.">
      <LoginForm callbackUrl={callbackUrl ?? ""} />
      <p className="pt-muted pt-small pt-auth-foot">
        Not a client yet? <Link href="/discovery-call" className="pt-link">Book a discovery call</Link>
      </p>
    </AuthShell>
  );
}
