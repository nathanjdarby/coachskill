import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/portal/NavLink";
import { TabIcon } from "@/components/portal/TabIcon";
import { requireAdmin } from "@/lib/dal";
import { adminDashboardCounts } from "@/lib/portal";

export const metadata: Metadata = { title: "Admin | Coach Skill", robots: { index: false } };

function Count({ n, label }: { n: number; label: string }) {
  if (n <= 0) return null;
  return (
    <span className="pt-nav-count" aria-label={`${n} ${label}`}>
      {n}
    </span>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const counts = await adminDashboardCounts();
  return (
    <div className="pt-shell pt-shell-app">
      <header className="pt-topbar">
        <div className="pt-topbar-row">
          <Link href="/admin" className="pt-brand">
            <Image src="/assets/coach-skill-logo.png" alt="" width={120} height={40} className="logo" />
            <span className="header-wordmark">Coach Skill</span>
            <span className="pt-brand-tag">Admin</span>
          </Link>
          <div className="pt-user">
            <NavLink href="/admin/account">{admin.name.split(/\s+/)[0]}</NavLink>
            <form action={logout} className="pt-desktop-only">
              <button type="submit" className="pt-link-btn">
                Sign out
              </button>
            </form>
          </div>
        </div>
        {/* Tabs under the brand on desktop; a fixed bottom tab bar on mobile */}
        <nav className="pt-nav pt-tabbar" aria-label="Admin">
          <NavLink href="/admin" exact>
            <TabIcon name="overview" />
            <span>Overview</span>
          </NavLink>
          <NavLink href="/admin/clients">
            <TabIcon name="clients" />
            <span>Clients</span>
            <Count n={counts.unreadMessages} label="unread messages" />
          </NavLink>
          <NavLink href="/admin/discovery">
            <TabIcon name="discovery" />
            <span>
              Discovery<span className="pt-desktop-inline"> requests</span>
            </span>
            <Count n={counts.newDiscoveryRequests} label="new requests" />
          </NavLink>
          <NavLink href="/admin/signups">
            <TabIcon name="signups" />
            <span>
              <span className="pt-desktop-inline">Workshop s</span>
              <span className="pt-mobile-inline">S</span>ignups
            </span>
          </NavLink>
        </nav>
      </header>
      <main className="pt-main">{children}</main>
    </div>
  );
}
