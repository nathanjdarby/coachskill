/** A package's sessions used vs total, as a labelled progress bar. */
export function PackageMeter({ name, used, total }: { name: string; used: number; total: number }) {
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="pt-meter">
      <div className="pt-meter-head">
        <span className="pt-meter-name">{name}</span>
        <span className="pt-meter-count">
          {remaining} of {total} left
        </span>
      </div>
      <div className="pt-meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={used} aria-label={`${used} of ${total} sessions used`}>
        <span className="pt-meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
