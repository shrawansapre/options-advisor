import { useState } from "react";
import TradeCard from "./TradeCard";
import ErrorBoundary from "./ErrorBoundary";
import DesktopComparisonTable from "./DesktopComparisonTable";

const TIER_COLOR = {
  conservative: "green",
  moderate: "amber",
  aggressive: "red",
};

const TIER_LABEL = {
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Aggressive",
};

function MobileSwitcher({ trades, selected, onSelect }) {
  return (
    <div className="msw-wrap">
      <div className="msw-bar">
        {trades.map((trade, i) => {
          const color = TIER_COLOR[trade.riskTier] ?? "amber";
          const label = TIER_LABEL[trade.riskTier] ?? trade.riskTier;
          const isActive = selected === i;
          return (
            <button
              key={i}
              className={`msw-btn msw-btn--${color}${isActive ? " msw-btn--active" : ""}`}
              onClick={() => onSelect(i)}
            >
              <span className="msw-tier">{label}</span>
              <span className="msw-strat">{trade.strategy ?? "—"}</span>
              <div className="msw-stats">
                <span className="msw-stat msw-stat--profit">{trade.maxProfit ?? "—"}</span>
                <span className="msw-stat msw-stat--loss">{trade.maxLoss ?? "—"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MultiTradeView({ trades, chainData, analysedAt, marketContext, hasLiveData, marketSessionLabel }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedTier, setSelectedTier] = useState(0);

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

  const selectedTrade = trades[selectedTier] ?? trades[0];

  return (
    <>
      {/* Desktop: comparison table (hidden on mobile via CSS) */}
      <ErrorBoundary>
        <DesktopComparisonTable
          trades={trades} chainData={chainData} analysedAt={analysedAt}
          hasLiveData={hasLiveData} marketContext={marketContext}
        />
      </ErrorBoundary>

      {/* Mobile: strategy switcher + selected full card */}
      <div className="mtv-mobile">
        <MobileSwitcher trades={trades} selected={selectedTier} onSelect={setSelectedTier} />
        <ErrorBoundary>
          <TradeCard
            key={selectedTrade.riskTier}
            trade={selectedTrade} index={0} chainData={chainData} analysedAt={analysedAt}
            marketContext={marketContext} hasLiveData={hasLiveData} marketSessionLabel={marketSessionLabel}
            activeTab={activeTab} onTabChange={setActiveTab}
          />
        </ErrorBoundary>
      </div>
    </>
  );
}
