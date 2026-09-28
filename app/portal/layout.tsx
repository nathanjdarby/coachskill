import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { AppSidebar, type NavGroup } from "@/components/portal/AppSidebar";
import { NavLink } from "@/components/portal/NavLink";
import { TabIcon } from "@/components/portal/TabIcon";
import { requireClient } from "@/lib/dal";
import { packageBalances } from "@/lib/packages";
import { unreadCountForClient } from "@/lib/portal";

export const metadata: Metadata = { title: "Your client area | Coach Skill", robots: { index: false } };

/** The client area's sections: their coaching, and what Monika shares with them. */
function portalNavGroups(unread: number): NavGroup[] {
  return [
    { title: null, items: [{ href: "/portal", label: "Home", icon: "home", exact: true }] },
    {
      title: "Your coaching",
      items: [
        { href: "/portal/sessions", label: "Sessions", icon: "sessions" },
        { href: "/portal/updates", label: "Updates", icon: "updates" },
      ],
    },
    {
      title: "From Monika",
      items: [
        { href: "/portal/resources", label: "Resources", icon: "resources" },
        { href: "/portal/messages", label: "Messages", icon: "messages", count: unread, countLabel: "unread" },
      ],
    },
  ];
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();
  const [unread, balances] = await Promise.all([unreadCountForClient(user.clientId), packageBalances(user.clientId)]);
  const sessionsLeft = balances.reduce((n, b) => n + b.remaining, 0);
  return (
    <div className="pt-shell pt-shell-app pt-shell-portal pt-shell-sidebar">
      <AppSidebar
        label="Client area"
        home="/portal"
        groups={portalNavGroups(unread)}
        accountHref="/portal/account"
        name={user.name.split(/\s+/)[0]}
        extra={
          sessionsLeft > 0 ? (
            <Link href="/portal/sessions#book" className="pt-sidebar-cta">
              <span className="pt-sidebar-cta-count">{sessionsLeft}</span>
              <span>
                <span className="pt-sidebar-cta-title">{sessionsLeft === 1 ? "session" : "sessions"} left</span>
                <span className="pt-sidebar-cta-link">Book a session →</span>
              </span>
            </Link>
          ) : null
        }
      />
      {/* Below desktop width: the top bar with tabs, and a bottom tab bar on phones */}
      <header className="pt-topbar">
        <div className="pt-topbar-row">
          <Link href="/portal" className="pt-brand">
            <Image src="/assets/coach-skill-logo.png" alt="" width={120} height={40} className="logo" />
            <span className="header-wordmark">Coach Skill</span>
          </Link>
          <div className="pt-user">
            <NavLink href="/portal/account">{user.name.split(/\s+/)[0]}</NavLink>
            <form action={logout} className="pt-desktop-only">
              <button type="submit" className="pt-link-btn">
                Sign out
              </button>
            </form>
          </div>
        </div>
        {/* Tabs under the brand on desktop; a fixed bottom tab bar on mobile */}
        <nav className="pt-nav pt-tabbar" aria-label="Client area">
          <NavLink href="/portal" exact>
            <TabIcon name="home" />
            <span>Home</span>
          </NavLink>
          <NavLink href="/portal/sessions">
            <TabIcon name="sessions" />
            <span>Sessions</span>
          </NavLink>
          <NavLink href="/portal/updates">
            <TabIcon name="updates" />
            <span>Updates</span>
          </NavLink>
          <NavLink href="/portal/resources">
            <TabIcon name="resources" />
            <span>Resources</span>
          </NavLink>
          <NavLink href="/portal/messages">
            <TabIcon name="messages" />
            <span>Messages</span>
            {unread > 0 && (
              <span className="pt-nav-count" aria-label={`${unread} unread`}>
                {unread}
              </span>
            )}
          </NavLink>
        </nav>
      </header>
      <main className="pt-main">{children}</main>
    </div>
  );
}
