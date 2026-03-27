import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listSignupsWithWorkshop, listWorkshops } from "@/lib/db/queries";
import { AdminSignupsTable } from "@/components/AdminSignupsTable";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ workshop?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

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
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1>Workshop signups</h1>
          <p className="admin-muted">
            Review signups from Stripe, n8n, or other sources. Use filters to
            narrow the list.
          </p>
        </div>
        <SignOutButton />
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
