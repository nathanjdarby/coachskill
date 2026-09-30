import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { adminNavGroups } from "@/components/admin/AdminSidebar";
import { requireAdmin } from "@/lib/dal";
import { adminDashboardCounts } from "@/lib/portal";

/** Already in the phone tab bar, so not repeated here. */
const IN_TAB_BAR = new Set(["/admin", "/admin/clients", "/admin/calendar"]);

const HINTS: Record<string, string> = {
  "/admin/discovery": "Answers from the discovery call form",
  "/admin/resources": "Files and links shared with clients",
  "/admin/scheduling/availability": "Weekly hours, time off and booking rules",
  "/admin/scheduling/event-types": "The kinds of appointment people can book",
  "/admin/scheduling/connections": "Your own calendars and the bookings feed",
  "/admin/workshops": "Workshop pages and dates",
  "/admin/signups": "Bookings, payments and attendance",
  "/admin/packages": "Coaching packages clients can buy",
};

export default async function AdminMorePage() {
  const admin = await requireAdmin();
  const counts = await adminDashboardCounts();
  const groups = adminNavGroups(counts)
    .map((g) => ({ ...g, items: g.items.filter((i) => !IN_TAB_BAR.has(i.href)) }))
    .filter((g) => g.items.length > 0);
  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>More</h1>
      </div>
      {groups.map((g) => (
        <section key={g.title ?? "top"}>
          {g.title && <h2 className="pt-subhead">{g.title}</h2>}
          <ul className="pt-link-list">
            {g.items.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>
                  <span>
                    <span className="pt-link-list-title">{l.label}</span>
                    {HINTS[l.href] && <span className="pt-muted pt-small">{HINTS[l.href]}</span>}
                  </span>
                  {l.count ? <span className="pt-nav-count">{l.count}</span> : null}
                  <span aria-hidden className="pt-link-list-chevron">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        <h2 className="pt-subhead">Account</h2>
        <ul className="pt-link-list">
          <li>
            <Link href="/admin/settings">
              <span>
                <span className="pt-link-list-title">Settings</span>
                <span className="pt-muted pt-small">Add, edit and remove users</span>
              </span>
              <span aria-hidden className="pt-link-list-chevron">›</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/account">
              <span>
                <span className="pt-link-list-title">Your account</span>
                <span className="pt-muted pt-small">Signed in as {admin.email} · change your password</span>
              </span>
              <span aria-hidden className="pt-link-list-chevron">›</span>
            </Link>
          </li>
        </ul>
      </section>
      <form action={logout}>
        <button type="submit" className="pt-btn pt-btn-secondary pt-btn-block">
          Sign out
        </button>
      </form>
    </div>
  );
}
