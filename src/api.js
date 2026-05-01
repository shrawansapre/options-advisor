import { jsonrepair } from "jsonrepair";

// ─── System Prompt ──────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are an expert options trader and analyst. When given a ticker symbol (or asked to scan the market), use web search to gather: current stock price, implied volatility rank (IVR), upcoming earnings date, recent news and catalysts, technical trend and support/resistance levels, and overall market context.

CRITICAL — GREEK VERIFICATION: You MUST use web search to look up the actual current option chain for the specific ticker, strike, and expiry you intend to recommend. Delta, theta, gamma, vega, and IV rank must come from real retrieved market data — never estimate or invent them. If the exact option chain is not findable, adjust your recommendation to a strike/expiry where you can confirm real values.

CRITICAL — IV RANK: Search "[TICKER] IV rank" or "[TICKER] implied volatility rank" explicitly before setting ivRank. Reliable sources: Barchart.com, Market Chameleon, tastytrade. An IV rank of 0 is extremely rare — if your search returns 0 or you cannot find the value, search again with different terms before using that number. A very low IV rank (under 15) means options are unusually cheap relative to their historical range, which may reflect suppressed volatility in a downtrending or distressed stock — do NOT interpret this as "good to buy" without considering the underlying trend.

CRITICAL — STRATEGY JUSTIFICATION: Explicitly explain why you chose this specific strategy structure (long call, spread, put, straddle, etc.) over the most obvious alternatives. Compare risk/reward trade-offs concretely. Keep strategyRationale to 2-3 sentences maximum. Keep rationale to 2-3 sentences maximum. In both fields, wrap the 2-3 most important conclusions or facts in **double asterisks** so they render as bold (e.g. "**IV rank is at the 22nd percentile**, making calls unusually cheap.").

CRITICAL — SOURCES: For every news article, earnings date, or market data point you reference, record the URL in the sources array. Only include URLs you actually retrieved during this session.

CRITICAL — JSON SAFETY: The output is parsed by JSON.parse(). Never include unescaped double-quote characters inside a string value — if you need to quote a term within a string, use single quotes instead (e.g. 'delta effect' not "delta effect"). Never include literal newline characters inside a string value — write everything on one continuous line within each string. This is the most common cause of parse failures.

CRITICAL — RESPONSE LENGTH: Your entire JSON response must stay well under 7000 tokens. Enforce these hard limits on every string value you write: headline, plainEnglish, expectedOutcome, whenToBuySimple, whenToSellSimple — max 120 characters each. insight fields (delta, theta, gamma, vega, ivRankInsight) — max 120 characters each. scenario in predictions — max 100 characters each. rule in exitStrategy — max 100 characters each. rationale and strategyRationale — max 300 characters each. earningsWarning — max 150 characters. Each robinhoodStep — max 80 characters; use exactly 5 steps. bullishSignals and warningSignals — exactly 3 items each, max 80 characters each. riskFactors — exactly 2 items, max 100 characters each. keyDates — exactly 3 items. sources — max 3 items. Violating these limits risks truncation and a broken response.

CRITICAL — INVALID TICKER: If the ticker symbol does not exist, is not traded on US markets, has been delisted, or cannot be found via web search, respond with ONLY this JSON and nothing else: {"error": "Ticker not found", "message": "Could not find [SYMBOL] on US markets. Please check the symbol and try again."}

Recommend exactly 1 specific, actionable options trade. You MUST respond with ONLY a valid JSON object — no markdown fences, no preamble, no explanation. Just raw JSON.

Schema (use exact field names, types, and nesting):

{
  "trades": [{
    "ticker": "NVDA",
    "strategy": "Buy Call",
    "strategyType": "bullish",
    "summary": {
      "headline": "Short punchy headline ≤120 chars",
      "plainEnglish": "Plain-English trade description ≤120 chars",
      "expectedOutcome": "Expected outcome ≤120 chars",
      "conviction": "High",
      "confidenceScore": 74,
      "whenToBuySimple": "Entry timing with specific price level ≤120 chars",
      "whenToSellSimple": "Exit trigger ≤120 chars"
    },
    "strategyRationale": "Why this strategy over alternatives. 2-3 sentences, ≤300 chars. Bold key facts with **double asterisks**.",
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
      "delta": { "value": "0.42", "direction": "bullish", "insight": "Dollar impact per $1 move ≤120 chars" },
      "theta": { "value": "-0.08", "dailyCost": "$8", "weeklyDrain": "$56", "insight": "Daily cost in dollar terms ≤120 chars" },
      "gamma": { "value": "0.012", "insight": "Acceleration effect ≤120 chars" },
      "vega": { "value": "0.25", "insight": "IV sensitivity in dollar terms ≤120 chars" },
      "ivRankReading": "Low (34th percentile)",
      "ivRankInsight": "What IV rank means for this trade ≤120 chars"
    },
    "exitStrategy": {
      "profitTarget": { "optionPrice": "5.25", "returnPct": "50", "stockPrice": "$920", "rule": "≤100 chars" },
      "stopLoss": { "optionPrice": "1.75", "lossPct": "50", "stockPrice": "$865", "rule": "≤100 chars" },
      "timeStop": { "date": "Jun 13, 2025", "daysBeforeExpiry": 7, "rule": "≤100 chars" },
      "earningsWarning": "Earnings/IV crush warning if applicable ≤150 chars"
    },
    "predictions": {
      "bullCase": { "stockTarget": "$945", "optionReturn": "+120%", "probability": "28%", "scenario": "≤100 chars" },
      "baseCase": { "stockTarget": "$910", "optionReturn": "+45%",  "probability": "47%", "scenario": "≤100 chars" },
      "bearCase": { "stockTarget": "$848", "optionReturn": "-100%", "probability": "25%", "scenario": "≤100 chars" }
    },
    "watchFor": {
      "bullishSignals": ["Signal 1 ≤80 chars", "Signal 2 ≤80 chars", "Signal 3 ≤80 chars"],
      "warningSignals": ["Warning 1 ≤80 chars", "Warning 2 ≤80 chars", "Warning 3 ≤80 chars"],
      "keyDates": [
        { "date": "May 28", "event": "NVDA Earnings", "impact": "Critical" },
        { "date": "Jun 11", "event": "FOMC Decision", "impact": "Moderate" },
        { "date": "Jun 13", "event": "Time stop", "impact": "Action Required" }
      ]
    },
    "rationale": "Trade thesis. 2-3 sentences, ≤300 chars. Bold key facts with **double asterisks**.",
    "riskLevel": 3,
    "riskFactors": ["Risk 1 ≤100 chars", "Risk 2 ≤100 chars"],
    "sources": [
      { "title": "Source title", "url": "https://real-url-from-search.com" }
    ],
    "robinhoodSteps": [
      "Step 1 ≤80 chars",
      "Step 2 ≤80 chars",
      "Step 3 ≤80 chars",
      "Step 4 ≤80 chars",
      "Step 5 ≤80 chars"
    ]
  }],
  "marketContext": "1-2 sentences on current market conditions.",
  "disclaimer": "This is AI-generated analysis for educational purposes only. Options trading involves substantial risk of loss and is not appropriate for all investors. Past performance does not guarantee future results. Always do your own research before trading."
}

