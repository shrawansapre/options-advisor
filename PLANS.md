# Plans — Options Advisor

Future features by priority. Move items to STATUS.md when shipped.

---

## Real-Time Market Data — Tradier Integration

Replace Claude's web search for market data with a live Tradier API call before each analysis. Data is injected directly into the prompt so Claude analyses real numbers, not potentially stale search results.

**Provider:** Tradier (~$10/month). Paper-trading sandbox is free for development.

**What to fetch per search:**
- Current stock quote (last, bid, ask, change%)
- Options chain for the nearest 2–3 expiries (all strikes within ~20% of current price) — returns delta, theta, gamma, vega, IV, bid/ask per contract
- Historical daily close IV for the past 52 weeks → compute IV rank client-side: `(currentIV - low52) / (high52 - low52) * 100`

**Architecture:**
1. New Vercel function `api/market.js` — receives `{ ticker }`, calls Tradier, returns `{ quote, chains, ivRank }`. Keeps the Tradier API key server-side.
2. `src/api.js` — before calling Claude, fire `fetchMarketData(ticker)` and prepend the result to the user message as a structured block: `"[LIVE DATA as of HH:MM ET] Stock: $X.XX ...  Option chain: ..."`
3. System prompt update — add a note that live data is pre-injected; Claude should use it directly and skip web search for price/chain/greeks (still search for news, earnings, catalysts).

**Env vars needed:**
- `TRADIER_API_KEY` in Vercel (production + preview)
- `TRADIER_SANDBOX` = `true` during development (points to sandbox base URL)

**Fallback:** If Tradier call fails, fall back to current web-search behaviour and surface a subtle "Live data unavailable — using web search" indicator on the card.

**Cost:** ~$10/month Tradier + negligible Vercel function invocations.

---

## Phase 5 — Trade Feedback (ready to build)

Thumbs up/down + report button on each trade card. Supabase DB columns already exist (`feedback`, `reported` on `analyses` table). Just needs UI + write path.

---

## Daily Digest Email

Send one email per day with the single best options trade opportunity identified by the AI.

**Stack:** Vercel Cron → multi-agent pipeline → Resend email

**Pipeline:**
1. **Scanner** (Haiku) — web search for top setups; scores 1–10, filters to score ≥ 6
2. **Analyst** (Sonnet) — full analysis on the winning ticker (same as normal app flow)
3. **Critic** (Haiku) — reviews the analysis, scores confidence; rejects if < 6
4. **Writer** (Haiku) — formats HTML email from the JSON analysis

**Cost target:** ~$0.03/day (Haiku gates Sonnet; Sonnet only fires once)

**Infrastructure needed:**
- Resend account + API key (`RESEND_API_KEY` env var in Vercel)
- `CRON_SECRET` env var for endpoint auth
- `api/digest/run.js` — the pipeline endpoint
- Vercel cron schedule in `vercel.json`
- Supabase `digest_subscribers` table (or reuse `profiles.digest_enabled` column)
- SQL migration: add `digest_enabled boolean default false` to `profiles` table; add `digest_logs` table for run history

**User-facing toggle:** Settings or profile menu — "Daily digest email" on/off switch. Only for signed-in users.

**Email design:** Plain-ish HTML — ticker, strategy, conviction, entry/exit rules, disclaimer. Mobile-readable. No images.

---

## Trade Journal

Log trades entered manually with entry price, date, contracts. Track running P&L.

- localStorage-backed (no auth required for basic version)
- Show open trades with live gain/loss per contract
- Promote to Supabase for signed-in users

---

## Watchlist

Save tickers, re-scan all with one tap. Shows last analysis date per ticker. Supabase-backed for signed-in users.

---

## P&L Calculator

Given entry price + current option price → live gain/loss per contract. Could live inside each TradeCard as a quick calculator widget.

---

## Portfolio Greeks

Aggregate delta/theta/vega across all open positions from the trade journal. Single-screen "portfolio risk" view.

---

## Broker Support (Tastytrade / IBKR)

Swap Robinhood execution steps for broker-specific steps based on a selector. Eventually connect to broker APIs for live option chain data instead of web search.

---

## TypeScript Migration

Add types for the trade JSON schema and component props. Low priority until the codebase grows significantly.
