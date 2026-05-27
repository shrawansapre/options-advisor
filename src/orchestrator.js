import { runResearcher } from "./agents/researcher.js";
import { runStrategist } from "./agents/strategist.js";
import { runCritic } from "./agents/critic.js";

const DISCLAIMER = "This is AI-generated analysis for educational and informational purposes only. It does not constitute financial advice, a solicitation, or a recommendation to buy or sell any security. Options trading involves substantial risk of loss and is not suitable for all investors. Past performance does not guarantee future results. Always consult a qualified financial advisor and do your own research before trading.";

const TIER_LEVELS = { conservative: 2, moderate: 3, aggressive: 4 };

async function fetchMarketData(ticker, externalSignal) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    let signal = controller.signal;
    if (externalSignal) {
      signal = typeof AbortSignal.any === "function"
        ? AbortSignal.any([controller.signal, externalSignal])
        : controller.signal;
    }
    const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}/market?ticker=${ticker}`, { signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch (e) {
    if (e.name === "AbortError" && externalSignal?.aborted) throw e;
    return null;
  }
}

export function buildLiveDataBlock(marketData) {
  const { quote, ivCurrent, ivRank, chains, fetchedAt } = marketData;
  const fetchTime = new Date(fetchedAt).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" });
  const iv = ivCurrent != null ? `${(ivCurrent * 100).toFixed(1)}%` : "unavailable";
  const ivRankStr = ivRank != null ? `${ivRank}th percentile` : "unavailable";
  const g = (v, d) => v != null ? v.toFixed(d) : "n/a";

  let block = `[LIVE MARKET DATA — fetched ${fetchTime} ET]\n`;
  block += `Stock: ${marketData.ticker} @ $${quote.last} (${(quote.changePercent ?? 0) >= 0 ? "+" : ""}${quote.changePercent?.toFixed(1) ?? "0.0"}%) | Bid: $${quote.bid} | Ask: $${quote.ask}\n`;
  block += `IV: ${iv} | IV Rank: ${ivRankStr}\n`;
  block += `Available expiries: ${chains.map(c => `${c.expiry}(${c.daysToExpiry}d)`).join(", ")}\n\nOptions Chain:\n`;

  for (const chain of chains) {
    block += `${chain.expiry} (${chain.daysToExpiry} DTE):\n`;
    for (const o of chain.options) {
      block += `  ${o.strike}${o.type[0]} bid:$${g(o.bid,2)} ask:$${g(o.ask,2)} Δ${g(o.delta,2)} θ${g(o.theta,2)} IV:${o.iv!=null?(o.iv*100).toFixed(0)+"%" :"n/a"} OI:${o.openInterest??"-"}\n`;
    }
    block += "\n";
  }
  return block;
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
  const greeksNote = hasLiveData
    ? "use the pre-loaded Greeks from research.chains for that specific strike/expiry"
    : "retrieve the exact live Greeks for that specific strike/expiry";

  const results = await Promise.all(
    tiers.map(async (tier) => {
      const result = await runStrategist({ tier, resolvedTicker, researchJSON, hasLiveData, greeksNote, timeContext, signal });
      tierStatus[tier] = "done";
      onProgress?.({ type: "strategies", tiers: { ...tierStatus } });
      return result;
    })
  );

  const trades = results.map((r, i) => {
    const t = r.trades?.[0];
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
              tier, resolvedTicker, researchJSON, hasLiveData, greeksNote, timeContext,
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
      // Critic failed entirely — ship uncritiqued
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
