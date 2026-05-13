import { jsonrepair } from "jsonrepair";

// ─── Phase 1: Research prompt ─────────────────────────────────────────────────
// One call with web search — gathers all market data so Phase 2 needs none.

const RESEARCH_SYSTEM_PROMPT = `You are a financial research assistant and options strategy planner. In a single pass you must: (1) gather market data, (2) scan the options chain to understand available strikes and liquidity, (3) design three distinct strategy structures. Return ONLY a structured JSON report — no markdown fences, no preamble.

CRITICAL — CURRENT PRICE & AFTER-HOURS: Search "[TICKER] stock price" for the latest price. If the market is currently closed, also search "[TICKER] after-hours price" and "[TICKER] after hours news today" — report the most recent price available and note whether it is a regular, after-hours, or pre-market quote. After-hours moves and news directly affect entry timing.

CRITICAL — IV RANK: Search "[TICKER] IV rank" explicitly. Reliable sources: Barchart.com, Market Chameleon, tastytrade. Never use 0 unless confirmed by multiple searches.

CRITICAL — OPTIONS CHAIN SCAN: Search "[TICKER] options chain" to identify available strikes and expiries. You need enough to design 3 meaningfully different strategies — not full Greeks, just strike availability, rough prices, and open interest. All expiries must be at least 21 days from today.

CRITICAL — STRATEGY DESIGN: Design exactly 3 strategies that are structurally different in risk and max-loss potential. Conservative must have the smallest max loss, aggressive the largest — enforce this in your choice of structure, spread width, and strikes. Strategies for the same ticker may share a directional bias but must differ in structure or aggressiveness.
- conservative (riskLevel 2): defined-risk, high probability — tight credit spread (width ≤$5), cash-secured put, or covered call. Smallest max loss.
- moderate (riskLevel 3): balanced — ATM or near-the-money long option, or a moderate-width spread.
- aggressive (riskLevel 4): high risk/return — OTM long option or wide spread. Largest max loss.

CRITICAL — JSON SAFETY: Never include unescaped double-quotes inside string values — use single quotes instead. No literal newline characters inside strings.

CRITICAL — MARKET SCAN: If no specific ticker is given, identify the single best options opportunity today, then gather full research for that ticker. Set "ticker" to the identified symbol.

CRITICAL — INVALID TICKER: If the ticker does not exist on US markets, respond ONLY with: {"error": "Ticker not found", "message": "Could not find [SYMBOL] on US markets. Please check the symbol and try again."}

CRITICAL — SOURCES: Record every URL you actually retrieved.

Return ONLY this JSON:
{
  "ticker": "NVDA",
  "currentPrice": "883.20",
  "ivRank": "34",
  "impliedVolatility": "42",
  "trend": "bullish",
  "support": "860.00",
  "resistance": "920.00",
  "nextEarnings": "2025-05-28",
  "earningsInDays": 15,
  "recentNews": [
    { "summary": "Brief news headline ≤100 chars", "url": "https://real-url.com" }
  ],
  "technicals": "2-3 sentence technical analysis",
  "marketContext": "1-2 sentences on current market conditions",
  "sources": [{ "title": "Source title", "url": "https://real-url.com" }],
  "strategies": {
    "conservative": {
      "structure": "Bull Put Spread",
      "strategyType": "bullish",
      "strike": "875",
      "strike2": "870",
      "expiry": "2025-06-20",
      "expiryLabel": "Jun 20, 2025",
      "daysToExpiry": 38,
      "approxEntryPrice": "1.20",
      "approxMaxLoss": "$380",
      "rationale": "Why this structure fits the conservative tier ≤150 chars"
    },
    "moderate": {
      "structure": "Buy Call",
      "strategyType": "bullish",
      "strike": "890",
      "strike2": null,
      "expiry": "2025-06-20",
      "expiryLabel": "Jun 20, 2025",
      "daysToExpiry": 38,
      "approxEntryPrice": "4.50",
      "approxMaxLoss": "$450",
      "rationale": "Why this structure fits the moderate tier ≤150 chars"
    },
    "aggressive": {
      "structure": "Buy Call",
      "strategyType": "bullish",
      "strike": "930",
      "strike2": null,
      "expiry": "2025-07-18",
      "expiryLabel": "Jul 18, 2025",
      "daysToExpiry": 66,
      "approxEntryPrice": "3.80",
      "approxMaxLoss": "$760",
      "rationale": "Why this structure fits the aggressive tier ≤150 chars"
    }
  }
}
RESPOND ONLY WITH THE JSON OBJECT. No preamble. No explanation. No code fences.`;

