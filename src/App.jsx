import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  TrendingUp, TrendingDown, Clock, AlertTriangle, Globe,
  Timer, Zap, Activity, Crosshair, Target, Ban,
  Lightbulb, ExternalLink, ChevronRight, CircleDot,
  CheckCircle2, BookOpen, Layers, History, X, Moon, Sun, Share2
} from "lucide-react";
import { fetchRecommendation } from "./api";
import "./styles.css";

// ─── Search History ───────────────────────────────────────────────────────────

function useSearchHistory() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("oa-history") || "[]"); }
    catch { return []; }
  });

  function addEntry(ticker, trade) {
    const entry = {
      id: Date.now().toString(),
      ticker: ticker || "",
      ts: new Date().toISOString(),
      strategy: trade.strategy ?? "",
      strategyType: trade.strategyType ?? "neutral",
      confidenceScore: trade.summary?.confidenceScore ?? 0,
    };
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    try { localStorage.setItem("oa-history", JSON.stringify(next)); } catch (_) {}
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem("oa-history"); } catch (_) {}
  }

  return { history, addEntry, clearHistory };
}

function SearchHistory({ history, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  if (!history.length) return null;

  return (
    <div className="search-history">
      <button className="history-toggle" onClick={() => setOpen(o => !o)}>
        <History size={11} />
        <span>Recent searches ({history.length})</span>
        <ChevronRight size={11} className={`history-chevron ${open ? "history-chevron--open" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="history-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            {history.map(h => (
              <button key={h.id} className="history-row" onClick={() => onSelect(h.ticker)}>
                <span className={`history-dot history-dot--${h.strategyType}`} />
                <span className="history-ticker">{h.ticker || "Market scan"}</span>
                <span className="history-strategy">{h.strategy}</span>
                <span className="history-meta">{h.confidenceScore}% · {new Date(h.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </button>
            ))}
            <button className="history-clear-btn" onClick={onClear}>
              <X size={10} /><span>Clear history</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Pulling the live options chain…",
  "Checking IV rank against its 52-week range…",
  "Reading earnings calendars so you don't have to…",
  "Scanning news for hidden catalysts…",
  "Cross-referencing technical support and resistance…",
  "Verifying Greek values from the live option chain…",
  "Stress-testing the bear case…",
  "Building your three exit rules…",
  "Sourcing news article links…",
  "Assembling your Robinhood execution steps…",
];

function LoadingMessages({ ticker, progress }) {
  const [index, setIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const intervalRef = useRef(null);

  const strings = progress?.type === "text" ? (progress.strings ?? []) : [];
  const isWriting = strings.length > 0;

  useEffect(() => {
    if (isWriting) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setIndex(i => {
        setCompletedSteps(prev => [...prev, LOADING_MESSAGES[i]].slice(-5));
        return (i + 1) % LOADING_MESSAGES.length;
      });
    }, 2600);
    return () => clearInterval(intervalRef.current);
  }, [isWriting]);
  const searchCount = progress?.type === "search" ? progress.count : 0;

  return (
    <div className="loading-wrap">
      <motion.div
        className="loading-panel"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="lp-header">
          <div className="lp-pulse-dot" />
          <span className="lp-title">
            {ticker
              ? <><span className="lp-dim">Analyzing </span><strong>{ticker}</strong></>
              : "Scanning the market"}
          </span>
          <AnimatePresence>
            {searchCount > 0 && (
              <motion.span
                className="lp-search-badge"
                key={searchCount}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {searchCount} {searchCount === 1 ? "search" : "searches"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Completed + active steps */}
        <div className="lp-steps">
          <AnimatePresence initial={false}>
            {completedSteps.map((step, i) => (
              <motion.div
                key={i}
                className="lp-step lp-step--done"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22 }}
              >
                <CheckCircle2 size={11} className="lp-check-icon" />
                <span>{step}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {!isWriting && (
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                className="lp-step lp-step--active"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <div className="lp-step-dot" />
                <span>{LOADING_MESSAGES[index]}</span>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Writing stream */}
        {isWriting && (
          <motion.div
            className="lp-stream"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="lp-stream-label">Writing analysis</div>
            <div className="lp-stream-lines">
              <AnimatePresence initial={false}>
                {strings.slice(-5).map((s, i, arr) => (
                  <motion.div
                    key={s.slice(0, 40)}
                    className={`lp-stream-line${i < arr.length - 1 ? " lp-stream-line--faded" : ""}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {s.length > 110 ? s.slice(0, 110) + "…" : s}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ─── IV Gauge ─────────────────────────────────────────────────────────────────

function IVGauge({ value, reading }) {
  const num = parseInt(value, 10) || 0;
  const clipped = Math.min(100, Math.max(0, num));
  const color = clipped < 40 ? "var(--green)" : clipped > 60 ? "var(--red)" : "var(--amber)";
  const rawLabel = reading || (clipped < 40 ? "Below average" : clipped > 60 ? "Above average" : "Near average");
  const label = rawLabel.replace(/\s*\(.*?\)/g, "").trim();
  const data = [{ value: clipped }, { value: 100 - clipped }];

  return (
    <div className="iv-gauge-wrap">
      <ResponsiveContainer width="100%" height={130}>
        <PieChart>
          <Pie data={data} cx="50%" cy="88%" startAngle={180} endAngle={0}
            innerRadius={52} outerRadius={72} dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="var(--surface-3)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="iv-gauge-overlay">
        <div className="iv-gauge-num">{num}<sup>{ordinalSuffix(num)}</sup></div>
        <div className="iv-gauge-label" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBold(text) {
  if (!text) return null;
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function ordinalSuffix(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function impactClass(impact) {
  if (!impact) return "impact-low";
  const k = impact.replace(/\s+/g, "-").toLowerCase();
  if (k === "action-required") return "impact-action";
  if (k === "critical") return "impact-critical";
  if (k === "moderate") return "impact-moderate";
  return "impact-low";
}

function impactDotColor(impact) {
  if (!impact) return "var(--t3)";
  const k = impact.replace(/\s+/g, "-").toLowerCase();
  if (k === "critical") return "var(--red)";
  if (k === "moderate") return "var(--amber)";
  if (k === "action-required") return "var(--navy)";
  return "var(--t3)";
}

// ─── Share formatter ─────────────────────────────────────────────────────────

function formatTradeAsMarkdown(trade, marketContext, analysedAt) {
  const { summary, exitStrategy, predictions, greeks, rationale, riskFactors, strategyRationale, watchFor } = trade;
  const isSpread = !!trade.strike2;
  const strikeDisplay = isSpread ? `$${trade.strike} / $${trade.strike2}` : `$${trade.strike}`;
  const ivNum = parseInt(trade.ivRank, 10) || 0;
  const dateStr = analysedAt
    ? analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      " at " + analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "";

  const lines = [
    `# ${trade.ticker} — ${trade.strategy}`,
    `> Options Advisor recommendation${dateStr ? ` · ${dateStr}` : ""}`,
    "",
    `**Conviction:** ${summary.conviction} (${summary.confidenceScore}%) · **Risk:** ${trade.riskLevel}/5`,
    "",
    "## Position",
    "| | |",
    "|---|---|",
    `| Strike | ${strikeDisplay} |`,
    `| Expiry | ${trade.expiryLabel} (${trade.daysToExpiry}d) |`,
    `| Entry | $${trade.entryPrice}/contract · ${trade.totalCost} total |`,
    `| Stock price | $${trade.currentPrice} |`,
    `| Break-even | $${trade.breakeven} |`,
    `| Max profit | ${trade.maxProfit} |`,
    `| Max loss | ${trade.maxLoss} |`,
    `| IV rank | ${trade.ivRank}${ordinalSuffix(ivNum)} percentile |`,
    "",
    "## Summary",
    `**${summary.headline}**`,
    "",
    summary.plainEnglish,
    "",
    `*When to sell: ${summary.whenToSellSimple}*`,
  ];

  if (strategyRationale) {
    lines.push("", "## Why this strategy", strategyRationale);
  }

  lines.push(
    "",
    "## Exit rules",
    `- 🟢 **Take profit:** ${exitStrategy.profitTarget.rule} *(stock at ${exitStrategy.profitTarget.stockPrice})*`,
    `- 🔴 **Stop loss:** ${exitStrategy.stopLoss.rule} *(stock at ${exitStrategy.stopLoss.stockPrice})*`,
    `- 🕐 **Time stop:** ${exitStrategy.timeStop.rule} *(close by ${exitStrategy.timeStop.date})*`,
  );
  if (exitStrategy.earningsWarning) {
    lines.push(`- ⚠️ **Earnings:** ${exitStrategy.earningsWarning}`);
  }

  lines.push(
    "",
    "## Greeks",
    `- **Δ Delta ${greeks.delta.value}:** ${greeks.delta.insight}`,
    `- **Θ Theta ${greeks.theta.value}:** ${greeks.theta.insight}`,
    `- **Γ Gamma ${greeks.gamma.value}:** ${greeks.gamma.insight}`,
    `- **ν Vega ${greeks.vega.value}:** ${greeks.vega.insight}`,
    `- **IV rank:** ${greeks.ivRankInsight}`,
    "",
    "## Scenarios",
    "| | Bull | Base | Bear |",
    "|---|---|---|---|",
    `| Probability | ${predictions.bullCase.probability} | ${predictions.baseCase.probability} | ${predictions.bearCase.probability} |`,
    `| Option return | ${predictions.bullCase.optionReturn} | ${predictions.baseCase.optionReturn} | ${predictions.bearCase.optionReturn} |`,
    `| Stock target | ${predictions.bullCase.stockTarget} | ${predictions.baseCase.stockTarget} | ${predictions.bearCase.stockTarget} |`,
    "",
    "## Rationale",
    rationale,
  );

  if (riskFactors?.length) {
    lines.push("", "## Risk factors");
    riskFactors.forEach(f => lines.push(`- ${f}`));
  }

  if (watchFor?.keyDates?.length) {
    lines.push("", "## Key dates");
    watchFor.keyDates.forEach(d => lines.push(`- **${d.date}** — ${d.event} *(${d.impact})*`));
  }

  if (marketContext) {
    lines.push("", "## Market context", marketContext);
  }

  lines.push(
    "",
    "---",
    "*Generated by [Options Advisor](https://options-advisor-sepia.vercel.app) — educational purposes only, not financial advice.*",
    "",
    "I received this options trade recommendation. Can you help me:",
    "1. Evaluate whether the timing and entry make sense right now",
    "2. Identify any risks or blind spots the analysis may have missed",
    "3. Suggest any adjustments to the strike, expiry, or strategy structure",
  );

  return lines.join("\n");
}

// ─── Trade Card ───────────────────────────────────────────────────────────────

const STRATEGY_COLORS = { bullish: "var(--green)", bearish: "var(--red)", neutral: "var(--amber)" };

function TradeCard({ trade, index, analysedAt, marketContext }) {
  const { summary, exitStrategy, predictions, greeks, watchFor,
          rationale, riskLevel, riskFactors, robinhoodSteps,
          strategyRationale, sources } = trade;

  const [copied, setCopied] = useState(false);

  function handleShare() {
    const md = formatTradeAsMarkdown(trade, marketContext, analysedAt);
    navigator.clipboard.writeText(md).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.open("https://claude.ai", "_blank", "noopener");
  }

  const validSources = sources?.filter(s => s.url?.startsWith("http")) ?? [];
  const dotColor = STRATEGY_COLORS[trade.strategyType] || STRATEGY_COLORS.neutral;
  const isSpread = !!trade.strike2;
  const strikeDisplay = isSpread ? `$${trade.strike} / $${trade.strike2}` : `$${trade.strike}`;
  const riskColor = riskLevel <= 2 ? "green" : riskLevel <= 3 ? "amber" : "red";
  const riskLabel = riskLevel <= 2 ? "Low" : riskLevel <= 3 ? "Moderate" : "High";

  const convictionColor = summary.conviction === "High" ? "var(--green)"
    : summary.conviction === "Medium" ? "var(--amber)" : "var(--t3)";

  const ivNum = parseInt(trade.ivRank, 10) || 0;

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
    <motion.article
      className="trade-card"
      data-strategy={trade.strategyType}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.12 }}
    >
      {/* ── Header ── */}
      <div className="trade-header">
        <div className="trade-header-top">
          <h2 className="trade-ticker">{trade.ticker}</h2>
          <div className="trade-badges-row">
            <div className="strategy-badge" style={{ "--dot": dotColor }}>
              <span className="strategy-dot" />
              {trade.strategy}
            </div>
            <div className="trade-conviction" style={{ "--conv": convictionColor }}>
              <CircleDot size={13} />
              <span>{summary.conviction} conviction</span>
              <span className="conv-score">{summary.confidenceScore}%</span>
            </div>
          </div>
        </div>

        <div className="trade-key-details">
          <div className="key-detail">
            <div className="key-detail-label">Strike</div>
            <div className="key-detail-value">{strikeDisplay}</div>
          </div>
          <div className="key-detail-sep" />
          <div className="key-detail">
            <div className="key-detail-label">Expiry</div>
            <div className="key-detail-value">{trade.expiryLabel}</div>
          </div>
          <div className="key-detail-sep" />
          <div className="key-detail">
            <div className="key-detail-label">Entry price</div>
            <div className="key-detail-value">${trade.entryPrice}<span className="key-detail-unit"> / contract</span></div>
          </div>
          <div className="key-detail-sep" />
          <div className="key-detail">
            <div className="key-detail-label">Days to expiry</div>
            <div className="key-detail-value">{trade.daysToExpiry}<span className="key-detail-unit">d</span></div>
          </div>
        </div>

        <div className="trade-meta-row">
          {analysedAt && (
            <span className="trade-analysis-time">
              Analysed {analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button className={`share-claude-btn${copied ? " share-claude-btn--copied" : ""}`} onClick={handleShare}>
            {copied ? <><CheckCircle2 size={13} /> Copied!</> : <><Share2 size={13} /> Share to Claude</>}
          </button>
        </div>

        <div className="stats-strip">
          {[
            { label: "Stock price", value: `$${trade.currentPrice}` },
            { label: "Total risk",  value: trade.totalCost },
            { label: "Break-even",  value: `$${trade.breakeven}` },
            { label: "Max profit",  value: trade.maxProfit },
            { label: "IV rank",     value: `${trade.ivRank}${ordinalSuffix(ivNum)}` },
            { label: "Max loss",    value: trade.maxLoss },
          ].map(({ label, value }) => (
            <div key={label} className="stat-cell">
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="trade-body">

        {/* ── Left column ── */}
        <div className="trade-col-left">

          {/* Headline + plain english */}
          <div className="card card-hero">
            <h3 className="headline">{summary.headline}</h3>
            <p className="plain-english">{summary.plainEnglish}</p>
            <div className="sell-hint">
              <CheckCircle2 size={13} className="sell-hint-icon" />
              <span>{summary.whenToSellSimple}</span>
            </div>
          </div>

          {/* Why this strategy */}
          {strategyRationale && (
            <div className="card card-rationale">
              <div className="card-label">
                <Layers size={11} />
                Why {trade.strategy}
              </div>
              <p className="rationale-text">{parseBold(strategyRationale)}</p>
            </div>
          )}

          {/* Exit strategy */}
          <div className="card">
            <div className="card-label">
              <Target size={11} />
              Exit strategy
            </div>
            <div className="exit-grid">
              <div className="exit-rule profit">
                <div className="exit-rule-head">
                  <TrendingUp size={14} className="exit-icon-svg green-text" />
                  <span className="exit-title">Take profit</span>
                  <span className="exit-pct green-text">+{exitStrategy.profitTarget.returnPct}%</span>
                </div>
                <p className="exit-desc">{exitStrategy.profitTarget.rule}</p>
                <div className="exit-meta">Stock at {exitStrategy.profitTarget.stockPrice}</div>
              </div>
              <div className="exit-rule stop">
                <div className="exit-rule-head">
                  <TrendingDown size={14} className="exit-icon-svg red-text" />
                  <span className="exit-title">Stop loss</span>
                  <span className="exit-pct red-text">−{exitStrategy.stopLoss.lossPct}%</span>
                </div>
                <p className="exit-desc">{exitStrategy.stopLoss.rule}</p>
                <div className="exit-meta">Stock at {exitStrategy.stopLoss.stockPrice}</div>
              </div>
              <div className="exit-rule time">
                <div className="exit-rule-head">
                  <Clock size={14} className="exit-icon-svg amber-text" />
                  <span className="exit-title">Time stop</span>
                </div>
                <p className="exit-desc">{exitStrategy.timeStop.rule}</p>
                <div className="exit-meta">Close by {exitStrategy.timeStop.date}</div>
              </div>
            </div>
            {exitStrategy.earningsWarning && (
              <div className="earnings-warning">
                <AlertTriangle size={13} />
                <span>{exitStrategy.earningsWarning}</span>
              </div>
            )}
          </div>

          {/* Scenarios */}
          <div className="card">
            <div className="card-label">
              <BookOpen size={11} />
              Outcome scenarios
            </div>
            <div className="scenarios-grid">
              {[
                { key: "bull", label: "Bull case", data: predictions.bullCase, colorClass: "green-text", fillClass: "prob-fill--bull" },
                { key: "base", label: "Base case", data: predictions.baseCase, colorClass: "navy-text", fillClass: "prob-fill--base" },
                { key: "bear", label: "Bear case", data: predictions.bearCase, colorClass: "red-text",  fillClass: "prob-fill--bear" },
              ].map(({ key, label, data, colorClass, fillClass }) => (
                <div key={key} className="scenario-card">
                  <div className="scenario-top">
                    <span className="scenario-label">{label}</span>
                    <span className="scenario-prob">{data.probability}</span>
                  </div>
                  <div className={`scenario-return ${colorClass}`}>{data.optionReturn}</div>
                  <div className="scenario-target">→ {data.stockTarget}</div>
                  <div className="prob-bar">
                    <div className={`prob-fill ${fillClass}`} style={{ width: data.probability }} />
                  </div>
                  <p className="scenario-desc">{data.scenario}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: Greeks ── */}
        <div className="trade-col-right">
          <div className="card card-iv">
            <div className="card-label">
              <Activity size={11} />
              Implied volatility rank
            </div>
            <IVGauge value={trade.ivRank} reading={greeks.ivRankReading} />
            <p className="iv-insight">{greeks.ivRankInsight}</p>
          </div>

          <div className="greek-grid">
            {greekDefs.map(({ Icon, color, name, symbol, value, tagline, insight }) => (
              <div key={name} className="card greek-card">
                <div className="greek-watermark">{symbol}</div>
                <div className="greek-top">
                  <div className={`greek-icon-wrap color-${color}`}>
                    <Icon size={14} />
                  </div>
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

          {/* Thesis */}
          <div className="card card-thesis">
            <div className="card-label">
              <Lightbulb size={11} />
              Thesis
            </div>
            <p className="rationale">{parseBold(rationale)}</p>
          </div>

          {/* Risk */}
          <div className="card card-risk">
            <div className="card-label">Risk profile</div>
            <div className="risk-meter">
              <div className="risk-segments">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`risk-seg ${i <= riskLevel ? `risk-seg--${riskColor}` : ""}`} />
                ))}
              </div>
              <span className={`risk-label risk-label--${riskColor}`}>{riskLabel} risk</span>
            </div>
            <ul className="risk-list">
              {(riskFactors ?? []).map((f, i) => (
                <li key={i}><Ban size={11} className="risk-icon" /><span>{f}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Full-width sections ── */}
      <div className="trade-full">

        {/* Key dates timeline */}
        {watchFor.keyDates?.length > 0 && (
          <div className="card">
            <div className="card-label">Key dates</div>
            <div className="timeline">
              <div className="timeline-line" />
              {watchFor.keyDates.map((d, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" style={{ background: impactDotColor(d.impact) }} />
                  <div className="timeline-content">
                    <div className="timeline-date">{d.date}</div>
                    <div className="timeline-event">{d.event}</div>
                    <span className={`impact-tag ${impactClass(d.impact)}`}>{d.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signals */}
        <div className="card signals-card">
          <div className="signals-cols">
            <div>
              <div className="signals-head green-text">
                <TrendingUp size={13} /> Bullish signals
              </div>
              <ul className="signal-list">
                {(watchFor?.bullishSignals ?? []).map((s, i) => (
                  <li key={i}><ChevronRight size={11} className="signal-arrow green-text" /><span>{s}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="signals-head red-text">
                <TrendingDown size={13} /> Warning signs
              </div>
              <ul className="signal-list">
                {(watchFor?.warningSignals ?? []).map((s, i) => (
                  <li key={i}><ChevronRight size={11} className="signal-arrow red-text" /><span>{s}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sources */}
        {validSources.length > 0 && (
          <div className="card">
            <div className="card-label">
              <ExternalLink size={11} />
              Sources
            </div>
            <div className="sources-grid">
              {validSources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="source-card">
                  <span className="source-title">{s.title}</span>
                  <ExternalLink size={11} className="source-icon" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Execution steps */}
        <div className="card">
          <div className="card-label">How to execute on Robinhood</div>
          <div className="steps-flow">
            {(robinhoodSteps ?? []).map((step, i) => (
              <div key={i} className="step-row">
                <div className="step-num">{i + 1}</div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [ticker, setTicker]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult]     = useState(null);
  const [analysedAt, setAnalysedAt] = useState(null);
  const [error, setError]       = useState(null);
  const { history, addEntry, clearHistory } = useSearchHistory();

  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("oa-theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("oa-theme", dark ? "dark" : "light");
  }, [dark]);

  async function handleAnalyze(explicitTicker) {
    const t = explicitTicker !== undefined ? explicitTicker : ticker.trim();
    if (explicitTicker !== undefined) setTicker(explicitTicker);

    if (t && !/^[A-Z]{1,5}([.\-][A-Z]{0,2})?$/.test(t)) {
      setError(`"${t}" doesn't look like a valid US ticker. Try something like NVDA, SPY, or BRK.B.`);
      return;
    }

    setLoading(true);
    setProgress(null);
    setError(null);
    setResult(null);
    try {
      const data = await fetchRecommendation(t, setProgress);
      setResult(data);
      const now = new Date();
      setAnalysedAt(now);
      if (data.trades?.[0]) addEntry(t, data.trades[0]);
    } catch (e) {
      setError(e.message || "Could not generate a recommendation. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="brand-mark">◈</span>
            <div className="header-text">
              <div className="header-title">Options Advisor</div>
              <div className="header-sub">AI-powered analysis · For Robinhood</div>
            </div>
          </div>
          <button className="theme-toggle" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="search-wrap">
          <div className="search-bar">
            <input
              className="search-input"
              type="text"
              placeholder="Enter a ticker — NVDA, SPY, TSLA — or leave blank to scan the market"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10))}
              onKeyDown={e => e.key === "Enter" && !loading && handleAnalyze()}
              autoComplete="off"
              spellCheck="false"
            />
            <button className="search-btn" onClick={() => handleAnalyze()} disabled={loading}>
              {loading ? "…" : "Analyze"}
            </button>
          </div>
          <p className="search-hint">
            Live web search · Verified Greeks · Price, IV rank, news, technicals · Educational purposes only
          </p>
          <SearchHistory
            history={history}
            onSelect={t => handleAnalyze(t)}
            onClear={clearHistory}
          />
        </div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingMessages ticker={ticker.trim()} progress={progress} />
            </motion.div>
          )}

          {error && (
            <motion.div key="error" className="error-bar"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <AlertTriangle size={15} />
              <span>{error}</span>
            </motion.div>
          )}

          {result && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {result.marketContext && (
                <div className="market-banner">
                  <Globe size={13} className="market-icon" />
                  <span className="market-label">Market</span>
                  <span className="market-text">{result.marketContext}</span>
                  {analysedAt && (
                    <span className="analysis-time">
                      Analysed {analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              )}
              {result.trades?.map((trade, i) => <TradeCard key={i} trade={trade} index={i} analysedAt={analysedAt} marketContext={result.marketContext} />)}
              {result.disclaimer && <p className="disclaimer">{result.disclaimer}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
