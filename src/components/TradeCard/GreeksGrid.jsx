import { Activity, Crosshair, Layers, Timer, Zap } from "lucide-react";
import IVGauge from "../IVGauge";
import { parseBold } from "../../utils";

export default function GreeksGrid({ greeks, strategyRationale, strategy, ivRank }) {
  const greekDefs = [
    { Icon: Crosshair, color: "navy",   name: "Delta", symbol: "Δ",
      value: greeks.delta.value,
      tagline: `$1 move = ${(parseFloat(greeks.delta.value) * 100).toFixed(0)}¢ on your contract`,
      insight: greeks.delta.insight },
    { Icon: Timer,     color: "red",    name: "Theta", symbol: "Θ",
      value: greeks.theta.value,
      tagline: `${greeks.theta.dailyCost}/day · ${greeks.theta.weeklyDrain}/week decay`,
      insight: greeks.theta.insight },
    { Icon: Zap,       color: "green",  name: "Gamma", symbol: "Γ",
      value: greeks.gamma.value,
      tagline: "Acceleration on large moves",
      insight: greeks.gamma.insight },
    { Icon: Activity,  color: "violet", name: "Vega",  symbol: "ν",
      value: greeks.vega.value,
      tagline: `+$${(parseFloat(greeks.vega.value) * 100).toFixed(0)} per 1% IV rise`,
      insight: greeks.vega.insight },
  ];

  return (
    <>
      <div className="card card-inner-split">
        <div className="card-inner-col">
          <div className="card-label"><Activity size={11} /> Implied volatility rank</div>
          <IVGauge value={ivRank} reading={greeks.ivRankReading} />
          <p className="iv-insight">{greeks.ivRankInsight}</p>
        </div>
        {strategyRationale && (
          <div className="card-inner-col">
            <div className="card-label"><Layers size={11} /> Why {strategy}</div>
            <p className="rationale-text">{parseBold(strategyRationale)}</p>
          </div>
        )}
      </div>
      <div className="greek-grid">
        {greekDefs.map(({ Icon, color, name, symbol, value, tagline, insight }) => (
          <div key={name} className="card greek-card">
            <div className="greek-watermark">{symbol}</div>
            <div className="greek-top">
              <div className={`greek-icon-wrap color-${color}`}><Icon size={14} /></div>
              <div className="greek-meta">
                <div className="greek-name">{name}</div>
                <div className="greek-tagline">{tagline}</div>
              </div>
              <div className="greek-value">{value}</div>
            </div>
            <p className="greek-insight">{insight}</p>
          </div>
        ))}
      </div>
    </>
  );
}
