import type { PortalAccess } from "@/lib/portal";

const LABELS: Record<PortalAccess, { text: string; tone: string }> = {
  none: { text: "No account", tone: "" },
  invited: { text: "Invited", tone: "is-warn" },
  active: { text: "Account active", tone: "is-ok" },
};

export function AccessBadge({ access }: { access: PortalAccess }) {
  const { text, tone } = LABELS[access];
  return <span className={`pt-badge ${tone}`}>{text}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "active" ? "is-accent" : "";
  return <span className={`pt-badge ${tone}`}>{status[0].toUpperCase() + status.slice(1)}</span>;
}
