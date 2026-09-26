import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/portal/NavLink";
import { requireAdmin } from "@/lib/dal";

export const metadata: Metadata = { title: "Admin | Coach Skill", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="pt-shell">
      <header className="pt-topbar">
        <div className="pt-topbar-row">
          <Link href="/admin" className="pt-brand">
            <Image src="/assets/coach-skill-logo.png" alt="Coach Skill" width={120} height={40} className="logo" />
            <span className="pt-brand-tag">Admin</span>
          </Link>
          <div className="pt-user">
            <NavLink href="/admin/account">{admin.name.split(/\s+/)[0]}</NavLink>
            <form action={logout}>
              <button type="submit" className="pt-link-btn">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="pt-nav" aria-label="Admin">
          <NavLink href="/admin" exact>
            Overview
          </NavLink>
          <NavLink href="/admin/clients">Clients</NavLink>
          <NavLink href="/admin/discovery">Discovery requests</NavLink>
          <NavLink href="/admin/signups">Workshop signups</NavLink>
        </nav>
      </header>
      <main className="pt-main">{children}</main>
    </div>
  );
}
