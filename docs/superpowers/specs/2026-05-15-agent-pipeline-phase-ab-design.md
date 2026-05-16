# Agent Pipeline Phase A+B Design

**Date:** 2026-05-15  
**Scope:** Phase A (orchestrator refactor) + Phase B (Critic agent)  
**Provider:** Anthropic-only (Claude). Multi-provider in Phase E.

---

## Goal

Phase A: Restructure the existing two-phase AI pipeline into a typed orchestrator pattern — same behavior, new shape. Validates the abstraction before adding agents.

Phase B: Add a Critic agent that validates all 3 Strategist outputs against real chain data, then retries only the failing tiers (max 2 loops per tier).

---

## Architecture

Browser-side orchestration. No changes to the Cloudflare Worker routing — orchestration logic stays in `src/`. The Worker gets one change: `claude-haiku-4-5-20251001` added to `ALLOWED_MODELS`.

```
fetchRecommendation (src/api.js)
  └── orchestrate (src/orchestrator.js)
        ├── Phase 0: fetchMarketData (unchanged)
        ├── Phase 1: runResearcher (src/agents/researcher.js)
        ├── Phase 2: runStrategist × 3 parallel (src/agents/strategist.js)
        └── Phase B: runCritic (src/agents/critic.js)
              └── retry loop: rerun failed tier Strategists (max 2 per tier)
```

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `src/agents/researcher.js` | Researcher agent — wraps Phase 1 callAPI call |
| `src/agents/strategist.js` | Strategist agent — wraps Phase 2 callAPI call (one tier) |
| `src/agents/critic.js` | Critic agent — validates all 3 trades, returns CriticOutput |
| `src/prompts/critic.js` | Critic system prompt |
| `src/orchestrator.js` | DAG runner — calls agents in order, manages retry loop |

### Modified files

| File | Change |
|------|--------|
| `src/api.js` | Add `model` param to `callAPI`; strip orchestration logic into `orchestrator.js`; `fetchRecommendation` becomes a thin wrapper |
| `worker/worker.js` | Add `claude-haiku-4-5-20251001` to `ALLOWED_MODELS` |
| `src/components/LoadingMessages.jsx` | Add "Validating trades..." critic stage |

---

## Agent interfaces

### `callAPI` update

Add `model` parameter (defaults to `claude-sonnet-4-6`):

```js
async function callAPI({ systemPrompt, userMessage, useWebSearch, maxTokens, model = "claude-sonnet-4-6", onProgress, timeoutMs = 55000 })
```

The `model` field is included in the request body sent to the Worker.

---

### `src/agents/researcher.js`

```js
export async function runResearcher({ ticker, livePrefix, researchMsg, hasLiveData, onProgress })
// Returns: ResearcherOutput (the existing research JSON shape from Phase 1)
// Model: claude-haiku-4-5-20251001
// Max tokens: 4000
// Uses: web_search tool
```

Input is the assembled `researchMsg` string (already includes live data prefix if available). Returns the parsed JSON from `callAPI`. Merges `chains` + `liveFetchedAt` from marketData if `hasLiveData`.

---

### `src/agents/strategist.js`

```js
export async function runStrategist({ tier, resolvedTicker, researchJSON, hasLiveData, greeksNote, timeContext, onProgress, critique = null })
// Returns: parsed trade JSON ({ trades: [TradeCard schema] })
// Model: claude-sonnet-4-6
// Max tokens: 5000
// Uses: web_search only when !hasLiveData
```

`critique` is `null` on first run. On retry, it's the `concerns` array from `CriticOutput.trades[i]` for that tier — appended to the user message:

```
... [existing user message] ...

[CRITIC FEEDBACK — attempt 2]
The previous trade had the following issues. Address each one:
- strike_not_found (high): Recommended 195 call but chain shows no 195 strike for June expiry. Nearest are 192.50 and 197.50.
```

---

### `src/agents/critic.js`

```js
export async function runCritic({ trades, marketData, onProgress })
// Returns: CriticOutput
// Model: claude-haiku-4-5-20251001
// Max tokens: 1500
// No web search
```

