# Agent Pipeline Phase A+B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the two-phase AI pipeline into a typed orchestrator pattern (Phase A), then add a Critic agent that validates trades against live chain data and retries failing tiers (Phase B).

**Architecture:** `callAPI` moves to `src/lib/claude.js` to avoid circular imports. Agent files (`researcher.js`, `strategist.js`, `critic.js`) each import from `lib/claude.js`. `orchestrator.js` calls the agents and owns the pipeline DAG. `api.js` becomes a one-function wrapper that calls `orchestrate()`.

**Tech Stack:** React 18 + Vite, Anthropic API (Sonnet + Haiku), Cloudflare Worker proxy, vanilla JS (no TypeScript).

---

## File map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/claude.js` | `callAPI` + JSON repair helpers (HTTP primitive) |
| Create | `src/agents/researcher.js` | Phase 1 — Haiku + web_search |
| Create | `src/agents/strategist.js` | Phase 2 — Sonnet, one tier per call |
| Create | `src/agents/critic.js` | Phase B — Haiku, validates 3 trades |
| Create | `src/prompts/critic.js` | Critic system prompt |
| Create | `src/orchestrator.js` | Pipeline DAG + market data helpers |
| Modify | `src/api.js` | Strip to thin wrapper, remove moved code |
| Modify | `worker/worker.js` | Add Haiku to ALLOWED_MODELS |
| Modify | `src/components/LoadingMessages.jsx` | Add critic stage |

---

## Task 1: Create `src/lib/claude.js`

Move `callAPI` and all JSON repair helpers out of `api.js` into a standalone module. Add `model` parameter to `callAPI`. This breaks the future circular import (`api.js → orchestrator.js → agents → api.js`).

**Files:**
- Create: `src/lib/claude.js`

- [ ] **Step 1: Create `src/lib/claude.js` with this exact content**

```js
import { jsonrepair } from "jsonrepair";

const USE_PROXY = !import.meta.env.VITE_ANTHROPIC_API_KEY;

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

export async function callAPI({ systemPrompt, userMessage, useWebSearch, maxTokens, model = "claude-sonnet-4-6", onProgress, timeoutMs = 120000 }) {
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
    model,
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
```

- [ ] **Step 2: Verify the file was created**

```bash
ls src/lib/claude.js
```
Expected: file exists.

---

## Task 2: Update `worker/worker.js` — add Haiku to allowlist

**Files:**
- Modify: `worker/worker.js:1`

- [ ] **Step 1: Update the ALLOWED_MODELS set**

In `worker/worker.js`, change line 1 from:
```js
const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-sonnet-4-20250514']);
```
To:
```js
const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001']);
```

---

## Task 3: Create `src/agents/researcher.js`

**Files:**
- Create: `src/agents/researcher.js`

- [ ] **Step 1: Create the file**

```js
import { callAPI } from "../lib/claude.js";
import { RESEARCH_SYSTEM_PROMPT, RESEARCH_SYSTEM_PROMPT_LIVE } from "../prompts/research.js";

export async function runResearcher({ researchMsg, hasLiveData, onProgress }) {
  const result = await callAPI({
    systemPrompt: hasLiveData ? RESEARCH_SYSTEM_PROMPT_LIVE : RESEARCH_SYSTEM_PROMPT,
    userMessage: researchMsg,
    useWebSearch: true,
    maxTokens: 4000,
    model: "claude-haiku-4-5-20251001",
    onProgress,
  });
  if (result.error) throw new Error(result.message || "Ticker not found. Please check the symbol and try again.");
  return result;
}
```

---

## Task 4: Create `src/agents/strategist.js`

**Files:**
- Create: `src/agents/strategist.js`

- [ ] **Step 1: Create the file**

```js
import { callAPI } from "../lib/claude.js";
import { STRATEGY_SYSTEM_PROMPT, STRATEGY_SYSTEM_PROMPT_LIVE } from "../prompts/strategy.js";

export async function runStrategist({ tier, resolvedTicker, researchJSON, hasLiveData, greeksNote, timeContext, critique = null }) {
  let userMsg = `${timeContext} Generate the ${tier.toUpperCase()} tier trade for ${resolvedTicker}. The strategy structure is pre-decided in research.strategies.${tier} — ${greeksNote} and fill in the complete trade schema.\n\nResearch data:\n${researchJSON}`;

  if (critique?.length) {
    userMsg += `\n\n[CRITIC FEEDBACK — address each issue in your response]\n${critique.map(c => `- ${c.type} (${c.severity}): ${c.detail}`).join("\n")}`;
  }

  return callAPI({
    systemPrompt: hasLiveData ? STRATEGY_SYSTEM_PROMPT_LIVE : STRATEGY_SYSTEM_PROMPT,
    userMessage: userMsg,
    useWebSearch: !hasLiveData,
    maxTokens: 5000,
    model: "claude-sonnet-4-6",
    onProgress: null,
  });
}
```

