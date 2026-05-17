import { useState } from "react";
import TradeCard from "./TradeCard";
import ErrorBoundary from "./ErrorBoundary";

const TIER_COLOR = {
  conservative: "green",
  moderate: "amber",
  aggressive: "red",
};

export default function MultiTradeView({ trades, chainData, analysedAt, marketContext, hasLiveData, marketSessionLabel }) {
  const [activeTab, setActiveTab] = useState("summary");

  if (!trades?.length) return null;

  if (trades.length === 1) {
    return (
      <ErrorBoundary>
        <TradeCard
          trade={trades[0]} index={0} chainData={chainData} analysedAt={analysedAt}
          marketContext={marketContext} hasLiveData={hasLiveData} marketSessionLabel={marketSessionLabel}
          activeTab={activeTab} onTabChange={setActiveTab}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="mtv-grid">
      {trades.map((trade, i) => {
        const color = TIER_COLOR[trade.riskTier] ?? "amber";
        const label = trade.riskTier ? trade.riskTier.toUpperCase() : `OPTION ${i + 1}`;
        return (
          <div key={trade.riskTier ?? i} className="mtv-col">
            <div className={`mtv-col-header mtv-col-header--${color}`}>{label}</div>
            <ErrorBoundary>
              <TradeCard
                trade={trade} index={i} chainData={chainData} analysedAt={analysedAt}
                marketContext={marketContext} hasLiveData={hasLiveData} marketSessionLabel={marketSessionLabel}
                activeTab={activeTab} onTabChange={setActiveTab}
              />
            </ErrorBoundary>
          </div>
        );
      })}
    </div>
  );
}