// ─── Phase 2: Strategy prompt ─────────────────────────────────────────────────
// Shared across all 3 tier calls — same system prompt enables prompt caching.

const STRATEGY_SYSTEM_PROMPT = `You are an options trade detail specialist. The strategy structure (strike, expiry, type) has already been decided and is provided in the research data. Your job is to retrieve the exact live market data for that specific option and produce a complete, accurate trade card.

CRITICAL — ONE TARGETED SEARCH: Search for the exact option specified — e.g. "NVDA 890 call June 20 2025 options chain bid ask delta theta gamma vega". Retrieve real bid/ask, delta, theta, gamma, vega for that specific contract. Do not search for price, IV rank, news, or earnings — those are already provided in the research data.

CRITICAL — GREEK ACCURACY: Delta, theta, gamma, vega must come from the live option chain you retrieve. Never estimate or invent Greek values. If the exact strike is unavailable, use the closest liquid strike and note it.

CRITICAL — STRATEGY JUSTIFICATION: Explicitly explain why you chose this strategy over alternatives. Keep strategyRationale to 2-3 sentences, ≤300 chars. Keep rationale to 2-3 sentences, ≤300 chars. Bold the 2-3 most important facts with **double asterisks**.

CRITICAL — JSON SAFETY: Never include unescaped double-quotes inside string values — use single quotes instead. No literal newline characters inside strings.

CRITICAL — RESPONSE LENGTH: Stay under 4000 tokens total. Hard limits: headline, plainEnglish, expectedOutcome, whenToBuySimple, whenToSellSimple — ≤120 chars each. All insight fields — ≤120 chars each. scenario in predictions — ≤100 chars each. rule in exitStrategy — ≤100 chars each. nowAssessment in entryTiming — ≤80 chars. condition in entryTiming — ≤100 chars. rationale, strategyRationale — ≤300 chars each. earningsWarning — ≤150 chars. Each robinhoodStep — ≤80 chars, exactly 5 steps. bullishSignals, warningSignals — exactly 3 items each, ≤80 chars each. riskFactors — exactly 2 items, ≤100 chars each. keyDates — exactly 3 items. sources — max 3 items.

CRITICAL — CREDIT SPREAD MAX PROFIT/LOSS: For credit spreads, maxProfit is the net credit received (smaller amount), maxLoss is spread width minus credit (larger amount). Never swap these.

CRITICAL — RISK TIER: Generate exactly ONE trade matching the tier requested in the user message:
- conservative (riskLevel 1–2): defined-risk, high probability — tight credit spread (width ≤$5), cash-secured put, or covered call. Smallest max loss.
- moderate (riskLevel 3): balanced — ATM or near-the-money long option, or moderate-width spread.
- aggressive (riskLevel 4–5): high risk/return — OTM long option or wide spread. Largest max loss.

CRITICAL — ENTRY TIMING (treat as equally important as Greeks): Always answer BOTH questions:
Question 1 — canEnterNow: The user is searching right now, so always assess whether entering this moment is reasonable. Set canEnterNow=true if markets are open AND price/setup supports an immediate entry. Set false if markets are closed, or if conditions clearly favour waiting. Write nowAssessment as a direct answer: e.g. "Yes — at support with rising momentum" or "No — market closed, gap risk at open" or "No — wait for pullback, stock extended".
Question 2 — optimalEntry: What is the BEST timing, regardless of right now? This may match "Now" if conditions are ideal, or may be hours/days out. Reason through:
1. After-hours/pre-market moves: Did the stock move significantly after hours? Factor in gap risk at next open.
2. Price vs support/resistance: At support = better entry now. Extended or at resistance = wait for pullback to a specific level.
3. Upcoming catalysts: Earnings, FOMC, CPI within 7 days? State "After [event] on [date]" unless IV expansion is the trade thesis.
4. IV context: IV rank > 60 = premiums expensive, patient entry often better. IV rank < 30 = enter now before IV expands.
5. Technical trigger: Be specific — "On reclaim of $920 with volume", "If holds $880 at open", "On 50-day MA touch".
- urgency: immediate (enter now or at next open), patient (wait 1–3 sessions), conditional (specific price/event trigger required)
- optimalEntry must be specific — not "Now" but "At today's open", "On dip to $875", "After May 28 earnings", "In 2–3 days if $900 holds"

You MUST respond with ONLY a valid JSON object — no markdown fences, no preamble.

Schema (exact field names, types, nesting):
{
  "trades": [{
    "ticker": "NVDA",
    "riskTier": "moderate",
    "strategy": "Buy Call",
    "strategyType": "bullish",
    "summary": {
      "headline": "≤120 chars",
      "plainEnglish": "≤120 chars",
      "expectedOutcome": "≤120 chars",
      "conviction": "High",
      "confidenceScore": 74,
      "whenToBuySimple": "≤120 chars",
      "whenToSellSimple": "≤120 chars"
    },
    "strategyRationale": "≤300 chars, bold key facts with **double asterisks**",
    "expiry": "2025-06-20",
    "expiryLabel": "Jun 20, 2025",
    "daysToExpiry": 52,
    "strike": "900",
    "strike2": null,
    "entryPrice": "3.50",
    "totalCost": "$350",
    "maxProfit": "Unlimited",
    "maxLoss": "$350",
    "breakeven": "903.50",
    "currentPrice": "883.20",
    "ivRank": "34",
    "impliedVolatility": "42",
    "greeks": {
      "delta": { "value": "0.42", "direction": "bullish", "insight": "≤120 chars" },
      "theta": { "value": "-0.08", "dailyCost": "$8", "weeklyDrain": "$56", "insight": "≤120 chars" },
      "gamma": { "value": "0.012", "insight": "≤120 chars" },
      "vega": { "value": "0.25", "insight": "≤120 chars" },
      "ivRankReading": "Low (34th percentile)",
      "ivRankInsight": "≤120 chars"
    },
    "entryTiming": {
      "canEnterNow": true,
      "nowAssessment": "≤80 chars — why you can or cannot enter right now",
      "optimalEntry": "Now | At tomorrow's open | In 2–3 days | On dip to $875 | After earnings May 28",
      "urgency": "immediate | patient | conditional",
      "condition": "≤100 chars — specific trigger or condition for optimal entry",
      "idealEntryPrice": "$2.40–$2.60"
    },
    "exitStrategy": {
      "profitTarget": { "optionPrice": "5.25", "returnPct": "50", "stockPrice": "$920", "rule": "≤100 chars" },
      "stopLoss": { "optionPrice": "1.75", "lossPct": "50", "stockPrice": "$865", "rule": "≤100 chars" },
      "timeStop": { "date": "Jun 13, 2025", "daysBeforeExpiry": 7, "rule": "≤100 chars" },
      "earningsWarning": "≤150 chars"
    },
    "predictions": {
      "bullCase": { "stockTarget": "$945", "optionReturn": "+120%", "probability": "28%", "scenario": "≤100 chars" },
      "baseCase": { "stockTarget": "$910", "optionReturn": "+45%",  "probability": "47%", "scenario": "≤100 chars" },
      "bearCase": { "stockTarget": "$848", "optionReturn": "-100%", "probability": "25%", "scenario": "≤100 chars" }
    },
    "watchFor": {
      "bullishSignals": ["≤80 chars", "≤80 chars", "≤80 chars"],
      "warningSignals": ["≤80 chars", "≤80 chars", "≤80 chars"],
      "keyDates": [
        { "date": "May 28", "event": "NVDA Earnings", "impact": "Critical" },
        { "date": "Jun 11", "event": "FOMC Decision", "impact": "Moderate" },
        { "date": "Jun 13", "event": "Time stop", "impact": "Action Required" }
      ]
    },
    "rationale": "≤300 chars, bold key facts with **double asterisks**",
    "riskLevel": 3,
    "riskFactors": ["≤100 chars", "≤100 chars"],
    "sources": [{ "title": "Source title", "url": "https://real-url.com" }],
    "robinhoodSteps": ["≤80 chars", "≤80 chars", "≤80 chars", "≤80 chars", "≤80 chars"]
  }]
}

Field rules:
- riskTier: must exactly match the requested tier
- strategyType: bullish | bearish | neutral
- riskLevel: integer 1–5
- conviction: High | Medium | Low
- strike2: second strike for spreads, otherwise null
- entryTiming.canEnterNow: boolean — true if entering at this exact moment is reasonable
- entryTiming.urgency: immediate | patient | conditional
- entryTiming.optimalEntry: specific actionable timing e.g. "Now", "At tomorrow's open", "In 2–3 days", "On dip to $880", "After earnings May 28"
- keyDates impact: Critical | Moderate | Action Required | Low
- bullishSignals, warningSignals: exactly 3 items each
- riskFactors: exactly 2 items
- robinhoodSteps: exactly 5 steps
- keyDates: exactly 3 items
- sources: only real URLs from the provided research data; max 3
RESPOND ONLY WITH THE JSON OBJECT. No preamble. No explanation. No code fences.`;

