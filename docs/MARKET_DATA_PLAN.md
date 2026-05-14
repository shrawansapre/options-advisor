# Real-Time Market Data Integration

## Context

Currently all structured market data (price, IV, options chain, Greeks) comes from Claude's web search tool — which takes 5-25s per call, is unpredictable, and causes Vercel timeout issues. The data is also potentially stale.

The fix: inject live market data directly into Claude's prompt from a dedicated market data API. Claude then has accurate, structured numbers and only needs web search for news, catalysts, and macro context (a much faster, targeted search).

---

## Data Requirements

**From market data API (structured, real-time):**
- Stock quote: last price, bid/ask, % change
- Options chain: 2-3 nearest expiries, all strikes within ±20% of current price
- Per contract: bid, ask, IV, delta, theta, gamma, vega, volume, open interest
- Historical daily close + IV for 52-week IV rank calculation

**Stays as web search (narrative, can't come from API):**
- Recent news headlines and URLs
- Earnings date confirmation + narrative
- Technical analysis narrative
- FOMC, CPI, macro event context

---

## Provider Decision

**Primary: Tradier**
- Free sandbox for development (full API, simulated data)
- Production: ~$10/month developer subscription
- Returns native Greeks in options chain (`greeks.delta`, `greeks.theta`, etc.) — no Black-Scholes needed
- REST API, well-documented, widely used

**Fallback / Dev zero-cost alternative: `yahoo-finance2` npm package**
- Unofficial but works reliably
- Returns chain with bid/ask + IV per contract; Greeks computed client-side via Black-Scholes
- Zero cost, good for local dev without Tradier key
- Risk: unofficial, can break on Yahoo changes

The server function abstracts the provider — swap by setting `TRADIER_SANDBOX=true` or using the yahoo-finance2 fallback path.

---

## Architecture

### New file: `api/market.js` (Vercel Serverless Function)

```
GET /api/market?ticker=NVDA
```

**Steps:**
1. Fetch stock quote via Tradier `GET /markets/quotes?symbols=NVDA`
2. Fetch options expirations via `GET /markets/options/expirations?symbol=NVDA`
3. Fetch chains for nearest 2-3 expiries via `GET /markets/options/chains?symbol=NVDA&expiration=YYYY-MM-DD&greeks=true`
4. Fetch 52-week daily history via `GET /markets/history?symbol=NVDA&interval=daily&start={52WeeksAgo}`
5. Compute IV rank: current IV percentile over the 52-week IV history
6. Return structured `{ quote, chains, ivRank, ivCurrent, fetchedAt }`

**Response shape:**
```json
{
  "ticker": "NVDA",
  "quote": { "last": 883.20, "bid": 882.90, "ask": 883.40, "changePercent": 2.3 },
  "ivRank": 34,
  "ivCurrent": 42,
  "chains": [
    {
      "expiry": "2025-06-20",
      "daysToExpiry": 38,
      "options": [
        {
          "type": "call", "strike": 880,
          "bid": 12.40, "ask": 12.60,
          "delta": 0.52, "theta": -0.15, "gamma": 0.018, "vega": 0.32, "iv": 0.42,
          "volume": 1234, "openInterest": 5678
        }
      ]
    }
  ],
  "fetchedAt": "2025-06-13T14:23:00Z"
}
```

**Caching:** In-memory Map keyed by `ticker:minute` — TTL 1 minute. Prevents hammering the API on rapid re-searches.

**Error handling:** If Tradier fails, return `{ error: "market_data_unavailable" }` — caller falls back to web search only.

---

### Updated `src/api.js`

**New function: `fetchMarketData(ticker)`**
```js
async function fetchMarketData(ticker) {
  const res = await fetch(`/api/market?ticker=${ticker}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.error ? null : data;
}
```

**Updated `fetchRecommendation`:**
1. Fire `fetchMarketData(ticker)` in parallel — doesn't block
2. Await result before Phase 1
3. Build `liveDataBlock` string and inject into Phase 1 user message
4. Pass chain data + Greeks through Phase 1 research JSON into Phase 2
5. Phase 2 calls use `useWebSearch: false`

**Live data injection format (prepended to Phase 1 user message):**
```
[LIVE MARKET DATA — fetched 14:23 ET]
Stock: NVDA @ $883.20 (+2.3%) | Bid: $882.90 | Ask: $883.40
IV: 42% | IV Rank: 34th percentile (52-week range: 28%–68%)

