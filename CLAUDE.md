# CLAUDE.md — Options Advisor

## Session hygiene

- Read `STATUS.md` at the start of every session before touching code
- After every commit, add a one-line bullet to the "Recently Completed" section of `STATUS.md`
- Keep STATUS.md high-level — what shipped, not how
- Future feature planning lives in `PLANS.md`

## Project overview

AI-powered options analysis app. Enter a ticker (or leave blank to scan the market) and the app calls the Anthropic API with live web search to generate comprehensive, actionable trade analysis with exit strategies, Greek explanations, risk analysis, and step-by-step Robinhood execution instructions.

**This is NOT financial advice and NOT an automated trading bot.** It generates educational analysis. The user manually executes on Robinhood. The disclaimer is non-negotiable — never remove it.

## Tech stack

- React 18 + Vite (no TypeScript)
- Anthropic API (`claude-sonnet-4-6`) with `web_search_20250305` tool — proxied through `api/analyze.js` (Vercel Edge Function)
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
├── api/
│   └── analyze.js           # Vercel Edge Function — proxies Anthropic API, validates model + max_tokens
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
├── public/
│   ├── og.png               # Open Graph image
│   └── og.svg
└── src/
    ├── main.jsx             # React root, BrowserRouter, AuthProvider
    ├── App.jsx              # Layout, routing, tab state, analyze flow
    ├── api.js               # fetchRecommendation(), JSON repair, risk ordering
    ├── utils.js             # Shared helpers (parseBold, formatTradeAsMarkdown, etc.)
    ├── hooks/
    │   ├── useTheme.js      # dark/light toggle + localStorage persistence
    │   └── useAnalysisState.js  # tab open/close/update + makeAnalysis factory
    ├── prompts/
    │   ├── research.js      # RESEARCH_SYSTEM_PROMPT (Phase 1 — web search)
    │   └── strategy.js      # STRATEGY_SYSTEM_PROMPT (Phase 2 — trade schema)
    ├── styles/
    │   ├── tokens.css       # CSS variables, dark mode tokens, reset
    │   ├── app.css          # Header, search, loading, tabs, landing
    │   ├── trade-card.css   # Trade card, exit/greeks/scenarios, responsive
    │   └── learn.css        # Learn page, diagrams, interactive components
    ├── lib/
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

## Architecture decisions

### API layer (`src/api.js` + `api/analyze.js`)

- System prompts live in `src/prompts/research.js` (Phase 1 research) and `src/prompts/strategy.js` (Phase 2 trade schema). If you change the JSON shape, update the prompt AND the components that consume it.
- `fetchRecommendation(ticker, onProgress)` streams the response, extracts readable strings for live progress updates, then parses the final JSON with up to 4 repair attempts (`jsonrepair` + `fixUnescapedQuotes`).
- `api/analyze.js` is the Vercel Edge Function proxy — it validates `model` against an allowlist and enforces `max_tokens ≤ 8000` before forwarding to Anthropic. The API key never touches the client.
- `max_tokens` is 8000 — the JSON response is large. Don't reduce without testing.

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

1. **Streaming response has multiple content blocks.** The model runs web_search before writing JSON, so the SSE stream contains tool_use blocks followed by the final text block. `fetchRecommendation` resets `accumulated` on each new text block start — don't break this.

2. **JSON parsing has 4 repair attempts.** `jsonrepair` + `fixUnescapedQuotes` + scrubbing control chars. If you see parse errors in prod, the model likely output something new — add a repair step rather than loosening the prompt.

3. **The system prompt is load-bearing.** Every field in the UI maps to a field in the prompt schema. If you rename a field in the prompt, grep the codebase for the old name first.

4. **IV rank and most numeric fields are strings.** They come back as `"34"` not `34`. Use `parseInt()` / `parseFloat()` before math. Same for `delta.value`, `entryPrice`, etc.

5. **`impactClass()` maps impact strings to CSS classes.** Lives in `TradeCard.jsx`. If you add new `impact` values to the prompt, update this function and add the corresponding CSS class.

6. **API key stays server-side.** `api/analyze.js` holds the key. The Vercel Edge Function validates the request before forwarding. Never add the key to client-side code.

7. **Supabase env vars are optional.** `src/lib/supabase.js` exports `null` when `VITE_SUPABASE_URL` is missing — auth features silently degrade. Safe for local dev without Supabase credentials.

## Testing strategy (when you add tests)

- Unit test `fetchRecommendation` with mocked SSE streams (valid JSON, fenced JSON, truncated, error responses)
- Snapshot test each section component with a fixture trade object
- Test `impactClass()` with all known impact strings
- Test graceful degradation: render TradeCard with partial data (missing greeks, missing predictions)