---

## Task 5: Create `src/orchestrator.js`

Contains the pipeline DAG logic currently in `fetchRecommendation`. Market data helpers move here from `api.js`. `buildLiveDataBlock` is exported so the Critic agent can reuse it in Phase B.

**Files:**
- Create: `src/orchestrator.js`

- [ ] **Step 1: Create the file**

```js
import { runResearcher } from "./agents/researcher.js";
import { runStrategist } from "./agents/strategist.js";

const DISCLAIMER = "This is AI-generated analysis for educational and informational purposes only. It does not constitute financial advice, a solicitation, or a recommendation to buy or sell any security. Options trading involves substantial risk of loss and is not suitable for all investors. Past performance does not guarantee future results. Always consult a qualified financial advisor and do your own research before trading.";

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

export function buildLiveDataBlock(marketData) {
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

export async function orchestrate({ ticker, onProgress }) {
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

  const marketDataPromise = safeTicker ? fetchMarketData(safeTicker) : Promise.resolve(null);
  const marketData = await marketDataPromise;
  const hasLiveData = marketData !== null;
  if (safeTicker) onProgress?.({ type: "marketData", ok: hasLiveData });

  const livePrefix = hasLiveData ? buildLiveDataBlock(marketData) + "\n" : "";
  const researchMsg = safeTicker
    ? `${livePrefix}${timeContext} Gather comprehensive market research for ${safeTicker} to support options strategy analysis. All expiry dates must be at least 21 days from today.`
    : `${timeContext} Scan the US stock market and identify the single best options trade opportunity today, then gather full research for that ticker. All expiry dates must be at least 21 days from today.`;

  const research = await runResearcher({ researchMsg, hasLiveData, onProgress });

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
      const result = await runStrategist({ tier, resolvedTicker, researchJSON, hasLiveData, greeksNote, timeContext });
      tierStatus[tier] = "done";
      onProgress?.({ type: "strategies", tiers: { ...tierStatus } });
      return result;
    })
  );

  const trades = enforceRiskOrdering(results.map(r => {
    const t = r.trades?.[0];
    if (!t) return t;
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
  }).filter(Boolean));

  return {
    trades,
    marketContext: research.marketContext,
    disclaimer: DISCLAIMER,
    hasLiveData,
    marketSessionLabel,
  };
}
```

---

## Task 6: Refactor `src/api.js`

Strip `api.js` down to a one-function wrapper. Everything else moved to `lib/claude.js` and `orchestrator.js`.

**Files:**
- Modify: `src/api.js`

- [ ] **Step 1: Replace the entire contents of `src/api.js`**

```js
import { orchestrate } from "./orchestrator.js";

export async function fetchRecommendation(ticker, onProgress) {
  return orchestrate({ ticker, onProgress });
}
```

- [ ] **Step 2: Verify Vite can resolve all imports**

```bash
npm run build 2>&1 | head -40
```
Expected: build succeeds with no errors. If there's a missing import (e.g. `jsonrepair` not found in `lib/claude.js`), fix it before continuing.

- [ ] **Step 3: Open the app in the browser and run one analysis**

The dev server is already running at `http://localhost:3000`. Analyze a real ticker (e.g. AAPL). Confirm:
- Loading panel shows all 3 stages (market data → research → strategies)
- All 3 trade cards render correctly
- No console errors

- [ ] **Step 4: Commit Phase A**