Options Chain:
Jun 20 2025 (38 DTE):
  880 call | bid: $12.40 | ask: $12.60 | Δ 0.52 | θ -0.15 | γ 0.018 | ν 0.32 | IV: 42%
  890 call | bid: $8.20  | ask: $8.40  | Δ 0.44 | θ -0.13 | γ 0.019 | ν 0.31 | IV: 43%
  870 put  | bid: $9.10  | ask: $9.30  | Δ -0.48| θ -0.14 | γ 0.018 | ν 0.32 | IV: 41%
  [~30 most liquid strikes across 2 expiries]
```

---

### Updated `src/prompts/research.js`

Add a new leading instruction block when live data is present:
> "LIVE DATA PRE-INJECTED: Stock price, IV rank, and options chain with Greeks are already provided. Do NOT search for price, IV, or options data. Your ONE search is for: (1) recent news and catalysts for [TICKER], (2) earnings date if not already known, (3) macro/sector context."

---

### Updated `src/prompts/strategy.js`

Remove the "ONE TARGETED SEARCH" section. Replace with:
> "Greeks, bid/ask, and IV are pre-loaded from the live options chain in the research data. Use those values directly — do not search."

Phase 2 calls set `useWebSearch: false`.

---

### New env vars

```
TRADIER_API_KEY=...          # Server-side only (never VITE_ prefix)
TRADIER_SANDBOX=true         # Set true in dev, false/unset in prod
```

Add to Vercel dashboard for preview and production.

---

## Data Flow (After Integration)

```
User submits ticker
        │
        ├─► GET /api/market?ticker=NVDA     ← ~500ms
        │         │
        │   { quote, chains, ivRank }
        │
        ▼
Phase 1 — web search for NEWS only    ← 5–15s (1 fast, targeted search)
        │
   research JSON (includes chain data + Greeks from market API)
        │
        ▼
Phase 2 — 3 parallel schema-fill calls, NO web search   ← 5–10s
        │
   3 complete trade cards
```

**New total latency: ~15–25s** (down from 45–85s today)

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `api/market.js` | **Create** — Tradier proxy, chain fetch, IV rank computation |
| `src/api.js` | Modify — add `fetchMarketData`, inject live data block, Phase 2 no web search |
| `src/prompts/research.js` | Modify — add live data injection instruction; narrow search to news/catalysts |
| `src/prompts/strategy.js` | Modify — remove targeted search; use chain data from research |
| `vercel.json` | Modify — add `api/market.js` function config (maxDuration: 10) |

---

## IV Rank — Special Case

Tradier returns daily OHLCV history but not IV history directly.

**Option A (launch):** Use current IV only; show "IV: 42% (rank unavailable)" until history builds.

**Option B (recommended, build over time):** Store current IV in Supabase `iv_history(ticker, date, iv)` each time `/api/market` is called. After 30+ days, compute rank from table. No user-facing change needed when switching.

Start with Option A, migrate to Option B as data accumulates.

---

## Graceful Degradation

If `fetchMarketData` returns null (Tradier down, rate-limited, key missing):
- Omit the live data block from the prompt
- Phase 1 search falls back to current broad query
- Phase 2 keeps `useWebSearch: true`
- Surface a subtle "Live data unavailable — using web search" badge on the trade card

App works in local dev without a Tradier key — same as today.

---

## Verification

1. Set `TRADIER_SANDBOX=true` + `TRADIER_API_KEY=<sandbox-key>` in `.env.local`
2. Search a ticker — Network tab should show `/api/market?ticker=NVDA` completing in <1s
3. Phase 1 SSE stream: 1 fast targeted search (news only)
4. Phase 2 SSE stream: no `tool_use` events (no web search)
5. TradeCard Greeks show real chain values
6. Remove `TRADIER_API_KEY` → app falls back gracefully to web search mode
7. `npm run build` — no errors
