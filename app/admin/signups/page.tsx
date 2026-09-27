import { listSignupsWithWorkshop, listWorkshops } from "@/lib/db/queries";
import { AdminSignupsTable } from "@/components/AdminSignupsTable";
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { formatDate } from "@/lib/time";

export default async function AdminSignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ workshop?: string; status?: string }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const workshopParam = sp.workshop;
  const statusParam = sp.status;

  const workshopId =
    workshopParam && workshopParam !== "all"
      ? parseInt(workshopParam, 10)
      : undefined;
  const status =
    statusParam && statusParam !== "all" ? statusParam : undefined;

  const workshopList = await listWorkshops();
  const rows = await listSignupsWithWorkshop({
    workshopId: Number.isFinite(workshopId) ? workshopId : undefined,
    status,
  });

  return (
    <div className="pt-page">
      <Link href="/admin/workshops" className="pt-link pt-small">
        ← Workshops
      </Link>
      <div className="pt-page-head">
        <h1>Workshop signups</h1>
        <p className="pt-muted">Everyone who&apos;s booked a workshop, with their payment and client-area status.</p>
      </div>

      <form method="get" className="pt-card su-filters">
        <div className="pt-field">
          <label htmlFor="f-workshop">Workshop date</label>
          <select id="f-workshop" name="workshop" defaultValue={workshopParam ?? "all"}>
            <option value="all">All dates</option>
            {workshopList.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.startsAt ? `${formatDate(w.startsAt)} — ${w.name}` : `${w.name} (no date)`}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" name="status" defaultValue={statusParam ?? "all"}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="on_hold">On hold</option>
            <option value="declined">Declined</option>
          </select>
        </div>
        <button type="submit" className="pt-btn pt-btn-secondary">
          Filter
        </button>
      </form>

      <p className="pt-muted pt-small">
        {rows.length} {rows.length === 1 ? "signup" : "signups"}
      </p>

      <AdminSignupsTable signups={rows} />
    </div>
  );
}
