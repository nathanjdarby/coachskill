import Link from "next/link";
import { listAvailabilityRules } from "@/lib/booking";
import { requireAdmin } from "@/lib/dal";
import { listEventTypes } from "@/lib/event-types";

export default async function SchedulingPage() {
  await requireAdmin();
  const rules = listAvailabilityRules();
  const types = listEventTypes({ activeOnly: true });
  const links = [
    {
      href: "/admin/calendar",
      title: "Calendar",
      hint: "Everything booked — sessions, discovery calls and workshops",
    },
    {
      href: "/admin/scheduling/availability",
      title: "Availability",
      hint: rules.length ? `Weekly hours set on ${new Set(rules.map((r) => r.weekday)).size} days · time off · booking rules` : "Not set yet — clients can't book until you add hours",
    },
    {
      href: "/admin/scheduling/event-types",
      title: "Booking types",
      hint: `${types.length} active: ${types.map((t) => t.name).join(", ")}`,
    },
  ];
  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Scheduling</h1>
        <p className="pt-muted">Your own booking system: when you&apos;re available, what people can book, and every appointment.</p>
      </div>
      <ul className="pt-link-list">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>
              <span>
                <span className="pt-link-list-title">{l.title}</span>
                <span className="pt-muted pt-small">{l.hint}</span>
              </span>
              <span aria-hidden className="pt-link-list-chevron">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
