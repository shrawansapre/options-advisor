# CLAUDE.md — Options Brief

## Session hygiene

- Read `STATUS.md` at the start of every session before touching code
- After every commit, add a one-line bullet to the "Recently Completed" section of `STATUS.md`
- Keep STATUS.md high-level — what shipped, not how
- Future feature planning lives in `PLANS.md`
- After a major decision is **pushed** (not just decided), add it to `docs/DECISIONS.md` — what, why, constraints, files. Do not add speculative or in-progress decisions.

## Project overview

AI-powered options analysis app. A multi-agent pipeline runs on each request: live market data is fetched first, then a Researcher agent (Haiku + web search) gathers context, three Strategist agents (Sonnet) build conservative/moderate/aggressive trades in parallel, and a Critic agent (Haiku) validates each trade against the live option chain — retrying any failing tier up to twice with structured critique feedback.

**This is NOT financial advice and NOT an automated trading bot.** It generates educational analysis. The user manually executes. The disclaimer is non-negotiable — never remove it.

## Tech stack

- React 18 + Vite (no TypeScript)
- Anthropic API — `claude-sonnet-4-6` (Strategist) + `claude-haiku-4-5-20251001` (Researcher + Critic) — proxied through Cloudflare Worker (`worker/worker.js`) at `https://api.optionsbrief.workers.dev`
- marketdata.app — live stock quotes + option chains (fetched by Worker `/market` endpoint before each analysis)
- Supabase — auth (Google OAuth + magic link) + `analyses` table for history sync
- Vanilla CSS with custom design tokens (no Tailwind, no CSS-in-JS)
- No state management library — useState is sufficient
- `react-router-dom` v7 — two routes: `/` (main app) and `/learn` (Learn page)
- `framer-motion` for AnimatePresence transitions

## Project structure

```
options-advisor/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json              # SPA rewrite rule; no cron config
├── CLAUDE.md                # You are here
├── STATUS.md                # What shipped recently + known issues
├── PLANS.md                 # Future feature roadmap
├── README.md
├── worker/
│   ├── wrangler.toml        # Cloudflare Worker config (name: api, subdomain: optionsbrief.workers.dev)
│   ├── worker.js            # Single Worker entry — /analyze (Anthropic proxy) + /market (marketdata.app)
│   └── .dev.vars            # Local secrets for wrangler dev (gitignored)
├── docs/
│   └── DECISIONS.md         # Major architectural decisions (gitignored — local only)
├── public/
│   ├── og.png               # Open Graph image
│   └── og.svg
└── src/
    ├── main.jsx             # React root, BrowserRouter, AuthProvider
    ├── App.jsx              # Layout, routing, tab state, analyze flow
    ├── api.js               # Thin wrapper — calls orchestrate() and re-exports result
    ├── orchestrator.js      # Pipeline DAG: fetches market data, runs agents, returns trades
    ├── utils.js             # Shared helpers (parseBold, formatTradeAsMarkdown, etc.)
    ├── agents/
    │   ├── researcher.js    # Haiku + web search — gathers market context + strategy direction
    │   ├── strategist.js    # Sonnet — builds one trade (conservative/moderate/aggressive)
    │   └── critic.js        # Haiku — validates trades against live chain; returns pass/fail + concerns
    ├── hooks/
    │   ├── useTheme.js      # dark/light toggle + localStorage persistence
    │   └── useAnalysisState.js  # tab open/close/update + makeAnalysis factory
    ├── prompts/
    │   ├── research.js      # RESEARCH_SYSTEM_PROMPT (+ _LIVE variant when chain data available)
    │   ├── strategy.js      # STRATEGY_SYSTEM_PROMPT (+ _LIVE variant) — full trade schema
    │   └── critic.js        # CRITIC_SYSTEM_PROMPT — 8 validation checks, returns JSON verdict
    ├── styles/
    │   ├── tokens.css       # CSS variables, dark mode tokens, reset
    │   ├── app.css          # Header, search, loading, tabs, landing
    │   ├── trade-card.css   # Trade card, exit/greeks/scenarios, responsive
    │   └── learn.css        # Learn page, diagrams, interactive components
    ├── lib/
    │   ├── claude.js        # callAPI() — HTTP primitive used by all agents (avoids circular imports)
    │   └── supabase.js      # Supabase client (exports null if env vars missing)
    └── components/
        ├── TradeCard/
        │   ├── index.jsx    # Card shell, header, data block, snapshot div
        │   ├── ShareMenu.jsx
        │   ├── EntrySection.jsx
        │   ├── ExitSection.jsx
        │   ├── GreeksGrid.jsx
        │   ├── ThesisRisk.jsx
        │   ├── ScenariosSection.jsx
        │   └── SignalsSection.jsx
        ├── Learn/
        │   ├── index.jsx    # Nav shell, AnimatePresence switcher
        │   ├── IntroSection.jsx
        │   ├── BasicsSection.jsx
        │   ├── GreeksSection.jsx
        │   ├── IVSection.jsx
        │   └── StrategiesSection.jsx
        ├── AnalysisTabs.jsx # Top tab bar for switching between open analyses
        ├── SearchHistory.jsx # Recent searches row + localStorage/Supabase sync
        ├── LoadingMessages.jsx # Streaming progress display during analysis
        ├── IVGauge.jsx      # IV rank gauge component (shared)
        ├── TradeCharts.jsx  # Payoff diagram charts
        ├── AuthContext.jsx  # useAuth() hook + AuthProvider
        ├── AuthModal.jsx    # Sign-in modal (Google OAuth + magic link)
        └── ErrorBoundary.jsx
```

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

