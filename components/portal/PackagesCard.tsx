import { formatPence } from "@/lib/money";
import type { Package } from "@/lib/db/schema";
import type { PackageBalance } from "@/lib/packages";
import { BuyPackageButton } from "./BuyPackage";
import { PackageMeter } from "./PackageMeter";

/**
 * The client's coaching packages: progress for what they've bought, and the
 * packages on offer when they have no sessions left.
 */
export function PackagesCard({ balances, offers }: { balances: PackageBalance[]; offers: Package[] }) {
  const current = balances.filter((b) => b.remaining > 0);
  const showOffers = current.length === 0 && offers.length > 0;
  if (balances.length === 0 && offers.length === 0) return null;

  return (
    <section className="pt-card">
      <h2>{showOffers ? (balances.length ? "Continue your coaching" : "Coaching packages") : "Your package"}</h2>
      {current.length > 0 && (
        <ul className="pt-package-list">
          {current.map((b) => (
            <li key={b.id}>
              <PackageMeter name={b.name} used={b.used} total={b.sessionCount} />
            </li>
          ))}
        </ul>
      )}
      {showOffers && (
        <>
          <p className="pt-muted">
            {balances.length
              ? "You've used all the sessions in your package. Choose another to keep going."
              : "Choose a package to book coaching sessions with Monika."}
          </p>
          <ul className="pt-package-options">
            {offers.map((p) => (
              <li key={p.id} className="pt-package-option">
                <h3>{p.name}</h3>
                <p className="pt-package-price">
                  {formatPence(p.pricePence)} · {p.sessionCount} × {p.sessionMinutes} min
                </p>
                {p.description && <p className="pt-muted pt-small pt-prewrap">{p.description}</p>}
                <BuyPackageButton packageId={p.id} label={`Buy for ${formatPence(p.pricePence)}`} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
