import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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
    <div className="pt-shell pt-shell-app pt-shell-sidebar">
      <AdminSidebar name={admin.name.split(/\s+/)[0]} counts={counts} />
      {/* Below desktop width: the top bar with tabs, and a bottom tab bar on phones */}
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
            <Count n={counts.sessionRequests} label="session requests to approve" />
          </NavLink>
          <NavLink href="/admin/clients">
            <TabIcon name="clients" />
            <span>Clients</span>
            <Count n={counts.unreadMessages} label="unread messages" />
          </NavLink>
          <NavLink href="/admin/discovery" className="pt-desktop-flex">
            <span>Discovery requests</span>
            <Count n={counts.newDiscoveryRequests} label="new requests" />
          </NavLink>
          <NavLink href="/admin/calendar">
            <TabIcon name="sessions" />
            <span>Calendar</span>
          </NavLink>
          <NavLink href="/admin/workshops" also={["/admin/signups"]} className="pt-desktop-flex">
            <span>Workshops</span>
          </NavLink>
          <NavLink href="/admin/packages" className="pt-desktop-flex">
            <span>Packages</span>
          </NavLink>
          <NavLink href="/admin/scheduling" className="pt-desktop-flex">
            <span>Scheduling</span>
          </NavLink>
          <NavLink href="/admin/resources" className="pt-desktop-flex">
            <span>Resources</span>
          </NavLink>
          <NavLink href="/admin/settings" className="pt-desktop-flex">
            <span>Settings</span>
          </NavLink>
          {/* Mobile has room for four tabs; the rest live under More. */}
          <NavLink href="/admin/more" also={["/admin/discovery", "/admin/workshops", "/admin/signups", "/admin/packages", "/admin/scheduling", "/admin/availability", "/admin/resources", "/admin/settings", "/admin/account"]} className="pt-mobile-flex">
            <TabIcon name="more" />
            <span>More</span>
            <Count n={counts.newDiscoveryRequests} label="new requests" />
          </NavLink>
        </nav>
      </header>
      <main className="pt-main">{children}</main>
    </div>
  );
}
