import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/portal/NavLink";
import { TabIcon, type IconName } from "@/components/portal/TabIcon";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  /** Other paths that belong to this item (detail pages). */
  also?: string[];
  count?: number;
  countLabel?: string;
};

export type NavGroup = { title: string | null; items: NavItem[] };

/**
 * Desktop navigation for the admin and the client area: a fixed column on the
 * left with grouped links. Phones and tablets keep their tab bars.
 */
export function AppSidebar({
  label,
  home,
  tag,
  groups,
  accountHref,
  name,
  extra,
}: {
  label: string;
  home: string;
  /** Small pill after the wordmark, e.g. "Admin". */
  tag?: string;
  groups: NavGroup[];
  accountHref: string;
  name: string;
  /** Shown above the account links, e.g. a booking prompt. */
  extra?: React.ReactNode;
}) {
  return (
    <aside className="pt-sidebar" aria-label={label}>
      <Link href={home} className="pt-brand pt-sidebar-brand">
        <Image src="/assets/coach-skill-logo.png" alt="" width={120} height={40} className="logo" />
        <span className="header-wordmark">Coach Skill</span>
        {tag && <span className="pt-brand-tag">{tag}</span>}
      </Link>

      <nav className="pt-sidebar-nav">
        {groups.map((group) => (
          <div key={group.title ?? "top"} className="pt-sidebar-group">
            {group.title && <p className="pt-sidebar-heading">{group.title}</p>}
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} exact={item.exact} also={item.also} className="pt-sidebar-link">
                    <TabIcon name={item.icon} />
                    <span className="pt-sidebar-label">{item.label}</span>
                    {item.count ? (
                      <span className="pt-nav-count" aria-label={`${item.count} ${item.countLabel ?? ""}`.trim()}>
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

      {extra}

      <div className="pt-sidebar-foot">
        <NavLink href={accountHref} className="pt-sidebar-link">
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
