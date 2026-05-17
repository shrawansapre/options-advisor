import { useState } from "react";
import TradeCard from "./TradeCard";
import ErrorBoundary from "./ErrorBoundary";

const TIER_COLOR = {
  conservative: "green",
  moderate: "amber",
  aggressive: "red",
};

const TIER_ABBR = {
  conservative: "CONS",
  moderate: "MOD",
  aggressive: "AGG",
};

function rrRatio(trade) {
  const win  = parseFloat((trade.maxProfit ?? "").replace(/[^0-9.]/g, ""));
  const loss = parseFloat((trade.maxLoss   ?? "").replace(/[^0-9.]/g, ""));
  return (!isNaN(win) && !isNaN(loss) && loss > 0) ? (win / loss).toFixed(1) + ":1" : "—";
}

function probDisplay(trade) {
  return trade.predictions?.baseCase?.probability ?? "—";
}

function MobileMatrix({ trades, selected, onSelect }) {
  const rows = [
    { key: "entry",  label: "ENTRY", get: t => t.totalCost,    cls: "" },
    { key: "win",    label: "WIN",   get: t => t.maxProfit,     cls: "mtv-matrix-td--profit" },
    { key: "loss",   label: "LOSS",  get: t => t.maxLoss,       cls: "mtv-matrix-td--loss" },
    { key: "prob",   label: "PROB",  get: t => probDisplay(t),  cls: "" },
    { key: "rr",     label: "R/R",   get: t => rrRatio(t),      cls: "" },
  ];

  return (
    <table className="mtv-matrix">
      <thead>
        <tr>
          <th />
          {trades.map((trade, i) => {
            const color = TIER_COLOR[trade.riskTier] ?? "amber";
            const abbr  = TIER_ABBR[trade.riskTier]  ?? trade.riskTier?.toUpperCase() ?? `T${i+1}`;
            return (
              <th key={i} className={selected === i ? "mtv-matrix-th--active" : ""}>
                <button className="mtv-matrix-th-btn" onClick={() => onSelect(i)}>
                  <span className={`mtv-matrix-abbr mtv-matrix-abbr--${color}`}>{abbr}</span>
                  <span className="mtv-matrix-strat">{trade.strategy}</span>
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.key}>
            <td>{row.label}</td>
            {trades.map((trade, i) => (
              <td key={i} className={[selected === i ? "mtv-matrix-td--active" : "", row.cls].filter(Boolean).join(" ")}>
                {row.get(trade) ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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
  const selectedColor = TIER_COLOR[selectedTrade.riskTier] ?? "amber";
  const selectedAbbr  = TIER_ABBR[selectedTrade.riskTier]  ?? selectedTrade.riskTier?.toUpperCase();

  return (
    <>
      {/* Desktop: three columns side by side */}
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

      {/* Mobile: comparison matrix + selected full card */}
      <div className="mtv-mobile">
        <MobileMatrix trades={trades} selected={selectedTier} onSelect={setSelectedTier} />
        <div className="mtv-mobile-card-label">
          <span className={`mtv-matrix-abbr mtv-matrix-abbr--${selectedColor}`}>{selectedAbbr}</span>
          <span>{selectedTrade.strategy}</span>
        </div>
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
