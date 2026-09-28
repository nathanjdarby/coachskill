import { AppSidebar, type NavGroup } from "@/components/portal/AppSidebar";

export type AdminCounts = { unreadMessages: number; newDiscoveryRequests: number; sessionRequests: number };
type Counts = AdminCounts;

/** The admin's sections, grouped by the job they're part of (also used by the mobile More page). */
export function adminNavGroups(counts: Counts): NavGroup[] {
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

/** The admin's desktop sidebar. */
export function AdminSidebar({ name, counts }: { name: string; counts: Counts }) {
  return <AppSidebar label="Admin" home="/admin" tag="Admin" groups={adminNavGroups(counts)} accountHref="/admin/account" name={name} />;
}
