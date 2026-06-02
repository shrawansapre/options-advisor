import { useState } from "react";
import { probITM, spreadCost } from "../../lib/signals.js";

const fmtUsd = (n) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`;
const fmtExp = (e) => (e ? e.slice(5).replace("-", "/") : "—");

export default function PrintCard({ print: c, onAnalyze }) {
  const [open, setOpen] = useState(false);
  const side = c.side === "call" ? "call" : "put";
  const sc = spreadCost(c);
  return (
    <div className={`disc-card disc-card--${side}`} onClick={() => setOpen((o) => !o)}>
      <div className="disc-card__top">
        <div className="disc-card__id">
          <span className="disc-ticker">{c.ticker}</span>
          <span className={`disc-side disc-side--${side}`}>{side === "call" ? "C" : "P"}</span>
          <span className="disc-card__strike">${parseFloat(c.strike).toFixed(0)} {fmtExp(c.expiration)}</span>
        </div>
        <span className="disc-card__hero">{fmtUsd(c._dollarVol ?? 0)}</span>
      </div>
      <div className="disc-card__stats">
        <span>{c._volOi != null ? `${c._volOi.toFixed(1)}× vol/OI` : "—"}</span>
        <span>{(probITM(c) * 100).toFixed(0)}%</span>
        <span>IV {c.iv != null ? (parseFloat(c.iv) * 100).toFixed(0) : "—"}</span>
      </div>
      <div className="disc-card__action">
        <span className={`disc-dir disc-dir--${side}`}>{side === "call" ? "▲ buyers" : "▼ buyers"}</span>
        <button className="disc-analyze-btn" onClick={(e) => { e.stopPropagation(); onAnalyze(c.ticker); }}>Analyze →</button>
      </div>
      {open && (
        <div className="disc-card__greeks">
          <span className="disc-greek">Δ {c.delta != null ? parseFloat(c.delta).toFixed(2) : "—"}</span>
          <span className="disc-greek">Θ {c.theta != null ? parseFloat(c.theta).toFixed(3) : "—"}</span>
          <span className="disc-greek">ν {c.vega != null ? parseFloat(c.vega).toFixed(3) : "—"}</span>
          <span className="disc-greek">DTE {c.dte ?? "—"}</span>
          <span className="disc-greek">Spread {sc != null ? `${(sc * 100).toFixed(0)}%` : "—"}</span>
        </div>
      )}
    </div>
  );
}
