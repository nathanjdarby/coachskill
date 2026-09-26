import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/portal/NavLink";
import { requireClient } from "@/lib/dal";
import { unreadCountForClient } from "@/lib/portal";

export const metadata: Metadata = { title: "Your client area | Coach Skill", robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();
  const unread = await unreadCountForClient(user.clientId);
  return (
    <div className="pt-shell">
      <header className="pt-topbar">
        <div className="pt-topbar-row">
          <Link href="/portal" className="pt-brand">
            <Image src="/assets/coach-skill-logo.png" alt="Coach Skill" width={120} height={40} className="logo" />
          </Link>
          <div className="pt-user">
            <NavLink href="/portal/account">{user.name.split(/\s+/)[0]}</NavLink>
            <form action={logout}>
              <button type="submit" className="pt-link-btn">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="pt-nav" aria-label="Client area">
          <NavLink href="/portal" exact>
            Home
          </NavLink>
          <NavLink href="/portal/sessions">Sessions</NavLink>
          <NavLink href="/portal/updates">Updates</NavLink>
          <NavLink href="/portal/messages">
            Messages
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
