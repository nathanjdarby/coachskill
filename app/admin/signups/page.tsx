import { listSignupsWithWorkshop, listWorkshops } from "@/lib/db/queries";
import { AdminSignupsTable } from "@/components/AdminSignupsTable";
import { requireAdmin } from "@/lib/dal";

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
      <div className="pt-page-head">
        <h1>Workshop signups</h1>
        <p className="pt-muted">
          Review signups from Stripe, n8n, or other sources. Use filters to
          narrow the list.
        </p>
      </div>

      <form method="get" className="admin-filters">
        <label>
          Workshop{" "}
          <select
            name="workshop"
            defaultValue={workshopParam ?? "all"}
          >
            <option value="all">All</option>
            {workshopList.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status{" "}
          <select name="status" defaultValue={statusParam ?? "all"}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="on_hold">On hold</option>
            <option value="declined">Declined</option>
          </select>
        </label>
        <button type="submit" className="admin-link-btn">
          Apply
        </button>
      </form>

      <AdminSignupsTable signups={rows} />
    </div>
  );
}
