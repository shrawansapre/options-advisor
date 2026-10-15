# AGENTS.md - Options Brief

## Session hygiene

- Read `STATUS.md` at the start of every session before touching code.
- After every commit, add a one-line bullet to the "Recently Completed" section of `STATUS.md`.
- Keep `STATUS.md` high-level: what shipped, not how.
- Future feature planning lives in `PLANS.md`.
- After a major decision is pushed, add it to `docs/DECISIONS.md` with what, why, constraints, and files. Do not add speculative or in-progress decisions.

## Project overview

Options Brief is an AI-powered options analysis app. It provides educational analysis only; it is not financial advice and not an automated trading bot. The user manually executes any trade ideas. The disclaimer is non-negotiable and must not be removed.

Current user-facing surfaces:

- `/` - ticker analysis workflow with three risk-tiered trade ideas.
- `/scanner` - unusual options scanner for one ticker.
- `/discover` - market-wide unusual-activity leaderboard and Analyze handoff.
- `/learn` - interactive options education.

## Tech stack

- React 18 + Vite, no TypeScript.
- Mantine v8 components plus vanilla CSS files for product-specific styling.
- `react-router-dom` v7.
- `framer-motion` for AnimatePresence transitions.
- Anthropic API via Cloudflare Worker at `https://api.optionsbrief.workers.dev`.
- marketdata.app via Worker `/market`.
- Cloudflare KV for market/discover/analysis caching when bound.
- Supabase auth and `analyses` history sync. Supabase env vars are optional locally.
- Vitest for pure utility coverage.

## Commands

```bash
npm install
npm test
npm run build
npm run dev
npm run preview
```

Local dev needs two terminals:

```bash
# Terminal 1 - Worker backend, reads worker/.dev.vars
npx wrangler dev --config worker/wrangler.toml

# Terminal 2 - Vite frontend
npm run dev
```

Use `.env.local` for frontend config:

```bash
VITE_API_BASE=http://localhost:8787
VITE_INTERNAL_TOKEN=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Current architecture

The analysis pipeline is orchestrated in `src/orchestrator.js`:

```text
User ticker
  -> fetchMarketData() via Worker /market
  -> Researcher agent
  -> Strategist x3 in parallel
  -> Critic validation and targeted retries
  -> { trades, marketContext, disclaimer, live-data metadata }
```

Key files:

- `src/lib/claude.js` - `callAPI()` HTTP/SSE primitive and JSON repair helpers.
- `src/orchestrator.js` - pipeline DAG, risk-tier calls, retry loop, live-data plumbing.
- `src/agents/researcher.js` - research call.
- `src/agents/strategist.js` - per-tier trade construction.
- `src/agents/critic.js` - live-chain validation.
- `src/prompts/*.js` - load-bearing schemas and instructions.
- `worker/worker.js` - `/analyze`, `/market`, `/discover`, and `/analysis-cache`.

If the trade JSON shape changes, update the prompt schema and grep every component that reads the changed fields.

## Project structure

```text
options-advisor/
├── worker/
│   ├── wrangler.toml
│   └── worker.js
├── docs/
│   ├── CONTEXT.md
│   ├── COST_ANALYSIS.md
│   ├── DECISIONS.md
│   └── superpowers/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── api.js
│   ├── orchestrator.js
│   ├── utils.jsx
│   ├── agents/
│   ├── components/
│   │   ├── Discover/
│   │   ├── Learn/
│   │   ├── Scanner/
│   │   └── TradeCard/
│   ├── hooks/
│   ├── lib/
│   ├── prompts/
│   ├── styles/
│   └── utils/
├── STATUS.md
├── PLANS.md
└── README.md
```

## Styling notes

- Mantine provides core components and color-scheme plumbing.
- Product styling lives in `src/styles/app.css`, `discover.css`, `scanner.css`, `trade-card.css`, and `learn.css`.
- Theme tokens live in `src/theme.js` and CSS custom properties in `app.css`.
- Keep CSS class names kebab-case and BEM-ish.
- Avoid inline styles except truly dynamic values.
- Check mobile breakpoints when touching dense financial tables/cards.

## Important gotchas

1. `callAPI()` handles streaming responses with multiple content blocks. Web search produces tool blocks before final text; do not break text-block accumulation.
2. JSON repair is intentionally defensive. Add narrow repair steps when prod parse failures appear.
3. IV rank and many numeric fields arrive as strings. Parse before math.
4. API keys stay server-side in Cloudflare Worker secrets. Never add them to client code.
5. `worker/wrangler.toml` has production top-level config and isolated `[env.staging]` config. Staging placeholders must be filled account-side before end-to-end Discover testing.
6. `VITE_INTERNAL_TOKEN` protects browser-to-Worker calls when `INTERNAL_TOKEN` is configured. Keep staging and production tokens distinct.
7. Supabase is optional in local dev; auth should degrade gracefully when env vars are missing.

## Testing guidance

- Run `npm test` for pure logic changes.
- Run `npm run build` before handing off branch-level work.
- For UI changes, use the local Vite server and verify desktop plus mobile layouts.
- For Worker changes, test with `npx wrangler dev --config worker/wrangler.toml`.
- Discover end-to-end testing currently requires staging KV, staging secrets, Vercel Preview env vars, and preview CORS setup.