`marketData` is the full Phase 0 output (includes `chains`). `chainAnalysis` is null in Phase B (Chain Analyst not built until Phase C) — the Critic skips chain-based checks when null.

**CriticOutput contract:**

```json
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
          "detail": "..."
        }
      ]
    }
  ],
  "crossTradeIssues": [],
  "summary": "..."
}
```

---

### `src/orchestrator.js`

```js
export async function orchestrate({ ticker, onProgress })
// Returns: { trades, marketContext, disclaimer, hasLiveData, marketSessionLabel }
```

Execution order:

```
1. fetchMarketData (unchanged)
2. runResearcher
3. runStrategist × 3 (Promise.all)
4. runCritic (Phase B) — if marketData available
5. retry loop:
   for each failed tier (pass === false):
     up to 2 attempts:
       rerun runStrategist with critique
       rerun runCritic on just that tier's updated trade
6. enforceRiskOrdering + IV rank enforcement
7. return result
```

When `marketData === null`, skip Critic (no chain data to validate against).

---

## `onProgress` event shapes

### Existing (unchanged)

```js
{ type: "marketData", ok: true|false }
{ type: "search", count: N }           // from Researcher web search
{ type: "text", strings: [...] }       // live Researcher text feed
{ type: "strategies", tiers: { conservative: "loading"|"done", moderate: "...", aggressive: "..." } }
```

### New in Phase B

```js
{ type: "critic", status: "running" }
{ type: "critic", status: "done", passed: N, failed: N }
{ type: "critic", status: "retrying", tier: "moderate", attempt: 1 }
```

`LoadingMessages.jsx` adds a "Validating trades..." line that appears when `{ type: "critic", status: "running" }` is received.

---

## Models

| Agent | Model | Tokens |
|-------|-------|--------|
| Researcher | `claude-haiku-4-5-20251001` | 4000 |
| Strategist × 3 | `claude-sonnet-4-6` | 5000 each |
| Critic | `claude-haiku-4-5-20251001` | 1500 |

Worker `ALLOWED_MODELS` must include `claude-haiku-4-5-20251001`.

---

## Error handling

| Failure | Behavior |
|---------|----------|
| marketdata.app down | Researcher expands scope (existing fallback); Critic skipped |
| Researcher fails | Abort with error |
| One Strategist tier fails | Return other 2 trades, show error card for failed tier |
| All 3 Strategists fail | Abort |
| Critic fails | Ship all 3 trades uncritiqued |
| Critique loop maxed (2 retries) | Ship latest Strategist output for that tier |
| Cross-trade issues in CriticOutput | Included in result metadata; no retry triggered in Phase B |

When a Strategist retries, if the retry itself fails the previous (failing) trade is shipped rather than crashing the full pipeline.

---

## `src/api.js` after refactor

`fetchRecommendation` becomes a thin wrapper:

```js
export async function fetchRecommendation(ticker, onProgress) {
  return orchestrate({ ticker, onProgress });
}
```

All market data fetching, prompt assembly, phase sequencing, IV rank enforcement, and risk ordering move into `orchestrator.js`.

`callAPI` stays in `api.js` — it's the HTTP primitive used by all agents. It gains a `model` parameter.

---

## Worker change

In `worker/worker.js`, add `claude-haiku-4-5-20251001` to the allowlist:

```js
const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-6',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
]);
```

---

## What does NOT change

- The TradeCard JSON schema (Strategist output shape is unchanged)
- All TradeCard components and rendering
- `src/prompts/research.js` and `src/prompts/strategy.js` (prompts are unchanged)
- The Cloudflare Worker routing and market data endpoint
- Auth, Supabase history, share, download features
- `enforceRiskOrdering` and IV rank enforcement logic (moves to orchestrator.js verbatim)

---

## Out of scope (future phases)

- Chain Analyst (Phase C)
- Catalyst/Sentiment split (Phase D)
- Multi-provider adapters / Gemini / OpenAI (Phase E)
- Full SSE event protocol with `agent:` event type (Phase F)
- Cross-trade retry on `crossTradeIssues`
- Cost tracking / metadata logging