const DISCLAIMER = "This is AI-generated analysis for educational and informational purposes only. It does not constitute financial advice, a solicitation, or a recommendation to buy or sell any security. Options trading involves substantial risk of loss and is not suitable for all investors. Past performance does not guarantee future results. Always consult a qualified financial advisor and do your own research before trading.";

// ─── JSON repair helpers ──────────────────────────────────────────────────────

function fixUnescapedQuotes(str) {
  let result = "";
  let inStr = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "\\" && inStr) {
      result += ch + (str[i + 1] ?? "");
      i++;
      continue;
    }
    if (ch === '"') {
      if (!inStr) {
        inStr = true;
        result += ch;
        continue;
      }
      let j = i + 1;
      while (j < str.length && " \t\r\n".includes(str[j])) j++;
      const peek = str[j];
      if (!peek || ":,}]".includes(peek)) {
        inStr = false;
        result += ch;
      } else {
        result += "'";
      }
      continue;
    }
    result += ch;
  }
  return result;
}

function extractReadableStrings(text) {
  const matches = [...text.matchAll(/:\s*"((?:[^"\\]|\\.){40,})"/g)];
  return matches
    .map(m => m[1].replace(/\\n/g, " ").replace(/\\"/g, '"').replace(/\s+/g, " ").trim())
    .filter(v => !v.includes("http") && !/^\d/.test(v) && !v.startsWith("$"));
}

function extractJSON(accumulated) {
  let start = accumulated.indexOf('{"trades"');
  if (start === -1) start = accumulated.indexOf('{"error"');
  if (start === -1) start = accumulated.indexOf('{"ticker"');
  if (start === -1) start = accumulated.indexOf("{");
  if (start === -1) throw new Error("No JSON found in response — the model may not have finished. Please try again.");

  let slice = "";
  {
    let depth = 0, inStr = false, i = start;
    while (i < accumulated.length) {
      const ch = accumulated[i];
      if (ch === "\\" && inStr) { i += 2; continue; }
      if (ch === '"') inStr = !inStr;
      else if (!inStr) {
        if (ch === "{" || ch === "[") depth++;
        else if (ch === "}" || ch === "]") {
          depth--;
          if (depth === 0) { slice = accumulated.slice(start, i + 1); break; }
        }
      }
      i++;
    }
    if (!slice) slice = accumulated.slice(start);
  }

  let parsed;
  const scrubbed = () => slice.replace(/[\x00-\x1F\x7F]/g, " ");
  const attempts = [
    () => JSON.parse(slice),
    () => JSON.parse(jsonrepair(slice)),
    () => JSON.parse(jsonrepair(scrubbed())),
    () => JSON.parse(jsonrepair(fixUnescapedQuotes(scrubbed()))),
  ];
  for (const attempt of attempts) {
    try { parsed = attempt(); break; } catch (_) {}
  }
  if (!parsed) throw new Error("The AI returned malformed data. Please try again — this usually resolves on retry.");
  return parsed;
}

// ─── Core API caller ──────────────────────────────────────────────────────────

const USE_PROXY = !import.meta.env.VITE_ANTHROPIC_API_KEY;

async function callAPI({ systemPrompt, userMessage, useWebSearch, maxTokens, onProgress }) {
  const headers = { "Content-Type": "application/json" };
  if (!USE_PROXY) {
    headers["x-api-key"] = import.meta.env.VITE_ANTHROPIC_API_KEY;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-beta"] = "prompt-caching-2024-07-31";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    stream: true,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  };
  if (useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const response = await fetch(
    USE_PROXY ? "/api/analyze" : "https://api.anthropic.com/v1/messages",
    { method: "POST", headers, body: JSON.stringify(body) }
  );

  if (!response.ok) {
    const b = await response.json().catch(() => ({}));
    throw new Error(`API ${response.status}: ${b?.error?.message ?? "unknown error"}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let lineBuffer = "";
  let searchCount = 0;
  let lastStringCount = 0;

  const processLine = (line) => {
    if (!line.startsWith("data: ")) return;
    const raw = line.slice(6).trim();
    if (!raw || raw === "[DONE]") return;
    try {
      const evt = JSON.parse(raw);
      if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
        accumulated += evt.delta.text;
        const strings = extractReadableStrings(accumulated);
        if (strings.length !== lastStringCount) {
          lastStringCount = strings.length;
          onProgress?.({ type: "text", strings });
        }
      } else if (evt.type === "content_block_start") {
        if (evt.content_block?.type === "tool_use") {
          searchCount++;
          onProgress?.({ type: "search", count: searchCount });
        } else if (evt.content_block?.type === "text") {
          accumulated = "";
          lastStringCount = 0;
        }
      }
    } catch (_) {}
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      lineBuffer += decoder.decode();
      if (lineBuffer.trim()) processLine(lineBuffer.trim());
      break;
    }
    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop();
    for (const line of lines) processLine(line);
  }

  return extractJSON(accumulated);
}

// ─── Risk ordering enforcement ────────────────────────────────────────────────

function parseMaxLoss(s) {
  if (!s || s === "Unlimited") return Infinity;
  return parseFloat(String(s).replace(/[$,]/g, "")) || Infinity;
}

function enforceRiskOrdering(trades) {
  const sorted = [...trades].sort((a, b) => parseMaxLoss(a.maxLoss) - parseMaxLoss(b.maxLoss));
  const tiers = ["conservative", "moderate", "aggressive"];
  const levels = [2, 3, 4];
  sorted.forEach((trade, i) => {
    trade.riskTier = tiers[i];
    trade.riskLevel = levels[i];
  });
  return sorted;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchRecommendation(ticker, onProgress) {
  const safeTicker = (ticker || "").replace(/[^A-Z0-9.\-]/gi, "").slice(0, 10).toUpperCase();

  // Build time context — market hours are Mon–Fri 9:30–16:00 US Eastern
  const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const today = nowET.toISOString().slice(0, 10);
  const dayOfWeek = nowET.getDay(); // 0=Sun, 6=Sat
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

  const timeContext = `Today is ${today}, current time is ${timeStr}. ${marketStatus}`;

  // Phase 1: one research call with web search — gathers all data once
  const researchMsg = safeTicker
    ? `${timeContext} Gather comprehensive market research for ${safeTicker} to support options strategy analysis. All expiry dates must be at least 21 days from today.`
    : `${timeContext} Scan the US stock market and identify the single best options trade opportunity today, then gather full research for that ticker. All expiry dates must be at least 21 days from today.`;

  const research = await callAPI({
    systemPrompt: RESEARCH_SYSTEM_PROMPT,
    userMessage: researchMsg,
    useWebSearch: true,
    maxTokens: 4000,
    onProgress,
  });

  if (research.error) throw new Error(research.message || "Ticker not found. Please check the symbol and try again.");

  // Phase 2: 3 parallel strategy calls — no web search, inject research data
  const tiers = ["conservative", "moderate", "aggressive"];
  const tierStatus = { conservative: "loading", moderate: "loading", aggressive: "loading" };
  onProgress?.({ type: "strategies", tiers: { ...tierStatus } });

  const researchJSON = JSON.stringify(research);
  const resolvedTicker = research.ticker || safeTicker;

  const results = await Promise.all(
    tiers.map(async (tier) => {
      const result = await callAPI({
        systemPrompt: STRATEGY_SYSTEM_PROMPT,
        userMessage: `${timeContext} Generate the ${tier.toUpperCase()} tier trade for ${resolvedTicker}. The strategy structure is pre-decided in research.strategies.${tier} — retrieve the exact live Greeks for that specific strike/expiry and fill in the complete trade schema.\n\nResearch data:\n${researchJSON}`,
        useWebSearch: true,
        maxTokens: 5000,
        onProgress: null,
      });
      tierStatus[tier] = "done";
      onProgress?.({ type: "strategies", tiers: { ...tierStatus } });
      return result;
    })
  );

  const trades = enforceRiskOrdering(results.map(r => r.trades?.[0]).filter(Boolean));
  return {
    trades,
    marketContext: research.marketContext,
    disclaimer: DISCLAIMER,
  };
}
