import { deletePackage } from "@/app/actions/packages";
import { ConfirmSubmit } from "@/components/admin/ClientForms";
import { NEW_PACKAGE, PackageForm } from "@/components/admin/PackageForm";
import { requireAdmin } from "@/lib/dal";
import { formatPence } from "@/lib/money";
import { listPackages, purchaseCounts } from "@/lib/packages";

export default async function AdminPackagesPage() {
  await requireAdmin();
  const [items, bought] = await Promise.all([listPackages(), purchaseCounts()]);

  return (
    <div className="pt-page pt-narrow">
      <div className="pt-page-head">
        <h1>Packages</h1>
        <p className="pt-muted">
          Coaching packages clients can buy in their client area. Changing a package doesn&apos;t affect what people
          have already bought.
        </p>
      </div>

      <details className="pt-card pt-details" open={items.length === 0}>
        <summary>
          <span className="pt-details-title">Add a package</span>
          <span className="pt-muted pt-small">Name, price and number of sessions</span>
        </summary>
        <div className="pt-details-body">
          <PackageForm id={null} initial={NEW_PACKAGE} />
        </div>
      </details>

      {items.map((p) => {
        const count = bought.get(p.id) ?? 0;
        return (
          <section key={p.id} className="pt-card">
            <div className="pt-card-head">
              <h2>{p.name}</h2>
              <span className={`pt-badge ${p.active ? "is-ok" : ""}`}>{p.active ? "On sale" : "Hidden"}</span>
            </div>
            <p className="pt-package-price">
              {formatPence(p.pricePence)} · {p.sessionCount} × {p.sessionMinutes} min
            </p>
            {p.description && <p className="pt-muted pt-prewrap">{p.description}</p>}
            <p className="pt-muted pt-small pt-mt-sm">
              Bought {count} {count === 1 ? "time" : "times"}
            </p>
            <details className="pt-details pt-details-inline">
              <summary>
                <span className="pt-details-title">Edit</span>
              </summary>
              <div className="pt-details-body">
                <PackageForm
                  id={p.id}
                  initial={{
                    name: p.name,
                    description: p.description ?? "",
                    price: String(p.pricePence / 100),
                    sessionCount: String(p.sessionCount),
                    sessionMinutes: String(p.sessionMinutes),
                    sortOrder: String(p.sortOrder),
                    active: p.active,
                  }}
                />
                <form action={deletePackage.bind(null, p.id)} className="pt-mt">
                  <ConfirmSubmit
                    label={count > 0 ? "Hide package" : "Delete package"}
                    confirmText={count > 0 ? "This package has been bought, so it will be hidden rather than deleted. Continue?" : `Delete "${p.name}"?`}
                  />
                </form>
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
