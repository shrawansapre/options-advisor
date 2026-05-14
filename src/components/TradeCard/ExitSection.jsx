import { AlertTriangle, Clock, Target, TrendingDown, TrendingUp } from "lucide-react";

export default function ExitSection({ exitStrategy }) {
  return (
    <div className="card">
      <div className="card-label"><Target size={11} /> Exit strategy</div>
      <div className="exit-grid">
        <div className="exit-rule profit">
          <div className="exit-rule-head">
            <TrendingUp size={14} className="exit-icon-svg green-text" />
            <span className="exit-title">Take profit</span>
            <span className="exit-pct green-text">+{exitStrategy.profitTarget.returnPct}%</span>
          </div>
          <p className="exit-desc">{exitStrategy.profitTarget.rule}</p>
          <div className="exit-meta">Stock at {exitStrategy.profitTarget.stockPrice}</div>
        </div>
        <div className="exit-rule stop">
          <div className="exit-rule-head">
            <TrendingDown size={14} className="exit-icon-svg red-text" />
            <span className="exit-title">Stop loss</span>
            <span className="exit-pct red-text">−{exitStrategy.stopLoss.lossPct}%</span>
          </div>
          <p className="exit-desc">{exitStrategy.stopLoss.rule}</p>
          <div className="exit-meta">Stock at {exitStrategy.stopLoss.stockPrice}</div>
        </div>
        <div className="exit-rule time">
          <div className="exit-rule-head">
            <Clock size={14} className="exit-icon-svg amber-text" />
            <span className="exit-title">Time stop</span>
          </div>
          <p className="exit-desc">{exitStrategy.timeStop.rule}</p>
          <div className="exit-meta">Close by {exitStrategy.timeStop.date}</div>
        </div>
      </div>
      {exitStrategy.earningsWarning && (
        <div className="earnings-warning">
          <AlertTriangle size={13} />
          <span>{exitStrategy.earningsWarning}</span>
        </div>
      )}
    </div>
  );
}