**Local dev requires two terminals** — the Vite frontend and the Cloudflare Worker backend must both run:

```bash
# Terminal 1 — Worker backend (reads secrets from worker/.dev.vars)
npx wrangler dev --config worker/wrangler.toml

# Terminal 2 — Vite frontend (VITE_API_BASE=http://localhost:8787 in .env.local)
npm run dev
```

## Architecture decisions

### Agent pipeline (`src/orchestrator.js` + `src/agents/` + `src/lib/claude.js`)

The pipeline runs every time a user submits a ticker:

```
  User submits ticker
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  fetchMarketData()                                      │
│  Worker /market → marketdata.app  (9s timeout)         │
│  quote + option chain (3 expiries, ±5 strikes)         │
└──────────────┬──────────────────────────────────────────┘
               │ hasLiveData (falls back gracefully if unavailable)
               ▼
┌─────────────────────────────────────────────────────────┐
│  Researcher  (claude-haiku-4-5-20251001)                │
│  web_search · 4000 tokens · 120s                        │
│  → ticker, thesis, marketContext, strategy direction    │
└──────────────┬──────────────────────────────────────────┘
               │ researchJSON
               ▼
    ┌──────────┬──────────┬──────────┐
    │          │          │          │   parallel
    ▼          ▼          ▼          │
conservative  moderate  aggressive   │  Strategist × 3
    │          │          │          │  (claude-sonnet-4-6)
    │          │          │          │  5000 tokens · 120s
    └──────────┴──────────┘          │  each returns one trade
               │ trades[3] ──────────┘
               │
               ▼
       enforceRiskOrdering()
       sort by maxLoss → assign tiers + riskLevel
               │
               │ (skip if no live data)
               ▼
┌─────────────────────────────────────────────────────────┐
│  Critic  (claude-haiku-4-5-20251001)                    │
│  no web_search · 1500 tokens · 30s                     │
│  8 checks: strike exists, price in bid/ask, delta,     │
│  spread, timeline, risk ordering, cross-thesis, IV     │
│  → { trades: [{ riskTier, pass, concerns[] }] }        │
└──────────────┬──────────────────────────────────────────┘
               │ for each failing tier (max 2 retries)
               ▼
┌─────────────────────────────────────────────────────────┐
│  Strategist retry  (claude-sonnet-4-6)                 │
│  same as above + critic.concerns injected into prompt  │
│  replaces failing trade in currentTrades[]             │
└──────────────┬──────────────────────────────────────────┘
               │ Critic fail → ship uncritiqued (swallowed)
               ▼
         { trades, marketContext, disclaimer,
           hasLiveData, marketSessionLabel }
```

Key design points:
- `src/lib/claude.js` holds `callAPI()` — the only file that talks to the Worker. Agents import from `lib/`, never from `api.js`, to avoid circular imports.
- `callAPI` timeout is 120s (Cloudflare Workers has no request ceiling). Critic uses 30s.
- Critic failure (timeout or malformed response) is caught and swallowed — trades ship uncritiqued rather than erroring.
- `worker/worker.js` validates `model` against an allowlist (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) and enforces `max_tokens ≤ 16000`. API key never touches the client.
- System prompts have `_LIVE` variants (`RESEARCH_SYSTEM_PROMPT_LIVE`, `STRATEGY_SYSTEM_PROMPT_LIVE`) used when live chain data is available — they instruct the model to use pre-loaded Greeks rather than searching.
- If you change the trade JSON shape, update the strategy prompt AND grep every component that reads those fields.

### Component structure

