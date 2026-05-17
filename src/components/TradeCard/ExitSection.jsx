export default function ExitSection({ exitStrategy }) {
  if (!exitStrategy) return null;
  const { profitTarget, stopLoss, timeStop, earningsWarning } = exitStrategy;
  if (!profitTarget || !stopLoss || !timeStop) return null;

  return (
    <div className="tc-section">
      <div className="tc-section-label">EXIT</div>
      <div className="tc-exit-row">
        <span className="tc-exit-type">TARGET</span>
        <span className="tc-exit-pct green-text">+{profitTarget.returnPct}%</span>
        <span className="tc-exit-rule">{profitTarget.rule} · stock at {profitTarget.stockPrice}</span>
      </div>
      <div className="tc-exit-row">
        <span className="tc-exit-type">STOP</span>
        <span className="tc-exit-pct red-text">−{stopLoss.lossPct}%</span>
        <span className="tc-exit-rule">{stopLoss.rule} · stock at {stopLoss.stockPrice}</span>
      </div>
      <div className="tc-exit-row">
        <span className="tc-exit-type">TIME</span>
        <span className="tc-exit-pct" />
        <span className="tc-exit-rule">{timeStop.rule} · close by {timeStop.date}</span>
      </div>
      {earningsWarning && (
        <p className="tc-exit-warning">⚠ {earningsWarning}</p>
      )}
    </div>
  );
}
