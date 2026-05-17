import { parseBold } from "../../utils";

export default function GreeksGrid({ greeks, strategyRationale, strategy, ivRank }) {
  const ivNum = parseInt(ivRank, 10) || 0;
  const filled = Math.round((ivNum / 100) * 28);
  const ivBar = "█".repeat(filled) + "░".repeat(28 - filled);

  const rows = [
    {
      name: "DELTA",
      value: greeks.delta.value,
      desc: `$1 move = ${Math.abs((parseFloat(greeks.delta.value) * 100)).toFixed(0)}¢ on your contract`,
      insight: greeks.delta.insight,
    },
    {
      name: "THETA",
      value: greeks.theta.value,
      desc: `${greeks.theta.dailyCost}/day · ${greeks.theta.weeklyDrain}/week`,
      insight: greeks.theta.insight,
    },
    {
      name: "VEGA",
      value: greeks.vega.value,
      desc: `+$${(parseFloat(greeks.vega.value) * 100).toFixed(0)} per 1% IV rise`,
      insight: greeks.vega.insight,
    },
    {
      name: "GAMMA",
      value: greeks.gamma.value,
      desc: "Delta sensitivity",
      insight: greeks.gamma.insight,
    },
  ];

  return (
    <>
      <div className="tc-section">
        <div className="tc-section-label">IV ENVIRONMENT</div>
        <div className="tc-iv-row">
          <span className="tc-kv-key">IV RANK</span>
          <span className="tc-kv-val">{ivRank}</span>
          <span className="tc-kv-desc">{greeks.ivRankReading}</span>
        </div>
        <div className="tc-iv-bar">[{ivBar}] {ivNum}</div>
        <p className="tc-body tc-body--muted">{greeks.ivRankInsight}</p>
        {strategyRationale && (
          <p className="tc-body">Why {strategy}: {parseBold(strategyRationale)}</p>
        )}
      </div>
      <div className="tc-section">
        <div className="tc-section-label">GREEKS</div>
        {rows.map(({ name, value, desc, insight }) => (
          <div key={name} className="tc-greek-row">
            <span className="tc-greek-name">{name}</span>
            <span className="tc-greek-value">{value}</span>
            <span className="tc-greek-desc">{desc}</span>
            <p className="tc-greek-insight">{insight}</p>
          </div>
        ))}
      </div>
    </>
  );
}
