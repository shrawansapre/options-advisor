# Options Brief

AI-powered options analysis for independent traders. Enter a ticker (or leave blank to scan the market) and get comprehensive, actionable analysis with verified Greeks, exit strategies, risk assessment, and step-by-step execution instructions — powered by a multi-agent Claude pipeline with live market data.

Live at **[options-advisor-sepia.vercel.app](https://options-advisor-sepia.vercel.app)**

---

## What it does

- **Ticker analysis** — live price, IV rank, technicals, upcoming catalysts, and three risk-tiered options trades with full rationale
- **Live market data** — real option chains (strikes, bid/ask, Greeks, IV) fetched before each analysis via marketdata.app
- **Verified Greeks** — delta, theta, gamma, vega from the live chain, not estimated
- **Exit strategy** — explicit profit target, stop loss, and time stop rules for every trade
- **Multi-agent pipeline** — Researcher (Haiku) gathers data → three Strategists (Sonnet) build conservative/moderate/aggressive trades in parallel → Critic (Haiku) validates against live chain and triggers retries if needed
- **Market scan** — leave the ticker blank to find the best opportunity across the market today
- **Learn page** — interactive options education with live payoff diagrams, IV gauge, and strategy explainers
- **History sync** — analyses saved locally for guests; synced across devices when signed in

---

## Quick start (local dev)

Local dev requires two terminals — the Vite frontend and the Cloudflare Worker backend must both run:

```bash
# Terminal 1 — Worker backend (reads secrets from worker/.dev.vars)
npx wrangler dev --config worker/wrangler.toml

# Terminal 2 — Vite frontend
npm install
npm run dev            # http://localhost:3000
```

Create `.env.local` with:

```
VITE_API_BASE=http://localhost:8787
```

For auth (Google OAuth + magic link), also add:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Create `worker/.dev.vars` with:

```
ANTHROPIC_API_KEY=sk-ant-...
MARKET_DATA_TOKEN=...
```

Auth is optional — the app works fully without it, history just stays local. Market data falls back to web search if `MARKET_DATA_TOKEN` is missing.

---

## Deploying

**Frontend (Vercel):** push to GitHub → import in Vercel → set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE=https://api.optionsbrief.workers.dev`.

**Worker (Cloudflare):**

```bash
npx wrangler deploy --config worker/wrangler.toml
```

Set worker secrets via Cloudflare dashboard: `ANTHROPIC_API_KEY`, `MARKET_DATA_TOKEN`.

---

## Docs

| Document | What's in it |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Architecture, agent pipeline, gotchas, code style — for AI-assisted development |
| [PLANS.md](PLANS.md) | Future feature roadmap |

---

## Disclaimer

All analysis is AI-generated for **educational and informational purposes only**. It does not constitute financial advice, a solicitation, or a recommendation to buy or sell any security. Options trading involves substantial risk of loss and is not suitable for all investors. Always do your own research and consult a qualified financial advisor before trading.
