import { Header } from "@/components/Header";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <Header back />
      <main className="pt-auth">
        <div className="pt-card pt-auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="pt-muted pt-auth-subtitle">{subtitle}</p>}
          {children}
        </div>
      </main>
    </>
  );
}
