import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useRef, useState } from "react";
import { PayoffChart, ThetaDecayChart } from "../TradeCharts";
import ShareMenu from "./ShareMenu";
import EntrySection from "./EntrySection";
import ExitSection from "./ExitSection";
import GreeksGrid from "./GreeksGrid";
import ThesisRisk from "./ThesisRisk";
import ScenariosSection from "./ScenariosSection";
import SignalsSection from "./SignalsSection";
import ChecklistSection from "./ChecklistSection";

export default function TradeCard({ trade, index, chainData, analysedAt, marketContext, hasLiveData, marketSessionLabel, activeTab, onTabChange }) {
  const { summary, entryTiming, exitStrategy, predictions, greeks,
          watchFor, rationale, riskLevel, riskFactors, robinhoodSteps,
          strategyRationale, sources } = trade;

  const snapshotRef = useRef(null);
  const [localTab, setLocalTab] = useState("summary");
  const tab = activeTab ?? localTab;
  const setTab = onTabChange ?? setLocalTab;

  const expiryExpired = trade.expiry && analysedAt && new Date(trade.expiry) < analysedAt;
  const validSources = sources?.filter(s => s.url?.startsWith("http")) ?? [];
  const isSpread = !!trade.strike2;
  const strikeDisplay = isSpread ? `$${trade.strike}/$${trade.strike2}` : `$${trade.strike}`;

  const maxProfitNum = parseFloat((trade.maxProfit ?? "").replace(/[^0-9.]/g, ""));
  const maxLossNum   = parseFloat((trade.maxLoss   ?? "").replace(/[^0-9.]/g, ""));
  const rrRatio = (!isNaN(maxProfitNum) && !isNaN(maxLossNum) && maxLossNum > 0)
    ? (maxProfitNum / maxLossNum).toFixed(1) + ":1"
    : "—";

  const probDisplay = predictions?.baseCase?.probability ?? "—";

  return (
    <>
    <motion.article
      className="trade-card"
      data-strategy={trade.strategyType}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.12 }}
    >
      {expiryExpired && (
        <div className="expired-warning">
          <AlertTriangle size={14} />
          <span>This option expired on <strong>{trade.expiryLabel}</strong>. This analysis is stale — please search again for a current trade.</span>
        </div>
      )}

      <div className="tc-header-line">
        <span className="tc-ticker">{trade.ticker}</span>
        <span className="tc-price">${trade.currentPrice}</span>
        <span className="tc-sep">·</span>
        <span className="tc-strategy">{trade.strategy}</span>
        <span className="tc-sep">·</span>
        <span className={`tc-data-badge tc-data-badge--${hasLiveData ? "live" : "web"}`}>
          {hasLiveData ? "Live" : "Web"}
        </span>
        {analysedAt && (
          <span className="tc-time">
            {analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <div className="tc-share-wrap">
          <ShareMenu trade={trade} analysedAt={analysedAt} marketContext={marketContext} snapshotRef={snapshotRef} />
        </div>
      </div>

      <div className="tc-grid">
        <div className="tc-grid-row">
          <div className="tc-cell">
            <span className="tc-cell-label">STRIKES</span>
            <span className="tc-cell-value">{strikeDisplay}</span>
          </div>
          <div className="tc-cell">
            <span className="tc-cell-label">EXPIRY</span>
            <span className="tc-cell-value">{trade.expiryLabel}</span>
          </div>
          <div className="tc-cell">
            <span className="tc-cell-label">DTE</span>
            <span className="tc-cell-value">{trade.daysToExpiry}</span>
          </div>
          <div className="tc-cell">
            <span className="tc-cell-label">ENTRY</span>
            <span className="tc-cell-value">{trade.totalCost?.split(/\s/)[0] ?? "—"}</span>
          </div>
          <div className="tc-cell">
            <span className="tc-cell-label">MAX WIN</span>
            <span className="tc-cell-value tc-cell-value--profit">{trade.maxProfit}</span>
          </div>
          <div className="tc-cell">
            <span className="tc-cell-label">MAX LOSS</span>
            <span className="tc-cell-value tc-cell-value--loss">{trade.maxLoss}</span>
          </div>
          <div className="tc-cell">
            <span className="tc-cell-label">B/E</span>
            <span className="tc-cell-value">${trade.breakeven}</span>
          </div>
        </div>
        <div className="tc-grid-divider" />
        <div className="tc-grid-row">
          <div className="tc-cell">
            <span className="tc-cell-label">IV RANK</span>
            <span className="tc-cell-value">{trade.ivRank}</span>
          </div>
          <div className="tc-cell">
            <span className="tc-cell-label">DELTA</span>
            <span className="tc-cell-value">
              {greeks?.delta?.value != null
                ? (isNaN(+greeks.delta.value) ? greeks.delta.value : (+greeks.delta.value).toFixed(2))
                : "—"}
            </span>
          </div>
          <div className="tc-cell">
            <span className="tc-cell-label">PROB</span>
            <span className="tc-cell-value">{probDisplay}</span>
          </div>
          <div className="tc-cell">
            <span className="tc-cell-label">R/R</span>
            <span className="tc-cell-value">{rrRatio}</span>
          </div>
        </div>
      </div>

      <div className="tc-tab-bar">
        {["summary", "greeks", "analysis"].map(t => (
          <button
            key={t}
            className={`tc-tab${tab === t ? " tc-tab--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="tc-tab-content">
        {tab === "summary" && (
          <>
            <ThesisRisk rationale={rationale} riskLevel={riskLevel} riskFactors={riskFactors} />
            <EntrySection entryTiming={entryTiming} />
            <ExitSection exitStrategy={exitStrategy} />
            <SignalsSection watchFor={watchFor} sources={validSources} robinhoodSteps={robinhoodSteps} />
          </>
        )}
        {tab === "greeks" && (
          <GreeksGrid greeks={greeks} strategyRationale={strategyRationale} strategy={trade.strategy} ivRank={trade.ivRank} />
        )}
        {tab === "analysis" && (
          <>
            <ScenariosSection predictions={predictions} />
            <PayoffChart trade={trade} />
            <ThetaDecayChart trade={trade} analysedAt={analysedAt} />
          </>
        )}
      </div>

      <ChecklistSection trade={trade} chainData={chainData} />
    </motion.article>

    {/* Off-screen compact snapshot — only used for image capture */}
    <div ref={snapshotRef} className="share-snapshot" data-strategy={trade.strategyType}>
      <div className={`ss-flag ss-flag--${trade.riskTier ?? "moderate"}`}>
        <span className="ss-flag-name">{trade.strategy}</span>
        <span className="ss-flag-tier">
          {trade.riskTier === "conservative" ? "Conservative" :
           trade.riskTier === "moderate"     ? "Moderate"     : "Aggressive"}
          {" · "}
          {trade.strategyType === "bullish" ? "Bullish" :
           trade.strategyType === "bearish" ? "Bearish" : "Neutral"}
        </span>
      </div>
      <div className="ss-hero">
        <span className="ss-ticker">{trade.ticker}</span>
        <div className="ss-price-col">
          <span className="ss-price">${trade.currentPrice}</span>
          <span className="ss-price-label">current price</span>
        </div>
      </div>
      <p className="ss-headline">{summary.headline}</p>
      <div className="ss-grid">
        <div className="ss-cell ss-cell--primary">
          <span className="ss-label">Entry</span>
          <span className="ss-value">{trade.totalCost}</span>
        </div>
        <div className="ss-cell">
          <span className="ss-label">Max profit</span>
          <span className="ss-value ss-value--profit">{trade.maxProfit}</span>
        </div>
        <div className="ss-cell">
          <span className="ss-label">Max loss</span>
          <span className="ss-value ss-value--loss">{trade.maxLoss}</span>
        </div>
      </div>
      {trade.watchFor?.warningSignals?.length > 0 && (
        <div className="ss-warnings">
          <span className="ss-warnings-label">Watch out for</span>
          <ul className="ss-warnings-list">
            {trade.watchFor.warningSignals.slice(0, 3).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="ss-footer">
        ◈ Options Brief{analysedAt ? ` · ${analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""} · Educational purposes only
      </div>
    </div>
    </>
  );
}
