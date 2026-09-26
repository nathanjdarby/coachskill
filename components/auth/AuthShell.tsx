import Image from "next/image";
import Link from "next/link";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="pt-auth">
      <Link href="/" className="pt-auth-logo">
        <Image src="/assets/coach-skill-logo.png" alt="Coach Skill" width={120} height={40} className="logo" />
      </Link>
      <div className="pt-card pt-auth-card">
        <h1>{title}</h1>
        {subtitle && <p className="pt-muted pt-auth-subtitle">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
