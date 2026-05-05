# Options Advisor

AI-powered options analysis for independent traders. Enter a ticker (or leave blank to scan the market) and get comprehensive, actionable analysis with verified Greeks, exit strategies, risk assessment, and step-by-step Robinhood execution instructions — powered by Claude with live web search.

Live at **[options-advisor-sepia.vercel.app](https://options-advisor-sepia.vercel.app)**

---

## What it does

- **Ticker analysis** — current price, IV rank, technicals, upcoming catalysts, and a specific options trade with full rationale
- **Verified Greeks** — delta, theta, gamma, vega pulled from real option chains via web search, not estimated
- **Exit strategy** — explicit profit target, stop loss, and time stop rules for every trade
- **Market scan** — leave the ticker blank to find the best opportunity across the market today
- **Learn page** — interactive options education with live payoff diagrams, IV gauge, and strategy explainers
- **History sync** — analyses saved locally for guests; synced across devices when signed in

---

## Quick start (local dev)

```bash
npm install
npm run dev            # http://localhost:3000
```

The app uses a Vercel Edge Function (`api/analyze.js`) as a proxy to Anthropic — the API key never touches the client. For local dev without deploying to Vercel, set:

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

in a `.env` file. This bypasses the proxy and calls Anthropic directly from the browser (dev only — never do this in production).

For auth (Google OAuth + magic link), also set:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Auth is optional — the app works fully without it, history just stays local.

---

## Deploying to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Set environment variables: `ANTHROPIC_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full walkthrough including Supabase config.

---

## Docs

| Document | What's in it |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Architecture, gotchas, code style — for AI-assisted development |
| [PLANS.md](PLANS.md) | Future feature roadmap |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the app works end-to-end |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Supabase deployment guide |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | File map, commands, how to extend |

---

## Disclaimer

All analysis is AI-generated for **educational and informational purposes only**. It does not constitute financial advice, a solicitation, or a recommendation to buy or sell any security. Options trading involves substantial risk of loss and is not suitable for all investors. Always do your own research and consult a qualified financial advisor before trading.