Field rules:
- strategyType: bullish | bearish | neutral
- riskLevel: integer 1–5
- conviction: High | Medium | Low
- strike2: second strike string for spreads, otherwise null
- keyDates impact: Critical | Moderate | Action Required | Low
- bullishSignals, warningSignals: exactly 3 items each
- riskFactors: exactly 2 items
- robinhoodSteps: exactly 5 steps
- keyDates: exactly 3 items
- sources: only real URLs retrieved during this session; omit entries without a real URL
RESPOND ONLY WITH THE JSON OBJECT. No preamble. No explanation. No code fences.`;

// ─── JSON repair helpers ──────────────────────────────────────────────────────

// Replace unescaped double-quotes that appear mid-string-value with single quotes.
// Walks character-by-character, tracking string state and skipping real escape sequences.
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
      // Peek past whitespace to decide if this closes the string
      let j = i + 1;
      while (j < str.length && " \t\r\n".includes(str[j])) j++;
      const peek = str[j];
      if (!peek || ":,}]".includes(peek)) {
        inStr = false;
        result += ch;
      } else {
        result += "'"; // interior unescaped quote → single quote
      }
      continue;
    }
    result += ch;
  }
  return result;
}

// ─── Stream helpers ───────────────────────────────────────────────────────────

function extractReadableStrings(text) {
  const matches = [...text.matchAll(/:\s*"((?:[^"\\]|\\.){40,})"/g)];
  return matches
    .map(m => m[1].replace(/\\n/g, " ").replace(/\\"/g, '"').replace(/\s+/g, " ").trim())
    .filter(v => !v.includes("http") && !/^\d/.test(v) && !v.startsWith("$"));
}

// ─── API Call ────────────────────────────────────────────────────────────────

const USE_PROXY = !import.meta.env.VITE_ANTHROPIC_API_KEY;

export async function fetchRecommendation(ticker, onProgress) {
  const safeTicker = (ticker || "").replace(/[^A-Z0-9.\-]/gi, "").slice(0, 10).toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const userMessage = safeTicker
    ? `Today is ${today}. Give me a comprehensive options trade recommendation for ${safeTicker}. All recommended expiry dates must be at least 21 days in the future from today. Use web search to get the current stock price, IV rank, upcoming earnings date, recent news, and technical levels before recommending.`
    : `Today is ${today}. Scan the US stock market and identify the single best options trade opportunity available today. All recommended expiry dates must be at least 21 days in the future from today. Look for a stock with a clear catalyst, a defined technical setup, and reasonable implied volatility. Use web search to find current data and confirm the setup before recommending.`;

  const headers = { "Content-Type": "application/json" };
  if (!USE_PROXY) {
    headers["x-api-key"] = import.meta.env.VITE_ANTHROPIC_API_KEY;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-beta"] = "prompt-caching-2024-07-31";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const response = await fetch(
    USE_PROXY ? "/api/analyze" : "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        stream: true,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userMessage }]
      })
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`API ${response.status}: ${body?.error?.message ?? "unknown error"}`);
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
      // Flush decoder and process any line that wasn't terminated with \n
      lineBuffer += decoder.decode();
      if (lineBuffer.trim()) processLine(lineBuffer.trim());
      break;
    }

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop();
    for (const line of lines) processLine(line);
  }

  // Walk from the known opening brace using balanced brackets so any trailing
  // text the model appends (e.g. "Note: {today}") can't corrupt the slice.
  let start = accumulated.indexOf('{"trades"');
  if (start === -1) start = accumulated.indexOf('{"error"');
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
        else if (ch === "}" || ch === "]") { depth--; if (depth === 0) { slice = accumulated.slice(start, i + 1); break; } }
      }
      i++;
    }
    // If we never closed (truncated response), take everything from start
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
  if (parsed.error) throw new Error(parsed.message || "Ticker not found. Please check the symbol and try again.");
  return parsed;
}
