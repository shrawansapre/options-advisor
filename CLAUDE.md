# CLAUDE.md — Options Advisor

## Session hygiene

- Read `STATUS.md` at the start of every session before touching code
- After every commit, add a one-line bullet to the "Recently Completed" section of `STATUS.md`
- Keep STATUS.md high-level — what shipped, not how

## Project overview

AI-powered options trade recommendation app for Robinhood users. Enter a ticker (or leave blank to scan the market), and the app calls the Anthropic API with live web search to generate comprehensive, actionable trade recommendations with exit strategies, Greek explanations, risk analysis, and step-by-step Robinhood execution instructions.

**This is NOT an automated trading bot.** It recommends trades. The user manually executes on Robinhood.

## Tech stack

- React 18 + Vite (no TypeScript yet — add if extending significantly)
- Anthropic API (`claude-sonnet-4-20250514`) with `web_search_20250305` tool
- Vanilla CSS with Apple HIG design tokens (no Tailwind, no CSS-in-JS)
- No state management library — useState is sufficient at current scale
- `react-router-dom` v7 — BrowserRouter in `main.jsx`; two routes: `/` (main app) and `/learn` (Learn page)

## Project structure

```
options-advisor/
├── index.html              # Entry point, minimal
├── package.json
├── vite.config.js
├── CLAUDE.md               # You are here
├── README.md
└── src/
    ├── main.jsx            # React root mount
    ├── App.jsx             # All components (SearchBar, TradeCard, 3 section components)
    ├── api.js              # SYSTEM_PROMPT constant + fetchRecommendation() function
    └── styles.css          # All styles, Apple HIG design tokens at top
```

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

## Architecture decisions

### API layer (`src/api.js`)

- `SYSTEM_PROMPT` is a long string that instructs the model to return a specific JSON schema. If you change the JSON shape, update the prompt AND the components that consume it.
- `fetchRecommendation(ticker)` handles the full API call flow: builds the user message, calls the Anthropic API with web_search enabled, extracts the last text block from the response, strips markdown fences, and parses JSON.
- The API key is handled by the claude.ai proxy — no key is passed in headers. For standalone deployment, you'll need to add an `x-api-key` header or route through a backend proxy. **Never expose the API key in client-side code for production.**
- `max_tokens` is set to 4000 because the JSON response is large and detailed.

### Component structure (`src/App.jsx`)

Everything is in one file right now for simplicity. The component tree:

```
App
├── header (sticky, frosted glass)
├── search bar (input + button)
├── loading state (spinner)
├── error state
└── results
    ├── market context banner
    └── TradeCard (one per trade)
        ├── trade header (ticker, strategy, stats row)
        ├── tab bar (Summary | Greek Insights | Full Analysis)
        ├── SummarySection
        │   ├── plain-English trade description + conviction badge
        │   ├── exit rules (profit target, stop loss, time stop)
        │   ├── earnings warning
        │   └── scenario predictions (bull/base/bear)
        ├── GreeksSection
        │   ├── IV rank gauge with cheap/expensive reading
        │   └── 4 Greek cards (Delta, Theta, Gamma, Vega) with intuitive insights
        └── AnalysisSection
            ├── detailed rationale
            ├── risk meter + risk factors
            ├── key dates with impact badges
            ├── bullish vs warning signals
            └── Robinhood execution steps
```

When the app grows, split into `src/components/` — each section becomes its own file. Keep the tab orchestration in TradeCard.

### Auth (`src/components/AuthContext.jsx`, `AuthModal.jsx`, `src/lib/supabase.js`)

- Supabase client in `supabase.js` — exports `null` if env vars missing (safe for local dev)
- `AuthProvider` exposes `{ user, signInWithGoogle, signInWithEmail, signOut }` via `useAuth()`
- `user === undefined` → loading | `null` → guest | object → signed in
- Both OAuth and magic link use `redirectTo: window.location.origin` — works in dev and prod automatically
- History is localStorage for guests; on first sign-in, localStorage is bulk-migrated to Supabase `analyses` table then cleared
- **Supabase dashboard config** — if OAuth redirects to localhost in production, the Site URL in Authentication → URL Configuration is still set to localhost. Fix: set Site URL to the Vercel URL and add both URLs to the Redirect allow-list.

### Styling (`src/styles.css`)

