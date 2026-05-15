import { jsonrepair } from "jsonrepair";
import { RESEARCH_SYSTEM_PROMPT, RESEARCH_SYSTEM_PROMPT_LIVE } from "./prompts/research";
import { STRATEGY_SYSTEM_PROMPT, STRATEGY_SYSTEM_PROMPT_LIVE } from "./prompts/strategy";

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

async function callAPI({ systemPrompt, userMessage, useWebSearch, maxTokens, onProgress, timeoutMs = 55000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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

  let response;
  try {
    response = await fetch(
      USE_PROXY ? `${import.meta.env.VITE_API_BASE ?? ''}/analyze` : "https://api.anthropic.com/v1/messages",
      { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal }
    );
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("Analysis timed out — the web search took too long. Please try again.");
    throw err;
  }

  if (!response.ok) {
    clearTimeout(timer);
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

  try {
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
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Analysis timed out — the web search took too long. Please try again.");
    throw err;
  } finally {
    clearTimeout(timer);
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

// ─── Market data helpers ──────────────────────────────────────────────────────

async function fetchMarketData(ticker) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}/market?ticker=${ticker}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch {
    return null;
  }
}

function buildLiveDataBlock(marketData) {
  const { quote, ivCurrent, ivRank, chains, fetchedAt } = marketData;
  const fetchTime = new Date(fetchedAt).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" });
  const iv = ivCurrent != null ? `${(ivCurrent * 100).toFixed(1)}%` : "unavailable";
  const ivRankStr = ivRank != null ? `${ivRank}th percentile` : "unavailable";
  const g = (v, d) => v != null ? v.toFixed(d) : "n/a";

  let block = `[LIVE MARKET DATA — fetched ${fetchTime} ET]\n`;
  block += `Stock: ${marketData.ticker} @ $${quote.last} (${(quote.changePercent ?? 0) >= 0 ? "+" : ""}${quote.changePercent?.toFixed(1) ?? "0.0"}%) | Bid: $${quote.bid} | Ask: $${quote.ask}\n`;
  block += `IV: ${iv} | IV Rank: ${ivRankStr}\n\nOptions Chain:\n`;

  for (const chain of chains) {
    block += `${chain.expiry} (${chain.daysToExpiry} DTE):\n`;
    for (const o of chain.options) {
      block += `  ${o.strike} ${o.type} | bid: $${g(o.bid, 2)} | ask: $${g(o.ask, 2)} | Δ ${g(o.delta, 2)} | θ ${g(o.theta, 2)} | γ ${g(o.gamma, 3)} | ν ${g(o.vega, 2)} | IV: ${o.iv != null ? (o.iv * 100).toFixed(1) + "%" : "n/a"} | vol: ${o.volume ?? "n/a"}\n`;
    }
    block += "\n";
  }
  return block;
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

  const marketSessionLabel = !isWeekday ? "Closed (weekend)"
    : isMarketOpen ? "Regular session"
    : hour < 9 || (hour === 9 && minute < 30) ? "Pre-market"
    : "After-hours";

  const timeContext = `Today is ${today}, current time is ${timeStr}. ${marketStatus}`;

  // Fire market data fetch in parallel — doesn't block time context build
  const marketDataPromise = safeTicker ? fetchMarketData(safeTicker) : Promise.resolve(null);

  const marketData = await marketDataPromise;
  const hasLiveData = marketData !== null;
  if (safeTicker) onProgress?.({ type: "marketData", ok: hasLiveData });

  // Phase 1: one research call with web search — gathers all data once
  const livePrefix = hasLiveData ? buildLiveDataBlock(marketData) + "\n" : "";
  const researchMsg = safeTicker
    ? `${livePrefix}${timeContext} Gather comprehensive market research for ${safeTicker} to support options strategy analysis. All expiry dates must be at least 21 days from today.`
    : `${timeContext} Scan the US stock market and identify the single best options trade opportunity today, then gather full research for that ticker. All expiry dates must be at least 21 days from today.`;

  const research = await callAPI({
    systemPrompt: hasLiveData ? RESEARCH_SYSTEM_PROMPT_LIVE : RESEARCH_SYSTEM_PROMPT,
    userMessage: researchMsg,
    useWebSearch: true,
    maxTokens: 4000,
    onProgress,
  });
  if (research.error) throw new Error(research.message || "Ticker not found. Please check the symbol and try again.");

  // Merge live chain data into research so Phase 2 prompts can reference research.chains
  if (hasLiveData) {
    research.chains = marketData.chains;
    research.liveFetchedAt = marketData.fetchedAt;
  }

  // Phase 2: 3 parallel strategy calls — inject research data; skip web search when live chain available
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
      const result = await callAPI({
        systemPrompt: hasLiveData ? STRATEGY_SYSTEM_PROMPT_LIVE : STRATEGY_SYSTEM_PROMPT,
        userMessage: `${timeContext} Generate the ${tier.toUpperCase()} tier trade for ${resolvedTicker}. The strategy structure is pre-decided in research.strategies.${tier} — ${greeksNote} and fill in the complete trade schema.\n\nResearch data:\n${researchJSON}`,
        useWebSearch: !hasLiveData,
        maxTokens: 5000,
        onProgress: null,
      });
      tierStatus[tier] = "done";
      onProgress?.({ type: "strategies", tiers: { ...tierStatus } });
      return result;
    })
  );

  const trades = enforceRiskOrdering(results.map(r => {
    const t = r.trades?.[0];
    if (!t) return t;
    // Guarantee IV rank flows from Phase 1 research (web search) into every trade card
    if (research.ivRank && research.ivRank !== "0") {
      t.ivRank = String(research.ivRank);
      const n = parseInt(research.ivRank, 10);
      const reading = n < 40 ? "Low" : n > 60 ? "High" : "Average";
      if (t.greeks) {
        t.greeks.ivRankReading = `${reading} (${n}th percentile)`;
      }
    }
    // Use live ATM IV as impliedVolatility when available — more accurate than AI estimate
    if (hasLiveData && marketData.ivCurrent != null) {
      t.impliedVolatility = (marketData.ivCurrent * 100).toFixed(1);
    }
    return t;
  }).filter(Boolean));
  return {
    trades,
    marketContext: research.marketContext,
    disclaimer: DISCLAIMER,
    hasLiveData,
    marketSessionLabel,
  };
}
