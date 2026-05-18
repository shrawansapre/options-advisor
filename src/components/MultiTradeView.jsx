import { useState } from "react";
import TradeCard from "./TradeCard";
import ErrorBoundary from "./ErrorBoundary";
import DesktopComparisonTable from "./DesktopComparisonTable";
import MobileComparisonView from "./MobileComparisonView";

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
    <>
      {/* Desktop: comparison table (hidden on mobile via CSS) */}
      <ErrorBoundary>
        <DesktopComparisonTable
          trades={trades} chainData={chainData} analysedAt={analysedAt}
          hasLiveData={hasLiveData} marketContext={marketContext}
        />
      </ErrorBoundary>

      {/* Mobile: 3-column comparison view */}
      <div className="mtv-mobile">
        <ErrorBoundary>
          <MobileComparisonView
            trades={trades} chainData={chainData} analysedAt={analysedAt}
            hasLiveData={hasLiveData} marketContext={marketContext}
          />
        </ErrorBoundary>
      </div>
    </>
  );
}
