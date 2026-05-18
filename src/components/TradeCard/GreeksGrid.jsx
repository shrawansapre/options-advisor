import { parseBold } from "../../utils";
import IVGauge from "../IVGauge";

const GREEK_SYMBOL = { DELTA: "Δ", THETA: "Θ", VEGA: "ν", GAMMA: "Γ" };

export default function GreeksGrid({ greeks, strategyRationale, strategy, ivRank, hideIV = false }) {
  if (!greeks) return null;

  const rows = [
    {
      name: "DELTA",
      value: greeks.delta?.value ?? "—",
      desc: `$1 move = ${Math.abs((parseFloat(greeks.delta?.value ?? 0) * 100)).toFixed(0)}¢ on your contract`,
      insight: greeks.delta?.insight,
    },
    {
      name: "THETA",
      value: greeks.theta?.value ?? "—",
      desc: greeks.theta?.dailyCost ? `${greeks.theta.dailyCost}/day · ${greeks.theta.weeklyDrain}/week` : "",
      insight: greeks.theta?.insight,
    },
    {
      name: "VEGA",
      value: greeks.vega?.value ?? "—",
      desc: `+$${(parseFloat(greeks.vega?.value ?? 0) * 100).toFixed(0)} per 1% IV rise`,
      insight: greeks.vega?.insight,
    },
    {
      name: "GAMMA",
      value: greeks.gamma?.value ?? "—",
      desc: "Delta sensitivity",
      insight: greeks.gamma?.insight,
    },
  ];

  return (
    <>
      {!hideIV && (
        <div className="tc-section">
          <div className="tc-section-label">IV ENVIRONMENT</div>
          <IVGauge value={ivRank} reading={greeks.ivRankReading} />
          {greeks.ivRankInsight && <p className="tc-body">{greeks.ivRankInsight}</p>}
          {strategyRationale && (
            <p className="tc-body">Why {strategy}: {parseBold(strategyRationale)}</p>
          )}
        </div>
      )}
      <div className="tc-section">
        <div className="tc-section-label">GREEKS</div>
        {rows.map(({ name, value, desc, insight }) => (
          <div key={name} className="tc-greek-row">
            <span className="tc-greek-name">
              <span className="tc-greek-symbol">{GREEK_SYMBOL[name]}</span>
              {name}
            </span>
            <span className="tc-greek-value">{value}</span>
            <span className="tc-greek-desc">{desc}</span>
            {insight && <p className="tc-greek-insight">{insight}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
