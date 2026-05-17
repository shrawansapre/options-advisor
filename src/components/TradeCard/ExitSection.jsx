export default function ExitSection({ exitStrategy }) {
  return (
    <div className="tc-section">
      <div className="tc-section-label">EXIT</div>
      <div className="tc-exit-row">
        <span className="tc-exit-type">TARGET</span>
        <span className="tc-exit-pct green-text">+{exitStrategy.profitTarget.returnPct}%</span>
        <span className="tc-exit-rule">{exitStrategy.profitTarget.rule} · stock at {exitStrategy.profitTarget.stockPrice}</span>
      </div>
      <div className="tc-exit-row">
        <span className="tc-exit-type">STOP</span>
        <span className="tc-exit-pct red-text">−{exitStrategy.stopLoss.lossPct}%</span>
        <span className="tc-exit-rule">{exitStrategy.stopLoss.rule} · stock at {exitStrategy.stopLoss.stockPrice}</span>
      </div>
      <div className="tc-exit-row">
        <span className="tc-exit-type">TIME</span>
        <span className="tc-exit-pct" />
        <span className="tc-exit-rule">{exitStrategy.timeStop.rule} · close by {exitStrategy.timeStop.date}</span>
      </div>
      {exitStrategy.earningsWarning && (
        <p className="tc-exit-warning">⚠ {exitStrategy.earningsWarning}</p>
      )}
    </div>
  );
}
