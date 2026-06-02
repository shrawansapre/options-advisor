import { runResearcher } from "./agents/researcher.js";
import { runStrategist } from "./agents/strategist.js";
import { runCritic } from "./agents/critic.js";
import { buildLiveDataBlock } from "./utils.jsx";

const DISCLAIMER = "This is AI-generated analysis for educational and informational purposes only. It does not constitute financial advice, a solicitation, or a recommendation to buy or sell any security. Options trading involves substantial risk of loss and is not suitable for all investors. Past performance does not guarantee future results. Always consult a qualified financial advisor and do your own research before trading.";

const TIER_LEVELS = { conservative: 2, moderate: 3, aggressive: 4 };

async function fetchMarketData(ticker, externalSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  let onExternalAbort = null;
  let onInternalAbort = null;

  try {
    let signal = controller.signal;
    if (externalSignal) {
      if (typeof AbortSignal.any === "function") {
        signal = AbortSignal.any([controller.signal, externalSignal]);
      } else {
        const combined = new AbortController();
        if (externalSignal.aborted) {
          combined.abort();
        } else {
          onInternalAbort = () => combined.abort();
          onExternalAbort = () => combined.abort();
          controller.signal.addEventListener("abort", onInternalAbort, { once: true });
          externalSignal.addEventListener("abort", onExternalAbort, { once: true });
        }
        signal = combined.signal;
      }
    }
    const marketHeaders = {};
    if (import.meta.env.VITE_INTERNAL_TOKEN) {
      marketHeaders["X-Internal-Token"] = import.meta.env.VITE_INTERNAL_TOKEN;
    }
    const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}/market?ticker=${ticker}`, { signal, headers: marketHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch (e) {
    if (e.name === "AbortError" && externalSignal?.aborted) throw e;
    return null;
  } finally {
    clearTimeout(timer);
    if (onExternalAbort) externalSignal.removeEventListener("abort", onExternalAbort);
    if (onInternalAbort) controller.signal.removeEventListener("abort", onInternalAbort);
  }
}

function ensureTradeShape(t) {
  if (!t || typeof t !== "object") return null;
  if (!t.strategy && !t.ticker) return null;
  return {
    strategyType: "neutral",
    strategy: "",
    ticker: "",
    currentPrice: 0,
    strike: 0,
    expiry: "",
    expiryLabel: "",
    daysToExpiry: 0,
    totalCost: "—",
    maxProfit: "—",
    maxLoss: "—",
    breakeven: 0,
    ...t,
  };
}

export async function orchestrate({ ticker, onProgress, signal }) {
  const safeTicker = (ticker || "").replace(/[^A-Z0-9.\-]/gi, "").slice(0, 10).toUpperCase();

  const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const today = nowET.toISOString().slice(0, 10);
  const dayOfWeek = nowET.getDay();
  const hour = nowET.getHours();
  const minute = nowET.getMinutes();
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ET`;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isMarketOpen = isWeekday && (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;
  const marketStatus = !isWeekday
    ? "Markets are closed (weekend)."
    : isMarketOpen
      ? "Markets are currently OPEN (regular session)."
      : hour < 9 || (hour === 9 && minute < 30)
        ? "Markets are in PRE-MARKET hours."
        : "Markets are CLOSED — currently in after-hours trading.";
  const marketSessionLabel = !isWeekday ? "Closed (weekend)"
    : isMarketOpen ? "Regular session"
    : hour < 9 || (hour === 9 && minute < 30) ? "Pre-market"
    : "After-hours";
  const timeContext = `Today is ${today}, current time is ${timeStr}. ${marketStatus}`;

  const marketDataPromise = safeTicker ? fetchMarketData(safeTicker, signal) : Promise.resolve(null);
  const marketData = await marketDataPromise;
  const hasLiveData = marketData !== null;
  if (safeTicker) onProgress?.({ type: "marketData", ok: hasLiveData });

  const livePrefix = hasLiveData ? buildLiveDataBlock(marketData) + "\n" : "";
  const researchMsg = safeTicker
    ? `${livePrefix}${timeContext} Gather comprehensive market research for ${safeTicker} to support options strategy analysis. All expiry dates must be at least 21 days from today.`
    : `${timeContext} Scan the US stock market and identify the single best options trade opportunity today, then gather full research for that ticker. All expiry dates must be at least 21 days from today.`;

  const research = await runResearcher({ researchMsg, hasLiveData, onProgress, signal });

  if (hasLiveData) {
    research.chains = marketData.chains;
    research.liveFetchedAt = marketData.fetchedAt;
  }

  const tiers = ["conservative", "moderate", "aggressive"];
  const tierStatus = { conservative: "loading", moderate: "loading", aggressive: "loading" };
  onProgress?.({ type: "strategies", tiers: { ...tierStatus } });

  const researchJSON = JSON.stringify(research);
  const resolvedTicker = research.ticker || safeTicker;

  const results = await Promise.all(
    tiers.map(async (tier) => {
      const result = await runStrategist({ tier, resolvedTicker, researchJSON, hasLiveData, timeContext, signal });
      tierStatus[tier] = "done";
      onProgress?.({ type: "strategies", tiers: { ...tierStatus } });
      return result;
    })
  );

  const trades = results.map((r, i) => {
    const t = ensureTradeShape(r.trades?.[0]);
    if (!t) return null;
    t.riskTier = tiers[i];
    t.riskLevel = TIER_LEVELS[tiers[i]];
    if (research.ivRank && research.ivRank !== "0") {
      t.ivRank = String(research.ivRank);
      const n = parseInt(research.ivRank, 10);
      const reading = n < 40 ? "Low" : n > 60 ? "High" : "Average";
      if (t.greeks) t.greeks.ivRankReading = `${reading} (${n}th percentile)`;
    }
    if (hasLiveData && marketData.ivCurrent != null) {
      t.impliedVolatility = (marketData.ivCurrent * 100).toFixed(1);
    }
    return t;
  }).filter(Boolean);

  let currentTrades = [...trades];

  if (hasLiveData) {
    try {
      onProgress?.({ type: "critic", status: "running" });
      const criticResult = await runCritic({ trades: currentTrades, marketData, signal });
      const failedCritiques = (criticResult.trades ?? []).filter(t => !t.pass);
      onProgress?.({
        type: "critic",
        status: "done",
        passed: (criticResult.trades ?? []).filter(t => t.pass).length,
        failed: failedCritiques.length,
      });

      for (const failedCritique of failedCritiques) {
        const tier = failedCritique.riskTier;
        for (let attempt = 1; attempt <= 2; attempt++) {
          onProgress?.({ type: "critic", status: "retrying", tier, attempt });
          try {
            const retried = await runStrategist({
              tier, resolvedTicker, researchJSON, hasLiveData, timeContext,
              critique: failedCritique.concerns, signal,
            });
            const retriedTrade = retried.trades?.[0];
            if (retriedTrade) {
              const idx = currentTrades.findIndex(t => t.riskTier === tier);
              if (idx !== -1) currentTrades[idx] = retriedTrade;
            }
            break;
          } catch {
            // attempt failed — try again if attempts remain
          }
        }
      }
    } catch {
      onProgress?.({ type: "critic", status: "skipped" });
    }
  }

  return {
    trades: currentTrades,
    chainData: marketData,
    marketContext: research.marketContext,
    disclaimer: DISCLAIMER,
    hasLiveData,
    marketSessionLabel,
  };
}
