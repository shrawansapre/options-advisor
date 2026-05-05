# Plans — Options Advisor

Future features by priority. Move items to STATUS.md when shipped.

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
