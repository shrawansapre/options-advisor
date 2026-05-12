import { useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Shield, Activity, Zap } from "lucide-react";
import TradeCard from "./TradeCard";
import ErrorBoundary from "./ErrorBoundary";

const TIER = {
  conservative: { label: "Conservative", sub: "Low risk · income focus",   color: "green",  Icon: Shield   },
  moderate:     { label: "Moderate",     sub: "Balanced risk / reward",    color: "amber",  Icon: Activity },
  aggressive:   { label: "Aggressive",   sub: "High return potential",     color: "red",    Icon: Zap      },
};

export default function MultiTradeView({ trades, analysedAt, marketContext }) {
  const [active, setActive] = useState(0);
  const controls = useAnimationControls();

  async function switchTo(i) {
    if (i === active) return;
    await controls.start({ opacity: 0, y: -6, transition: { duration: 0.14, ease: "easeIn" } });
    setActive(i);
    controls.start({ opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } });
  }

  if (!trades?.length) return null;

  if (trades.length === 1) {
    return (
      <ErrorBoundary>
        <TradeCard trade={trades[0]} index={0} analysedAt={analysedAt} marketContext={marketContext} />
      </ErrorBoundary>
    );
  }

  const activeTrade = trades[active];

  return (
    <div className="multi-trade">
      <div className="tier-selector">
        {trades.map((trade, i) => {
          const cfg = TIER[trade.riskTier] ?? { label: trade.riskTier ?? "Option", sub: "", color: "amber", Icon: Minus };
          const { label, sub, color, Icon } = cfg;
          const isActive = i === active;
          return (
            <button
              key={i}
              className={`tier-tab tier-tab--${color}${isActive ? " tier-tab--active" : ""}`}
              onClick={() => switchTo(i)}
            >
              <div className="tier-tab-head">
                <span className={`tier-tab-icon tier-tab-icon--${color}`}><Icon size={13} /></span>
                <div>
                  <div className="tier-tab-label">{label}</div>
                  <div className="tier-tab-sub">{sub}</div>
                </div>
              </div>
              <div className="tier-tab-strategy">{trade.strategy}</div>
              <div className="tier-tab-row">
                <div className="tier-metric">
                  <span className="tier-metric-label">Max profit</span>
                  <span className="tier-metric-value tier-metric-value--profit">{trade.maxProfit}</span>
                </div>
                <div className="tier-metric">
                  <span className="tier-metric-label">Max loss</span>
                  <span className="tier-metric-value tier-metric-value--loss">{trade.maxLoss}</span>
                </div>
                <div className="tier-metric">
                  <span className="tier-metric-label">Entry</span>
                  <span className="tier-metric-value">{trade.entryPrice ? `$${trade.entryPrice}` : trade.totalCost}</span>
                </div>
              </div>
              {isActive && <div className="tier-tab-active-bar" />}
            </button>
          );
        })}
      </div>

      <motion.div animate={controls} initial={{ opacity: 1, y: 0 }}>
        <ErrorBoundary>
          <TradeCard trade={activeTrade} index={0} analysedAt={analysedAt} marketContext={marketContext} />
        </ErrorBoundary>
      </motion.div>
    </div>
  );
}
