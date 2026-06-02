import { useState } from "react";
import { probITM, spreadCost, expectedMove } from "../../lib/signals.js";

const fmtUsd = (n) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`;
const fmtExp = (e) => (e ? e.slice(5).replace("-", "/") : "—");

export default function LeaderboardRow({ print: c, onAnalyze }) {
  const [open, setOpen] = useState(false);
  const side = c.side === "call" ? "call" : "put";
  const strike = c.strike != null ? `$${parseFloat(c.strike).toFixed(0)}${side === "call" ? "C" : "P"}` : "—";
  const volOi = c._volOi != null ? `${c._volOi.toFixed(1)}×` : "—";
  const iv = c.iv != null ? `${(parseFloat(c.iv) * 100).toFixed(0)}` : "—";
  const prob = `${(probITM(c) * 100).toFixed(0)}%`;
  const sc = spreadCost(c);
  const em = expectedMove(c.strike, parseFloat(c.iv) || 0, c.dte);

  return (
    <>
      <tr className={`disc-row disc-row--${side}`} onClick={() => setOpen((o) => !o)}>
        <td className="disc-td disc-td--ticker">{c.ticker}</td>
        <td className="disc-td disc-td--mono">{strike} {fmtExp(c.expiration)}</td>
        <td className="disc-td disc-td--mono disc-td--hero">{fmtUsd(c._dollarVol ?? 0)}</td>
        <td className="disc-td disc-td--mono disc-td--hl">{volOi}</td>
        <td className={`disc-td disc-dir disc-dir--${side}`}>{side === "call" ? "▲ buyers" : "▼ buyers"}</td>
        <td className="disc-td disc-td--mono">{prob}</td>
        <td className="disc-td disc-td--mono">{iv}</td>
        <td className="disc-td">
          <button className="disc-analyze-btn" onClick={(e) => { e.stopPropagation(); onAnalyze(c.ticker); }}>Analyze →</button>
        </td>
      </tr>
      {open && (
        <tr className="disc-expand-row">
          <td className="disc-expand-cell" colSpan={8}>
            <span className="disc-greek">Δ {c.delta != null ? parseFloat(c.delta).toFixed(2) : "—"}</span>
            <span className="disc-greek">Θ {c.theta != null ? parseFloat(c.theta).toFixed(3) : "—"}</span>
            <span className="disc-greek">ν {c.vega != null ? parseFloat(c.vega).toFixed(3) : "—"}</span>
            <span className="disc-greek">DTE {c.dte ?? "—"}</span>
            <span className="disc-greek">Spread {sc != null ? `${(sc * 100).toFixed(0)}%` : "—"}</span>
            <span className="disc-greek">Exp.move ±{em.toFixed(1)}</span>
          </td>
        </tr>
      )}
    </>
  );
}
