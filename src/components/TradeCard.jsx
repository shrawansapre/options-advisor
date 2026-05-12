import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import {
  TrendingUp, TrendingDown, Clock, AlertTriangle,
  Timer, Zap, Activity, Crosshair, Target, Ban,
  Lightbulb, ExternalLink, ChevronRight,
  CheckCircle2, BookOpen, Layers, Share2, Download, ChevronDown
} from "lucide-react";
import IVGauge from "./IVGauge";
import { PayoffChart, ThetaDecayChart } from "./TradeCharts";
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

  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!shareOpen) return;
    function onOutsideClick(e) {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [shareOpen]);

  function handleOpenInClaude() {
    setShareOpen(false);
    const md = formatTradeAsMarkdown(trade, marketContext, analysedAt);
    navigator.clipboard.writeText(md).catch(() => {});
    const MAX = 8000;
    const prompt = md.length > MAX
      ? md.slice(0, MAX) + "\n\n[Full analysis copied to clipboard — paste it here to continue]"
      : md;
    const url = "https://claude.ai/new?q=" + encodeURIComponent(prompt);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) window.location.href = url;
    else window.open(url, "_blank", "noopener");
  }

  async function handleDownloadImage() {
    setShareOpen(false);
    if (!cardRef.current) return;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, skipFonts: false });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${trade.ticker}-options-analysis.png`;
    a.click();
  }

  function handleShareX() {
    setShareOpen(false);
    const text = `$${trade.ticker} ${trade.strategy} — ${trade.summary?.headline ?? ""}\n\nConviction: ${trade.summary?.conviction ?? "—"} · Risk: ${trade.riskLevel ?? "—"}/5\n\nvia Options Advisor`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text + "\n\nhttps://options-advisor-sepia.vercel.app")}`, "_blank", "noopener");
  }

  async function handleNativeShare() {
    setShareOpen(false);
    try {
      const dataUrl = cardRef.current
        ? await toPng(cardRef.current, { pixelRatio: 2, skipFonts: false })
        : null;
      const title = `${trade.ticker} Options Analysis`;
      const text = trade.summary?.headline ?? "";
      if (dataUrl) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${trade.ticker}-analysis.png`, { type: "image/png" });
        const payload = { title, text, files: [file] };
        if (navigator.canShare?.(payload)) { await navigator.share(payload); return; }
      }
      await navigator.share({ title, text, url: "https://options-advisor-sepia.vercel.app" });
    } catch (_) {}
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
      ref={cardRef}
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

      {/* ── Header ── */}
      <div className="trade-header">

        {/* Top bar: tier + time on left, share on right */}
        <div className="trade-top-bar">
          <div className="trade-top-bar-left">
            {analysedAt && (
              <span className="trade-analysis-time">
                <Clock size={11} />
                {analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div className="trade-top-bar-right">
            <div className="share-menu-wrap" ref={shareRef}>
              <button
                className={`share-trigger-btn${shareOpen ? " share-trigger-btn--open" : ""}`}
                onClick={() => setShareOpen(v => !v)}
              >
                <Share2 size={13} />
                Share
                <ChevronDown size={11} />
              </button>
              {shareOpen && (
                <div className="share-menu">
                  <button className="share-menu-item" onClick={handleOpenInClaude}>
                    <ExternalLink size={14} />
                    Open in Claude
                  </button>
                  <button className="share-menu-item" onClick={handleDownloadImage}>
                    <Download size={14} />
                    Download image
                  </button>
                  <button className="share-menu-item" onClick={handleShareX}>
                    <span className="x-logo-icon">𝕏</span>
                    Share on X
                  </button>
                  {typeof navigator.share === "function" && (
                    <button className="share-menu-item" onClick={handleNativeShare}>
                      <Share2 size={14} />
                      Share…
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ticker + stock price */}
        <div className="trade-hero-row">
          <h2 className="trade-ticker">{trade.ticker}</h2>
          <div className="trade-stock-price">
            <span className="stock-price-value">${trade.currentPrice}</span>
            <span className="stock-price-label">current price</span>
          </div>
        </div>

        {/* Strategy + conviction + risk tier — inline text, no pills */}
        <div className="trade-meta-line">
          <span className="trade-meta-dot" style={{ background: dotColor }} />
          <span className="trade-meta-strategy">{trade.strategy}</span>
          <span className="trade-meta-sep">·</span>
          <span className="trade-meta-conviction" style={{ color: convictionColor }}>{summary.conviction} conviction</span>
          {trade.riskTier && (
            <span className="trade-meta-risk-wrap">
              <span className="trade-meta-sep">·</span>
              <span className={`trade-meta-risk trade-meta-risk--${trade.riskTier}`}>
                {trade.riskTier === "conservative" ? "Conservative" :
                 trade.riskTier === "moderate"     ? "Moderate"     : "Aggressive"}
              </span>
            </span>
          )}
        </div>

        {/* Headline */}
        <h3 className="trade-header-headline">{summary.headline}</h3>

        {/* Unified data block: contract specs + financial outcomes */}
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

      {/* ── Content ── */}
      <div className="trade-content">

        {/* Hero — full width, highest priority */}
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

        {/* Exit strategy — full width */}
        <div className="card">
          <div className="card-label"><Target size={11} /> Exit strategy</div>
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

        {/* IV gauge + strategy rationale — one card, internal 2-col. Gap inside card = invisible. */}
        <div className="card card-inner-split">
          <div className="card-inner-col">
            <div className="card-label"><Activity size={11} /> Implied volatility rank</div>
            <IVGauge value={trade.ivRank} reading={greeks.ivRankReading} />
            <p className="iv-insight">{greeks.ivRankInsight}</p>
          </div>
          {strategyRationale && (
            <div className="card-inner-col">
              <div className="card-label"><Layers size={11} /> Why {trade.strategy}</div>
              <p className="rationale-text">{parseBold(strategyRationale)}</p>
            </div>
          )}
        </div>

        {/* Greeks 2×2 — equal height by nature */}
        <div className="greek-grid">
          {greekDefs.map(({ Icon, color, name, symbol, value, tagline, insight }) => (
            <div key={name} className="card greek-card">
              <div className="greek-watermark">{symbol}</div>
              <div className="greek-top">
                <div className={`greek-icon-wrap color-${color}`}><Icon size={14} /></div>
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

        {/* Thesis + risk — one card, internal 2-col. Gap inside card = invisible. */}
        <div className="card card-inner-split">
          <div className="card-inner-col">
            <div className="card-label"><Lightbulb size={11} /> Thesis</div>
            <p className="rationale">{parseBold(rationale)}</p>
          </div>
          <div className="card-inner-col">
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

        {/* Scenarios — full width, 3-col inside */}
        <div className="card">
          <div className="card-label"><BookOpen size={11} /> Outcome scenarios</div>
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

        {/* Charts — full width, breathe on wide screens */}
        <PayoffChart trade={trade} />
        <ThetaDecayChart trade={trade} analysedAt={analysedAt} />

        {/* Signals */}
        <div className="card signals-card">
          <div className="signals-cols">
            <div>
              <div className="signals-head green-text"><TrendingUp size={13} /> Bullish signals</div>
              <ul className="signal-list">
                {(watchFor?.bullishSignals ?? []).map((s, i) => (
                  <li key={i}><ChevronRight size={11} className="signal-arrow green-text" /><span>{s}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="signals-head red-text"><TrendingDown size={13} /> Warning signs</div>
              <ul className="signal-list">
                {(watchFor?.warningSignals ?? []).map((s, i) => (
                  <li key={i}><ChevronRight size={11} className="signal-arrow red-text" /><span>{s}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {validSources.length > 0 && (
          <div className="sources-bar">
            <span className="sources-bar-label"><ExternalLink size={10} /> Sources</span>
            {validSources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="sources-bar-link">
                {s.title}{i < validSources.length - 1 && <span className="sources-bar-sep">·</span>}
              </a>
            ))}
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