```
App
├── landing-hero (tagline — only when no analyses open)
├── search-wrap (input + hint + SearchHistory)
├── signin-nudge (after 3 guest analyses)
├── AnalysisTabs (tab bar across open analyses)
└── AnimatePresence
    ├── landing (empty state — chips + scan CTA)
    ├── LoadingMessages (streaming progress)
    ├── error-bar
    └── done state
        ├── market-banner
        └── TradeCard (one per analysis)
            ├── trade header (ticker, strategy, stats row)
            ├── tab bar (Summary | Greek Insights | Full Analysis)
            ├── SummarySection
            ├── GreeksSection (IVGauge + 4 Greek cards)
            └── AnalysisSection
```

### Auth (`src/components/AuthContext.jsx`, `AuthModal.jsx`, `src/lib/supabase.js`)

- Supabase client in `supabase.js` — exports `null` if env vars missing (safe for local dev without Supabase)
- `AuthProvider` exposes `{ user, signInWithGoogle, signInWithEmail, signOut }` via `useAuth()`
- `user === undefined` → loading | `null` → guest | object → signed in
- Both OAuth and magic link use `redirectTo: window.location.origin` — works in dev and prod
- History is localStorage for guests; on first sign-in, localStorage is bulk-migrated to Supabase `analyses` table then cleared
- **Supabase dashboard config** — Site URL in Authentication → URL Configuration must match the Vercel deployment URL. Add both localhost and prod URL to the Redirect allow-list.

### Styling (`src/styles/`)

- Design tokens at `:root`: `--navy #1E3A5F`, `--bg #F3F0E9` (warm off-white), `--surface #FFFFFF`, `--t1/t2/t3` for text hierarchy
- Fonts: `Plus Jakarta Sans` (body), `Fraunces` (serif/italic display), `IBM Plex Mono` (mono/data)
- Dark mode: implemented via `[data-theme="dark"]` — near-black base with orange-amber accent (`--navy: #FF8C00` in dark)
- Responsive breakpoints: `≤900px`, `≤600px`, `≤380px`
- Tab bar mimics iOS segmented control; active state has explicit `:hover` overrides to win specificity battles

### JSON schema

See `src/prompts/strategy.js` for the full response schema (trades array shape, all fields and types). If a field is missing or malformed, handle it gracefully with optional chaining and fallbacks. Don't let one bad field crash the card.

## Code style

- Functional components with hooks only
- Named exports for utility functions, default export for page-level components
- Destructure props inline: `function SummarySection({ trade })`
- CSS class names are kebab-case, BEM-ish
- No inline styles except for truly dynamic values (colors from data, positions from percentages)
- No `console.log` in committed code except inside catch blocks

## Important gotchas

1. **Streaming response has multiple content blocks.** When web_search is enabled the SSE stream contains `tool_use` blocks followed by the final text block. `callAPI` in `src/lib/claude.js` resets `accumulated` on each new text content block start — don't break this. Strategist calls that have live data skip web search entirely (`useWebSearch: false`).

2. **JSON parsing has 4 repair attempts.** `jsonrepair` + `fixUnescapedQuotes` + scrubbing control chars. If you see parse errors in prod, the model likely output something new — add a repair step rather than loosening the prompt.

3. **The system prompt is load-bearing.** Every field in the UI maps to a field in the prompt schema. If you rename a field in the prompt, grep the codebase for the old name first.

4. **IV rank and most numeric fields are strings.** They come back as `"34"` not `34`. Use `parseInt()` / `parseFloat()` before math. Same for `delta.value`, `entryPrice`, etc.

5. **`impactClass()` maps impact strings to CSS classes.** Lives in `TradeCard.jsx`. If you add new `impact` values to the prompt, update this function and add the corresponding CSS class.

6. **API key stays server-side.** `worker/worker.js` holds the key in Cloudflare Worker secrets (`env.ANTHROPIC_API_KEY`). Never add it to client-side code. Deploy worker changes with `npx wrangler deploy --config worker/wrangler.toml` — pushing to git does NOT auto-deploy the worker.

7. **Supabase env vars are optional.** `src/lib/supabase.js` exports `null` when `VITE_SUPABASE_URL` is missing — auth features silently degrade. Safe for local dev without Supabase credentials.

## Testing strategy (when you add tests)

- Unit test `fetchRecommendation` with mocked SSE streams (valid JSON, fenced JSON, truncated, error responses)
- Snapshot test each section component with a fixture trade object
- Test `impactClass()` with all known impact strings
- Test graceful degradation: render TradeCard with partial data (missing greeks, missing predictions)