- Apple HIG design system: system font stack, SF blue (#007AFF), SF green (#34C759), SF red (#FF3B30), SF orange (#FF9500)
- CSS custom properties are defined at `:root` — use them everywhere
- Cards use `var(--gray6)` background with `var(--r-md)` radius
- The trade header stats row uses a 1px grid gap trick for hairline separators
- Tab bar mimics iOS segmented control (frosted active tab with shadow)
- Responsive breakpoint at 620px: stats row goes 2x2, scenarios stack, signals go single column
- No dark mode yet — the design tokens are set up for it but the values aren't defined

### JSON schema

The API returns this shape (defined in the system prompt in `api.js`):

```
{
  trades: [{
    ticker, strategy, strategyType ("bullish"|"bearish"|"neutral"),
    summary: { headline, plainEnglish, expectedOutcome, conviction, confidenceScore, whenToSellSimple },
    expiry, expiryLabel, daysToExpiry, strike, strike2, entryPrice, totalCost,
    maxProfit, maxLoss, breakeven, currentPrice, ivRank, impliedVolatility,
    greeks: {
      delta: { value, direction, insight },
      theta: { value, dailyCost, weeklyDrain, insight },
      gamma: { value, insight },
      vega: { value, insight },
      ivRankReading, ivRankInsight
    },
    exitStrategy: {
      profitTarget: { optionPrice, returnPct, stockPrice, rule },
      stopLoss: { optionPrice, lossPct, stockPrice, rule },
      timeStop: { date, daysBeforeExpiry, rule },
      earningsWarning
    },
    predictions: {
      bullCase: { stockTarget, optionReturn, probability, scenario },
      baseCase: { ... },
      bearCase: { ... }
    },
    watchFor: {
      bullishSignals: [],
      warningSignals: [],
      keyDates: [{ date, event, impact }]
    },
    rationale, riskLevel (1-5), riskFactors: [],
    robinhoodSteps: []
  }],
  marketContext, disclaimer
}
```

If a field is missing or malformed, the component should handle it gracefully (optional chaining, fallback values). Don't let one bad field crash the whole card.

## Code style

- Functional components with hooks only (no class components)
- Named exports for utility functions, default export for page-level components
- Destructure props inline: `function SummarySection({ trade })`
- CSS class names are kebab-case, BEM-ish but not strict BEM
- No inline styles except for truly dynamic values (colors based on data, positions from percentages)
- Keep event handlers simple — if logic exceeds 3 lines, extract a named function
- No `console.log` in committed code except inside catch blocks

## Important gotchas

1. **The API response includes tool_use blocks.** The model uses web_search before responding, so `data.content` contains multiple blocks. `fetchRecommendation` already handles this by grabbing the *last* text block. Don't break this.

2. **JSON parsing is fragile.** The model sometimes wraps JSON in markdown fences despite being told not to. The regex strip in `api.js` handles this. If you see parse errors, check for new wrapping patterns.

3. **The system prompt is load-bearing.** Every field in the UI maps to a field in the prompt's example JSON. If you rename a field in the prompt, grep the codebase for the old name.

4. **IV rank is a string.** It comes back as `"34"` not `34`. Parse with `parseInt()` before doing math. Same for `delta.value`, `entryPrice`, etc.

5. **impact class mapping.** The `impactClass()` helper in App.jsx converts impact strings like "Action Required" to CSS classes like `impact-action-required`. If you add new impact levels, update both the prompt AND this function.

6. **No API key in client code.** The current setup works through claude.ai's built-in proxy. For any deployment outside claude.ai, you MUST route API calls through your own backend to keep the key server-side.

## Testing strategy (when you add tests)

- Unit test `fetchRecommendation` with mocked fetch responses (valid JSON, fenced JSON, error responses, missing text blocks)
- Snapshot test each section component with a fixture trade object
- Test the `impactClass` helper with all known impact strings
- Test graceful degradation: render TradeCard with partial data (missing greeks, missing predictions, etc.)

## Planned features (by priority)

1. **Trade journal** — localStorage-backed log of trades entered, with fields for entry/exit price and date. Show running P&L.
2. **Watchlist** — save tickers and re-scan them with one tap.
3. **Dark mode** — the CSS variables are set up for it. Add a `@media (prefers-color-scheme: dark)` block or a manual toggle.
4. **P&L calculator** — given entry price and current option price, show live gain/loss per contract.
5. **Portfolio Greeks** — aggregate delta/theta/vega across all open positions from the trade journal.
6. **Component extraction** — split App.jsx into `components/TradeCard.jsx`, `components/SummarySection.jsx`, etc. when file exceeds ~400 lines.
7. **Tastytrade/IBKR support** — add a broker selector that changes the execution steps and (eventually) connects to broker APIs for live data.
8. **Backend proxy** — Express/Fastify server to hold the API key and proxy requests. Required for any public deployment.
9. **Error recovery** — retry logic with exponential backoff on API failures; show partial results if one trade in the array is malformed.
10. **TypeScript migration** — add types for the trade JSON schema and component props.

## Design principles

- **Apple HIG governs the visual layer.** System fonts, system colors, frosted glass header, segmented controls for tabs, generous whitespace, hairline separators. If it wouldn't look right on an iPhone, rethink it.
- **Intuitive over comprehensive.** The Summary tab should be readable by someone who's never traded options. Jargon lives in Full Analysis.
- **Greek insights are NOT textbook definitions.** Each insight should say what the Greek means *for this specific trade in dollar terms*. "Your option loses $8 per day" not "theta measures time decay."
- **Exit strategy is the most important section.** Most people know when to enter a trade. Nobody knows when to exit. The three exit rules (profit, stop, time) should be crystal clear and actionable.
- **Disclaimer is non-negotiable.** Every response includes it. This is educational, not financial advice. Never remove the disclaimer.
