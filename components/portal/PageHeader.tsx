/** The top of a client-area or admin page: a small label, the title, a line of context and optional actions. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="ov-head">
      <div>
        {eyebrow && <p className="ov-date">{eyebrow}</p>}
        <h1>{title}</h1>
        {lead && <p className="pt-muted">{lead}</p>}
      </div>
      {actions && <div className="ov-actions">{actions}</div>}
    </div>
  );
}
