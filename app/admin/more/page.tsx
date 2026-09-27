import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/dal";
import { adminDashboardCounts } from "@/lib/portal";

const LINKS = [
  { href: "/admin/discovery", label: "Discovery requests", hint: "Answers from the discovery call form" },
  { href: "/admin/packages", label: "Packages", hint: "Coaching packages clients can buy" },
  { href: "/admin/availability", label: "Availability", hint: "When clients can book sessions" },
  { href: "/admin/signups", label: "Workshop signups", hint: "Everyone who's booked a workshop" },
  { href: "/admin/account", label: "Your account", hint: "Change your password" },
];

export default async function AdminMorePage() {
  await requireAdmin();
  const counts = await adminDashboardCounts();
  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>More</h1>
      </div>
      <ul className="pt-link-list">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>
              <span>
                <span className="pt-link-list-title">{l.label}</span>
                <span className="pt-muted pt-small">{l.hint}</span>
              </span>
              {l.href === "/admin/discovery" && counts.newDiscoveryRequests > 0 && (
                <span className="pt-nav-count">{counts.newDiscoveryRequests}</span>
              )}
              <span aria-hidden className="pt-link-list-chevron">›</span>
            </Link>
          </li>
        ))}
      </ul>
      <form action={logout}>
        <button type="submit" className="pt-btn pt-btn-secondary pt-btn-block">
          Sign out
        </button>
      </form>
    </div>
  );
}
