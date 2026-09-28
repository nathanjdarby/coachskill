import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/portal/NavLink";
import { TabIcon, type IconName } from "@/components/portal/TabIcon";

type Item = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  /** Other paths that belong to this item (detail pages). */
  also?: string[];
  count?: number;
  countLabel?: string;
};

export type AdminCounts = { unreadMessages: number; newDiscoveryRequests: number; sessionRequests: number };
type Counts = AdminCounts;

/** The admin's sections, grouped by the job they're part of (also used by the mobile More page). */
export function adminNavGroups(counts: Counts): { title: string | null; items: Item[] }[] {
  return [
    {
      title: null,
      items: [
        {
          href: "/admin",
          label: "Overview",
          icon: "overview",
          exact: true,
          count: counts.sessionRequests,
          countLabel: "session requests to approve",
        },
      ],
    },
    {
      title: "Clients",
      items: [
        { href: "/admin/clients", label: "Clients", icon: "clients", count: counts.unreadMessages, countLabel: "unread messages" },
        {
          href: "/admin/discovery",
          label: "Discovery requests",
          icon: "discovery",
          count: counts.newDiscoveryRequests,
          countLabel: "new requests",
        },
        { href: "/admin/resources", label: "Resources", icon: "resources" },
      ],
    },
    {
      title: "Schedule",
      items: [
        { href: "/admin/calendar", label: "Calendar", icon: "sessions", also: ["/admin/sessions"] },
        { href: "/admin/scheduling/availability", label: "Availability", icon: "availability", also: ["/admin/availability"] },
        { href: "/admin/scheduling/event-types", label: "Booking types", icon: "bookingTypes" },
        { href: "/admin/scheduling/connections", label: "Calendar sync", icon: "sync" },
      ],
    },
    {
      title: "Sales",
      items: [
        { href: "/admin/workshops", label: "Workshops", icon: "workshops" },
        { href: "/admin/signups", label: "Workshop signups", icon: "signups" },
        { href: "/admin/packages", label: "Packages", icon: "packages" },
      ],
    },
  ];
}

/** Desktop navigation: a fixed column on the left. Phones keep the bottom tab bar. */
export function AdminSidebar({ name, counts }: { name: string; counts: Counts }) {
  return (
    <aside className="pt-sidebar" aria-label="Admin">
      <Link href="/admin" className="pt-brand pt-sidebar-brand">
        <Image src="/assets/coach-skill-logo.png" alt="" width={120} height={40} className="logo" />
        <span className="header-wordmark">Coach Skill</span>
        <span className="pt-brand-tag">Admin</span>
      </Link>

      <nav className="pt-sidebar-nav">
        {adminNavGroups(counts).map((group) => (
          <div key={group.title ?? "top"} className="pt-sidebar-group">
            {group.title && <p className="pt-sidebar-heading">{group.title}</p>}
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} exact={item.exact} also={item.also} className="pt-sidebar-link">
                    <TabIcon name={item.icon} />
                    <span className="pt-sidebar-label">{item.label}</span>
                    {item.count ? (
                      <span className="pt-nav-count" aria-label={`${item.count} ${item.countLabel}`}>
                        {item.count}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="pt-sidebar-foot">
        <NavLink href="/admin/account" className="pt-sidebar-link">
          <TabIcon name="account" />
          <span className="pt-sidebar-label">{name}</span>
        </NavLink>
        <Link href="/" className="pt-nav-link pt-sidebar-link" target="_blank" rel="noopener noreferrer">
          <TabIcon name="website" />
          <span className="pt-sidebar-label">View website</span>
        </Link>
        <form action={logout}>
          <button type="submit" className="pt-nav-link pt-sidebar-link">
            <TabIcon name="signOut" />
            <span className="pt-sidebar-label">Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
