import { Header } from "@/components/Header";

export function AuthShell({
  title,
  subtitle,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header back />
      <main className="pt-auth">
        <div className={`pt-card pt-auth-card ${wide ? "is-wide" : ""}`}>
          <h1>{title}</h1>
          {subtitle && <p className="pt-muted pt-auth-subtitle">{subtitle}</p>}
          {children}
        </div>
      </main>
    </>
  );
}
