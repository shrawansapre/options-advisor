import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Clock, AlertTriangle,
  Timer, Zap, Activity, Crosshair, Target, Ban,
  Lightbulb, ExternalLink, ChevronRight, CircleDot,
  CheckCircle2, BookOpen, Layers, Share2
} from "lucide-react";
import IVGauge from "./IVGauge";
import { STRATEGY_COLORS, ordinalSuffix, impactClass, impactDotColor, formatTradeAsMarkdown } from "../utils";

function parseBold(text) {
  if (!text) return null;
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

export default function TradeCard({ trade, index, analysedAt, marketContext }) {
  const { summary, exitStrategy, predictions, greeks, watchFor,
          rationale, riskLevel, riskFactors, robinhoodSteps,
          strategyRationale, sources } = trade;

  const [copied, setCopied] = useState(false);

  function handleShare() {
    const md = formatTradeAsMarkdown(trade, marketContext, analysedAt);
    navigator.clipboard.writeText(md).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    const MAX = 8000;
    const prompt = md.length > MAX
      ? md.slice(0, MAX) + "\n\n[Full analysis copied to clipboard — paste it here to continue]"
      : md;
    const url = "https://claude.ai/new?q=" + encodeURIComponent(prompt);

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener");
    }
  }

  const expiryExpired = trade.expiry && analysedAt && new Date(trade.expiry) < analysedAt;

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
      {expiryExpired && (
        <div className="expired-warning">
          <AlertTriangle size={14} />
          <span>This option expired on <strong>{trade.expiryLabel}</strong>. The recommendation is stale — please search again to get a current trade.</span>
        </div>
      )}

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

          <div className="card card-hero">
            <h3 className="headline">{summary.headline}</h3>
            <p className="plain-english">{summary.plainEnglish}</p>
            <div className="sell-hint">
              <CheckCircle2 size={13} className="sell-hint-icon" />
              <span>{summary.whenToSellSimple}</span>
            </div>
          </div>

          {strategyRationale && (
            <div className="card card-rationale">
              <div className="card-label">
                <Layers size={11} />
                Why {trade.strategy}
              </div>
              <p className="rationale-text">{parseBold(strategyRationale)}</p>
            </div>
          )}

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

          <div className="card card-thesis">
            <div className="card-label">
              <Lightbulb size={11} />
              Thesis
            </div>
            <p className="rationale">{parseBold(rationale)}</p>
          </div>

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
