import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, Target } from "lucide-react";
import { useRef } from "react";
import { STRATEGY_COLORS, ordinalSuffix } from "../../utils";
import { PayoffChart, ThetaDecayChart } from "../TradeCharts";
import ShareMenu from "./ShareMenu";
import EntrySection from "./EntrySection";
import ExitSection from "./ExitSection";
import GreeksGrid from "./GreeksGrid";
import ThesisRisk from "./ThesisRisk";
import ScenariosSection from "./ScenariosSection";
import SignalsSection from "./SignalsSection";

export default function TradeCard({ trade, index, analysedAt, marketContext, hasLiveData, marketSessionLabel }) {
  const { summary, entryTiming, exitStrategy, predictions, greeks, watchFor,
          rationale, riskLevel, riskFactors, robinhoodSteps,
          strategyRationale, sources } = trade;

  const cardRef = useRef(null);
  const snapshotRef = useRef(null);

  const expiryExpired = trade.expiry && analysedAt && new Date(trade.expiry) < analysedAt;
  const validSources = sources?.filter(s => s.url?.startsWith("http")) ?? [];
  const dotColor = STRATEGY_COLORS[trade.strategyType] || STRATEGY_COLORS.neutral;
  const isSpread = !!trade.strike2;
  const strikeDisplay = isSpread ? `$${trade.strike} / $${trade.strike2}` : `$${trade.strike}`;
  const convictionColor = summary.conviction === "High" ? "var(--green)"
    : summary.conviction === "Medium" ? "var(--amber)" : "var(--t3)";
  const ivNum = parseInt(trade.ivRank, 10) || 0;

  return (
    <>
    <motion.article
      ref={cardRef}
      className="trade-card"
      data-strategy={trade.strategyType}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.12 }}
    >
      <div className={`trade-strategy-flag trade-strategy-flag--${trade.riskTier ?? "moderate"}`}>
        <span className="flag-strategy-name">{trade.strategy}</span>
        <span className="flag-risk-tier">
          {trade.riskTier === "conservative" ? "Conservative" :
           trade.riskTier === "moderate"     ? "Moderate"     : "Aggressive"}
          {" · "}
          {trade.strategyType === "bullish" ? "Bullish" :
           trade.strategyType === "bearish" ? "Bearish" : "Neutral"}
        </span>
      </div>

      {expiryExpired && (
        <div className="expired-warning">
          <AlertTriangle size={14} />
          <span>This option expired on <strong>{trade.expiryLabel}</strong>. This analysis is stale — please search again for a current trade.</span>
        </div>
      )}

      <div className="trade-header">
        <div className="trade-top-bar">
          <div className="trade-top-bar-left">
            {analysedAt && (
              <span className="trade-analysis-time">
                <Clock size={11} />
                {analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {hasLiveData !== undefined && (
              <span className={`source-chip source-chip--${hasLiveData ? "live" : "web"}`}>
                <span className="source-chip-dot" />
                {hasLiveData ? "Live data" : "Web search"}
              </span>
            )}
          </div>
          <div className="trade-top-bar-right">
            <ShareMenu trade={trade} analysedAt={analysedAt} marketContext={marketContext} snapshotRef={snapshotRef} />
          </div>
        </div>

        <div className="trade-hero-row">
          <h2 className="trade-ticker">{trade.ticker}</h2>
          <div className="trade-stock-price">
            <span className="stock-price-value">${trade.currentPrice}</span>
            <span className="stock-price-label">
              {hasLiveData && marketSessionLabel ? marketSessionLabel : "current price"}
            </span>
          </div>
        </div>

        <div className="trade-meta-line">
          <span className="trade-meta-conviction" style={{ color: convictionColor }}>{summary.conviction} conviction</span>
        </div>

        <h3 className="trade-header-headline">{summary.headline}</h3>

        <div className="trade-data-block">
          <div className="data-row data-row--contract">
            <div className="data-cell data-cell--primary">
              <span className="data-label">Strike{isSpread ? "s" : ""}</span>
              <span className="data-value">{strikeDisplay}</span>
            </div>
            <div className="data-cell">
              <span className="data-label">Break-even</span>
              <span className="data-value">${trade.breakeven}</span>
            </div>
            <div className="data-cell">
              <span className="data-label">Expiry</span>
              <span className="data-value">{trade.expiryLabel}</span>
              <span className="data-sub">{trade.daysToExpiry} days</span>
            </div>
            <div className="data-cell">
              <span className="data-label">IV rank</span>
              <span className="data-value">{trade.ivRank}<sup className="data-ord">{ordinalSuffix(ivNum)}</sup></span>
            </div>
          </div>
          <div className="data-row-divider" />
          <div className="data-row data-row--financials">
            <div className="data-cell">
              <span className="data-label">Entry cost</span>
              <span className="data-value">{trade.totalCost}</span>
            </div>
            <div className="data-cell">
              <span className="data-label">Max profit</span>
              <span className="data-value data-value--profit">{trade.maxProfit}</span>
            </div>
            <div className="data-cell">
              <span className="data-label">Max loss</span>
              <span className="data-value data-value--loss">{trade.maxLoss}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="trade-content">
        <div className="card card-hero">
          <p className="plain-english">{summary.plainEnglish}</p>
          {summary.whenToBuySimple && (
            <div className="entry-hint">
              <Target size={13} className="entry-hint-icon" />
              <span>{summary.whenToBuySimple}</span>
            </div>
          )}
          <div className="sell-hint">
            <CheckCircle2 size={13} className="sell-hint-icon" />
            <span>{summary.whenToSellSimple}</span>
          </div>
        </div>

        <EntrySection entryTiming={entryTiming} />
        <ExitSection exitStrategy={exitStrategy} />
        <GreeksGrid greeks={greeks} strategyRationale={strategyRationale} strategy={trade.strategy} ivRank={trade.ivRank} />
        <ThesisRisk rationale={rationale} riskLevel={riskLevel} riskFactors={riskFactors} />
        <ScenariosSection predictions={predictions} />
        <PayoffChart trade={trade} />
        <ThetaDecayChart trade={trade} analysedAt={analysedAt} />
        <SignalsSection watchFor={watchFor} sources={validSources} robinhoodSteps={robinhoodSteps} />
      </div>
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
      <div className="ss-header">
        <span className="ss-brand">◈ Options Advisor</span>
        <span className="ss-brand-sub">AI-powered options analysis</span>
      </div>
      <div className="ss-hero">
        <span className="ss-ticker">{trade.ticker}</span>
        <div className="ss-price-col">
          <span className="ss-price">${trade.currentPrice}</span>
          <span className="ss-price-label">current price</span>
        </div>
      </div>
      <div className="ss-meta">
        <span className="ss-dot" style={{ background: dotColor }} />
        <span className="ss-strategy">{trade.strategy}</span>
        <span className="ss-sep">·</span>
        <span className="ss-conviction" style={{ color: convictionColor }}>{summary.conviction} conviction</span>
      </div>
      {analysedAt && (
        <div className="ss-analysed">
          Analysed {analysedAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at {analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      <p className="ss-headline">{summary.headline}</p>
      <div className="ss-grid">
        <div className="ss-cell ss-cell--primary">
          <span className="ss-label">Strike{isSpread ? "s" : ""}</span>
          <span className="ss-value">{strikeDisplay}</span>
        </div>
        <div className="ss-cell">
          <span className="ss-label">Expiry</span>
          <span className="ss-value">{trade.expiryLabel}</span>
        </div>
        <div className="ss-cell">
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
        <div className="ss-cell">
          <span className="ss-label">Break-even</span>
          <span className="ss-value">${trade.breakeven}</span>
        </div>
      </div>
      <div className="ss-footer">
        Educational purposes only · options-advisor-sepia.vercel.app
      </div>
    </div>
    </>
  );
}