```bash
git add src/lib/claude.js src/agents/researcher.js src/agents/strategist.js src/orchestrator.js src/api.js worker/worker.js
git commit -m "Phase A: refactor into orchestrator + agent modules

callAPI moves to src/lib/claude.js (avoids circular imports). Researcher
and Strategist extracted to src/agents/. Pipeline DAG lives in
orchestrator.js. api.js is now a one-line wrapper. Researcher uses Haiku.
Worker allowlist updated for claude-haiku-4-5-20251001.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Create `src/prompts/critic.js`

**Files:**
- Create: `src/prompts/critic.js`

- [ ] **Step 1: Create the file**

```js
export const CRITIC_SYSTEM_PROMPT = `You are a trade validation agent. You receive 3 options trade recommendations and live market data. Validate each trade against the real options chain.

For each trade check:
1. Strike exists — does the recommended strike appear in the chain for that exact expiry? Flag as high-severity if not.
2. Price is real — is the entry price within the actual bid/ask range? Flag if outside by more than 15%.
3. Delta matches — does the stated delta match chain data for that strike/expiry within ±0.05?
4. Spread executable — is the bid/ask spread less than 30% of mid price? Flag wider spreads.
5. Timeline — does the expiry align with any catalyst mentioned in the trade thesis?
6. Risk tier — is conservative truly less risky (smaller max loss) than moderate? Is aggressive riskier than moderate?
7. Cross-trade — do all 3 trades share a coherent directional thesis for the same ticker?
8. IV logic — if IV rank > 60 and the trade buys premium, flag unless there is a specific catalyst thesis.

Skip checks 1-4 if no live chain data is provided.
A trade passes (pass: true) if it has no high-severity concerns. Medium or low concerns still pass.

CRITICAL — JSON SAFETY: Never include unescaped double-quotes inside string values. No literal newlines inside strings.

Return ONLY this JSON:
{
  "trades": [
    {
      "riskTier": "conservative",
      "pass": true,
      "concerns": []
    },
    {
      "riskTier": "moderate",
      "pass": false,
      "concerns": [
        {
          "type": "strike_not_found|price_mismatch|delta_mismatch|spread_too_wide|timeline_mismatch|iv_logic|tier_inconsistency|thesis_contradiction|other",
          "severity": "high|medium|low",
          "detail": "Specific description of the issue"
        }
      ]
    },
    {
      "riskTier": "aggressive",
      "pass": true,
      "concerns": []
    }
  ],
  "crossTradeIssues": [],
  "summary": "One sentence summary of overall validation result"
}
RESPOND ONLY WITH THE JSON OBJECT. No preamble. No markdown fences.`;
```

---

## Task 8: Create `src/agents/critic.js`

**Files:**
- Create: `src/agents/critic.js`

- [ ] **Step 1: Create the file**

```js
import { callAPI } from "../lib/claude.js";
import { buildLiveDataBlock } from "../orchestrator.js";
import { CRITIC_SYSTEM_PROMPT } from "../prompts/critic.js";

export async function runCritic({ trades, marketData }) {
  const chainText = marketData
    ? buildLiveDataBlock(marketData)
    : "No live chain data available. Skip checks 1-4 (strike, price, delta, spread).";

  const userMsg = `Validate these 3 options trade recommendations against the live market data.

${chainText}
Trades to validate:
${JSON.stringify(trades, null, 2)}`;

  return callAPI({
    systemPrompt: CRITIC_SYSTEM_PROMPT,
    userMessage: userMsg,
    useWebSearch: false,
    maxTokens: 1500,
    model: "claude-haiku-4-5-20251001",
    onProgress: null,
    timeoutMs: 30000,
  });
}
```

---

## Task 9: Add Critic + retry loop to `src/orchestrator.js`

**Files:**
- Modify: `src/orchestrator.js`

- [ ] **Step 1: Add the Critic import at the top of `src/orchestrator.js`**

After the existing imports, add:
```js
import { runCritic } from "./agents/critic.js";
```

- [ ] **Step 2: Replace the `return` statement at the end of `orchestrate()` with the Critic block**

Find this in `orchestrate()`:
```js
  return {
    trades,
    marketContext: research.marketContext,
    disclaimer: DISCLAIMER,
    hasLiveData,
    marketSessionLabel,
  };
```

Replace it with:
```js
  let currentTrades = [...trades];

  if (hasLiveData) {
    try {
      onProgress?.({ type: "critic", status: "running" });
      const criticResult = await runCritic({ trades: currentTrades, marketData });
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
              critique: failedCritique.concerns,
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
    marketContext: research.marketContext,
    disclaimer: DISCLAIMER,
    hasLiveData,
    marketSessionLabel,
  };
```

---

## Task 10: Update `src/components/LoadingMessages.jsx`

Add the critic stage so users see "Validating trades..." after strategies complete.

**Files:**
- Modify: `src/components/LoadingMessages.jsx`

- [ ] **Step 1: Add "critic" to STAGES and add criticStatus + criticMessage state**

Find:
```js
const STAGES = ["marketData", "research", "strategies"];
```
Replace with:
```js
const STAGES = ["marketData", "research", "strategies", "critic"];
```

Find the block of `useState` calls:
```js
  const [stage, setStage]           = useState("marketData");
  const [liveDataOk, setLiveDataOk] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [tierStatus, setTierStatus] = useState(null);
  const [finding, setFinding] = useState(null);
```
Replace with:
```js
  const [stage, setStage]             = useState("marketData");
  const [liveDataOk, setLiveDataOk]   = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [tierStatus, setTierStatus]   = useState(null);
  const [finding, setFinding]         = useState(null);
  const [criticMessage, setCriticMessage] = useState("Validating trades against live data…");
  const [criticDone, setCriticDone]   = useState(null);
```

- [ ] **Step 2: Handle critic progress events in the useEffect**

Find:
```js
    } else if (type === "strategies") {
      setTierStatus(progress.tiers);
      setFinding(null);
      setStage(s => stageIdx("strategies") > stageIdx(s) ? "strategies" : s);
    }
