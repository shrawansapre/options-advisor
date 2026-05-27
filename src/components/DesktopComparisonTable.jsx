import { useState, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { checklistAuditorBatch } from "../agents/checklistAuditor.js";
import ShareMenu from "./TradeCard/ShareMenu";
import ThesisRisk from "./TradeCard/ThesisRisk";
import EntrySection from "./TradeCard/EntrySection";
import ExitSection from "./TradeCard/ExitSection";
import SignalsSection from "./TradeCard/SignalsSection";
import GreeksGrid from "./TradeCard/GreeksGrid";
import ScenariosSection from "./TradeCard/ScenariosSection";
import ChecklistSection from "./TradeCard/ChecklistSection";
import IVGauge from "./IVGauge";
import { parseBold, TIER_COLOR, TIER_LABEL, formatRRRatio, formatDelta, formatStrike, STRATEGY_LABEL } from "../utils";
import { PayoffChart, ThetaDecayChart } from "./TradeCharts";

function DataGrid({ trade }) {
  const strikeDisplay = formatStrike(trade);

  const rrRatio = formatRRRatio(trade);
  const probDisplay = trade.predictions?.baseCase?.probability ?? "—";
  const deltaDisplay = formatDelta(trade);

  return (
    <div className="dct-data-grid">
      <div className="tc-grid-row">
        {[
          ["STRIKES", strikeDisplay, ""],
          ["EXPIRY",  trade.expiryLabel, ""],
          ["DTE",     trade.daysToExpiry, ""],
          ["ENTRY",   trade.totalCost?.split(/\s/)[0] ?? "—", ""],
          ["MAX WIN", trade.maxProfit, "tc-cell-value--profit"],
          ["MAX LOSS",trade.maxLoss,   "tc-cell-value--loss"],
          ["B/E",     `$${trade.breakeven}`, ""],
        ].map(([label, val, cls]) => (
          <div key={label} className="tc-cell">
            <span className="tc-cell-label">{label}</span>
            <span className={`tc-cell-value ${cls}`.trim()}>{val ?? "—"}</span>
          </div>
        ))}
      </div>
      <div className="tc-grid-divider" />
      <div className="tc-grid-row">
        {[
          ["IV RANK", trade.ivRank],
          ["DELTA",   deltaDisplay],
          ["PROB",    probDisplay],
          ["R/R",     rrRatio],
        ].map(([label, val]) => (
          <div key={label} className="tc-cell">
            <span className="tc-cell-label">{label}</span>
            <span className="tc-cell-value">{val ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DesktopComparisonTable({ trades, chainData, analysedAt, hasLiveData, marketContext, initialAuditResults, onAuditComplete }) {
  const [auditState, setAuditState] = useState(initialAuditResults ? "done" : "idle");
  const [auditResults, setAuditResults] = useState(initialAuditResults ?? null);
  const snapshotRefs = useRef([]);

  async function runChecklist() {
    setAuditState("loading");
    try {
      const results = await checklistAuditorBatch({ trades, chainData });
      setAuditResults(results);
      setAuditState("done");
      onAuditComplete?.(results);
    } catch {
      setAuditState("idle");
    }
  }

  const first = trades[0];

  const ROWS = [
    {
      key: "details",
      label: "DETAILS",
      render: (trade) => <DataGrid trade={trade} />,
    },
    {
      key: "thesis",
      label: "THESIS",
      render: (trade) => (
        <ThesisRisk rationale={trade.rationale} riskLevel={trade.riskLevel} riskFactors={trade.riskFactors} />
      ),
    },
    {
      key: "entry",
      label: "ENTRY",
      render: (trade) => <EntrySection entryTiming={trade.entryTiming} />,
    },
    {
      key: "exit",
      label: "EXIT",
      render: (trade) => <ExitSection exitStrategy={trade.exitStrategy} />,
    },
    {
      key: "signals",
      label: "SIGNALS",
      render: (trade) => {
        const validSources = trade.sources?.filter(s => s.url?.startsWith("http")) ?? [];
        return <SignalsSection watchFor={trade.watchFor} sources={validSources} robinhoodSteps={trade.robinhoodSteps} />;
      },
    },
    {
      key: "iv",
      label: "IV ENV",
      shared: true,
      render: () => {
        const g = first.greeks;
        return (
          <div className="dct-shared-iv">
            <IVGauge value={first.ivRank} reading={g?.ivRankReading} />
            {g?.ivRankInsight && <p className="tc-body tc-body--muted">{g.ivRankInsight}</p>}
          </div>
        );
      },
    },
    {
      key: "greeks",
      label: "GREEKS",
      render: (trade) => (
        <GreeksGrid greeks={trade.greeks} strategyRationale={trade.strategyRationale} strategy={trade.strategy} ivRank={trade.ivRank} hideIV />
      ),
    },
    {
      key: "scenarios",
      label: "SCENARIOS",
      render: (trade) => <ScenariosSection predictions={trade.predictions} />,
    },
    {
      key: "charts",
      label: "CHARTS",
      render: (trade) => (
        <>
          <PayoffChart trade={trade} />
          <ThetaDecayChart trade={trade} analysedAt={analysedAt} />
        </>
      ),
    },
  ];

  return (
    <div className="dct">
      {/* Sticky wrapper — spans all columns so both header rows stick together */}
      <div className="dct-sticky">
        <div className="dct-header">
          <span className="tc-ticker">{first.ticker}</span>
          <span className="tc-price">${first.currentPrice}</span>
          <span className="tc-sep">·</span>
          <span className={`tc-data-badge tc-data-badge--${hasLiveData ? "live" : "web"}`}>
            {hasLiveData ? "Live" : "Web"}
          </span>
          {analysedAt && (
            <span className="tc-time">
              {analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div className="dct-col-headers">
          <div className="dct-label-spacer" />
          {trades.map((trade, i) => {
            const color = TIER_COLOR[trade.riskTier] ?? "amber";
            const expired = trade.expiry && analysedAt && new Date(trade.expiry) < analysedAt;
            return (
              <div key={i} className={`dct-col-header dct-col-header--${color}`}>
                <div className="dct-col-header-row">
                  <span className={`dct-tier-label dct-tier-label--${color}`}>
                    {trade.riskTier?.toUpperCase() ?? `OPTION ${i + 1}`}
                  </span>
                  <ShareMenu
                    trade={trade}
                    analysedAt={analysedAt}
                    marketContext={marketContext}
                    snapshotRef={{ get current() { return snapshotRefs.current[i]; } }}
                  />
                </div>
                <span className="dct-strategy-name">{trade.strategy}</span>
                {expired && (
                  <div className="dct-expired-badge">
                    <AlertTriangle size={10} /> Expired
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section rows */}
      {ROWS.map(({ key, label, render, shared }) => (
        <div key={key} className="dct-row">
          <div className="dct-row-label">{label}</div>
          {shared
            ? <div className="dct-cell dct-cell--span">{render()}</div>
            : trades.map((trade, i) => (
                <div key={i} className="dct-cell">{render(trade)}</div>
              ))
          }
        </div>
      ))}

      {/* Checklist header — spans full width */}
      <div className="dct-checklist-header">
        <span className="dct-checklist-title">Trade Discipline Checklist</span>
        {auditState === "idle" && (
          <button className="dct-checklist-run-btn" onClick={runChecklist}>Run Checklist</button>
        )}
        {auditState === "loading" && (
          <span className="dct-checklist-status">Auditing…</span>
        )}
      </div>

      {/* Checklist row */}
      <div className="dct-row dct-row--last">
        <div className="dct-row-label">AUDIT</div>
        {trades.map((trade, i) => (
          <div key={i} className="dct-cell">
            <ChecklistSection trade={trade} chainData={chainData} initialResult={auditResults?.[i] ?? null} noHeader />
          </div>
        ))}
      </div>

      {trades.map((trade, i) => {
        const summary = trade.summary ?? {};
        return (
          <div
            key={i}
            ref={el => { snapshotRefs.current[i] = el; }}
            className="share-snapshot"
            data-strategy={trade.strategyType}
          >
            <div className={`ss-flag ss-flag--${trade.riskTier ?? "moderate"}`}>
              <span className="ss-flag-name">{trade.strategy}</span>
              <span className="ss-flag-tier">
                {TIER_LABEL[trade.riskTier] ?? "Moderate"}
                {" · "}
                {STRATEGY_LABEL[trade.strategyType] ?? "Neutral"}
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
                  {trade.watchFor.warningSignals.slice(0, 3).map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="ss-footer">
              ◈ Options Brief{analysedAt ? ` · ${analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""} · Educational purposes only
            </div>
          </div>
        );
      })}
    </div>
  );
}
