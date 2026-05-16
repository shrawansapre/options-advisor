# Options Brief — Project Context

Use this document as background when helping with the Options Brief codebase.

---

## What it is

Options Brief is an AI-powered options analysis web app. The user types a stock ticker (or leaves it blank to scan the market) and the app:

1. Fetches live market data (price, IV, options chain) from marketdata.app
2. Calls the Anthropic API with live web search to research the ticker
3. Runs a second pass to generate 3 structured trade recommendations (conservative / moderate / aggressive JSON)
4. Renders each trade as a card with entry/exit rules, Greeks explanation, risk factors, scenario analysis, and step-by-step execution instructions

**This is educational analysis, not financial advice.** The disclaimer is non-negotiable and must appear on every analysis.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + Vite, no TypeScript |
| Styles | Vanilla CSS with custom design tokens — no Tailwind, no CSS-in-JS |
| Routing | `react-router-dom` v7 — two routes: `/` and `/learn` |
| Animations | `framer-motion` — AnimatePresence for tab/panel transitions |
| AI | Anthropic API (`claude-sonnet-4-6`) with `web_search_20250305` tool |
| API proxy | Cloudflare Worker (`worker/worker.js`) at `https://api.optionsbrief.workers.dev` |
| Market data | marketdata.app — stock quotes + options chains via `/market` endpoint on the Worker |
| Auth + DB | Supabase — Google OAuth + magic link; `analyses` table for history |
| State | `useState` only — no Redux, no Zustand |
| Hosting | Vercel (frontend only — live at https://options-advisor-sepia.vercel.app) |

---

## How the AI pipeline works

**Three-phase design:**

**Phase 0 — Market data** (`/market` on the Cloudflare Worker): Fetches live quote + options chain from marketdata.app and injects it as a structured `[LIVE DATA]` block into the Phase 1 prompt. Falls back gracefully if unavailable.

**Phase 1 — Research** (`src/prompts/research.js`): System prompt instructs the model to use `web_search` for news, catalysts, and macro context (NOT price/IV — that comes from live data). Output feeds into Phase 2.

**Phase 2 — Strategy** (`src/prompts/strategy.js`): 3 parallel calls (one per risk tier), each takes the Phase 1 research and produces a structured JSON trade matching a strict schema. `max_tokens` is 5000 per call; don't reduce without testing.

**Streaming + parsing** (`src/api.js`):
- `fetchRecommendation(ticker, onProgress)` orchestrates all phases
- Each phase streams SSE: tool_use (web search) → tool_result → final text (JSON)
- `accumulated` resets on each new text block start — don't break this
- JSON parsing has 4 repair attempts: raw → `jsonrepair` → `fixUnescapedQuotes` → control-char scrub

**API proxy** (`worker/worker.js`):
- `/analyze` — validates model allowlist + max_tokens, proxies to Anthropic, streams response back
- `/market` — fetches quote + options chain from marketdata.app, caches per ticker per minute
- Secrets (`ANTHROPIC_API_KEY`, `MARKET_DATA_TOKEN`) live in Cloudflare — never touch the client

---

## Project structure

```
options-advisor/
├── worker/
│   ├── wrangler.toml        # Cloudflare Worker config (name: api, subdomain: optionsbrief)
│   ├── worker.js            # /analyze + /market handlers + router
│   └── .dev.vars            # Local secrets for wrangler dev (gitignored)
├── src/
│   ├── main.jsx             # React root, BrowserRouter, AuthProvider
│   ├── App.jsx              # Layout, routing, tab state, analyze flow
│   ├── api.js               # fetchRecommendation(), JSON repair, risk ordering
│   ├── utils.js             # Shared helpers (parseBold, formatTradeAsMarkdown, etc.)
│   ├── hooks/
│   │   ├── useTheme.js      # dark/light toggle + localStorage
│   │   └── useAnalysisState.js  # tab open/close/update + makeAnalysis factory
│   ├── prompts/
│   │   ├── research.js      # Phase 1 — web search research prompt
│   │   └── strategy.js      # Phase 2 — trade JSON schema + prompt
│   ├── styles/
│   │   ├── tokens.css       # CSS variables, dark mode tokens, reset
│   │   ├── app.css          # Header, search, loading, tabs, landing
│   │   ├── trade-card.css   # Trade card, exit/greeks/scenarios, responsive
│   │   └── learn.css        # Learn page, diagrams, interactive components
│   ├── lib/
│   │   └── supabase.js      # Supabase client (exports null if env vars missing)
│   └── components/
│       ├── TradeCard/
│       │   ├── index.jsx    # Card shell, header, data block, snapshot div
│       │   ├── ShareMenu.jsx
│       │   ├── EntrySection.jsx
│       │   ├── ExitSection.jsx
│       │   ├── GreeksGrid.jsx
│       │   ├── ThesisRisk.jsx
│       │   ├── ScenariosSection.jsx
│       │   └── SignalsSection.jsx
│       ├── Learn/           # /learn route — 5 interactive sections
│       ├── AnalysisTabs.jsx # Top tab bar — max 6 open analyses
│       ├── SearchHistory.jsx # Recent analyses dropdown — localStorage + Supabase sync
│       ├── LoadingMessages.jsx # Stage-based streaming progress display
│       ├── IVGauge.jsx      # IV rank gauge (shared)
│       ├── TradeCharts.jsx  # Payoff diagram + theta decay chart
│       ├── AuthContext.jsx  # useAuth() + AuthProvider
│       ├── AuthModal.jsx    # Sign-in modal
│       └── ErrorBoundary.jsx
```

---

## Design system

- **Fonts:** `Plus Jakarta Sans` (body), `Fraunces` (display/italic), `IBM Plex Mono` (data/numbers)
- **Light mode:** `--navy: #1E3A5F`, `--bg: #F3F0E9` (warm off-white), `--surface: #FFFFFF`
- **Dark mode:** `[data-theme="dark"]` on `<html>` — `--navy` becomes orange-amber `#FF8C00`
- **Breakpoints:** `≤900px`, `≤600px`, `≤380px`
- **Philosophy:** Clean financial data in light mode, ambient/moody in dark mode. No generic SaaS look.

---

## Auth + data persistence

- `supabase.js` exports `null` when env vars are missing — auth silently degrades
- `user === undefined` → loading | `null` → guest | object → signed in
- Guest: localStorage (last 20 analyses). Signed-in: Supabase `analyses` table; localStorage migrates on first sign-in
- History is cached — clicking past analysis restores full JSON without re-fetching
- Sign-in nudge after 3 guest analyses

---

## Critical gotchas

1. **Streaming content blocks** — SSE stream has tool_use + tool_result before final text. `accumulated` resets on each new text block start. Don't change without understanding the full stream shape.
2. **Numeric fields are strings** — `ivRank`, `delta.value`, `entryPrice` etc. come back as `"34"` not `34`. Use `parseInt()`/`parseFloat()` before math.
3. **JSON has 4 repair passes** — if parse errors appear in prod, the model changed output format; add a repair step rather than loosening the prompt.
4. **System prompt is load-bearing** — every UI field maps to a prompt schema field. Rename a field in the prompt → grep the codebase for the old name first.
5. **`impactClass()` maps impact strings → CSS classes** — in `TradeCard/index.jsx`. New `impact` values in the prompt need a matching CSS class.
6. **API key never touches the client** — lives in Cloudflare Worker secrets only.

---

## Current state (as of May 2026)

- Full three-phase pipeline: live market data → web search research → 3 parallel trade strategies
- Multi-tab UI (max 6 open, independent loading states), dark/light mode
- Supabase auth + history sync, responsive design, Learn page with interactive diagrams
- Backend on Cloudflare Workers (free tier, no cold starts) — `api.optionsbrief.workers.dev`
- Phase 5 deferred: thumbs up/down + report on trade cards (DB columns already exist)

---

## Planned next (priority order)

1. **Ticker autocomplete** — as-you-type suggestions, keyboard nav
2. **Phase 5 trade feedback** — thumbs up/down + report UI; DB is ready
3. **Daily digest email** — Cron → multi-agent pipeline → Resend email, one trade/day for opted-in users
4. **Trade journal** — log entered trades, track P&L. localStorage-first, Supabase for signed-in users
5. **Watchlist** — save tickers, re-scan all at once

---

## Local dev

**Requires two terminals:**

```bash
# Terminal 1 — Cloudflare Worker (reads secrets from worker/.dev.vars)
npx wrangler dev --config worker/wrangler.toml

# Terminal 2 — Vite frontend
npm run dev   # http://localhost:3000
```

**`.env.local` vars needed:**
```
VITE_API_BASE=http://localhost:8787
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Auth (Google OAuth + magic link) requires Supabase credentials — app works without them, history stays local.