```
Replace with:
```js
    } else if (type === "strategies") {
      setTierStatus(progress.tiers);
      setFinding(null);
      setStage(s => stageIdx("strategies") > stageIdx(s) ? "strategies" : s);
    } else if (type === "critic") {
      setStage(s => stageIdx("critic") > stageIdx(s) ? "critic" : s);
      if (progress.status === "retrying") {
        setCriticMessage(`Refining ${progress.tier} trade…`);
      } else if (progress.status === "done") {
        setCriticDone({ passed: progress.passed, failed: progress.failed });
      }
    }
```

- [ ] **Step 3: Update `completedLabel` to handle the critic stage**

Find:
```js
function completedLabel(key, { liveDataOk, searchCount }) {
  if (key === "marketData") return liveDataOk ? "Live options chain & Greeks loaded" : "Using web search for market data";
  if (key === "research")   return `Searched news & catalysts${searchCount > 1 ? ` (${searchCount} searches)` : ""}`;
  return null;
}
```
Replace with:
```js
function completedLabel(key, { liveDataOk, searchCount, criticDone }) {
  if (key === "marketData") return liveDataOk ? "Live options chain & Greeks loaded" : "Using web search for market data";
  if (key === "research")   return `Searched news & catalysts${searchCount > 1 ? ` (${searchCount} searches)` : ""}`;
  if (key === "critic")     return criticDone
    ? `${criticDone.passed} of 3 trades validated${criticDone.failed ? ` · ${criticDone.failed} refined` : ""}`
    : "Trades validated";
  return null;
}
```

- [ ] **Step 4: Update `activeLabel` to handle the critic stage**

Find:
```js
function activeLabel(stage, searchCount) {
  if (stage === "marketData") return "Fetching live options chain…";
  if (stage === "research")   return "Searching news & catalysts…";
  if (stage === "strategies") return "Building 3 strategies…";
}
```
Replace with:
```js
function activeLabel(stage, searchCount, criticMessage) {
  if (stage === "marketData") return "Fetching live options chain…";
  if (stage === "research")   return "Searching news & catalysts…";
  if (stage === "strategies") return "Building 3 strategies…";
  if (stage === "critic")     return criticMessage;
}
```

- [ ] **Step 5: Update the `meta` object and `activeLabel` call to pass new state**

Find:
```js
  const meta = { liveDataOk, searchCount };
```
Replace with:
```js
  const meta = { liveDataOk, searchCount, criticDone };
```

Find:
```js
              <span>{activeLabel(stage, searchCount)}</span>
```
Replace with:
```js
              <span>{activeLabel(stage, searchCount, criticMessage)}</span>
```

- [ ] **Step 6: Verify in browser**

Analyze a ticker. After all 3 strategy pills show done, a "Validating trades against live data…" line should appear. When the result loads, it will have already unmounted — but check browser console to confirm no errors, and confirm the active stage message appears briefly.

(The critic stage is fast enough (~5-10s) that it may flash quickly before the result renders. This is expected behavior.)

- [ ] **Step 7: Commit Phase B**

```bash
git add src/prompts/critic.js src/agents/critic.js src/orchestrator.js src/components/LoadingMessages.jsx
git commit -m "Phase B: add Critic agent with per-tier retry loop

Critic (Haiku, 1500 tokens) validates all 3 trades against live chain
data after Strategists complete. Failing tiers trigger a Strategist
retry with critique feedback (max 2 attempts per tier). LoadingMessages
shows 'Validating trades...' critic stage. Critic is skipped when no
live market data is available.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage:**
- ✅ `callAPI` gets `model` param (Task 1)
- ✅ Worker ALLOWED_MODELS updated (Task 2)
- ✅ Researcher agent — Haiku, 4000 tokens, web_search (Task 3)
- ✅ Strategist agent — Sonnet, 5000 tokens, critique param (Task 4)
- ✅ Orchestrator with all Phase 1+2 logic (Task 5)
- ✅ `api.js` thin wrapper (Task 6)
- ✅ Critic prompt (Task 7)
- ✅ Critic agent — Haiku, 1500 tokens, 30s timeout, no web search (Task 8)
- ✅ Critic + retry loop in orchestrator (Task 9)
- ✅ LoadingMessages critic stage (Task 10)
- ✅ Error handling: Critic fails → `try/catch` ships uncritiqued; retry fails → `catch` tries again up to 2× then ships
- ✅ Critic skipped when `!hasLiveData`
- ✅ `crossTradeIssues` included in CriticOutput schema (prompt) — no retry triggered on them
- ✅ `buildLiveDataBlock` exported from orchestrator for Critic reuse
- ✅ No circular imports: `lib/claude.js` has no src imports; agents import from `lib/`; orchestrator imports agents; `api.js` imports orchestrator
