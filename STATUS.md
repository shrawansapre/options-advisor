# Status

## Recently Completed

- **Whole-codebase simplify** — added `STRATEGY_LABEL` + `formatStrike` to `utils.jsx`; fixed live `ReferenceError` (missing `TIER_LABEL` import in `DesktopComparisonTable`); replaced inline delta formatting in `TradeCard` with `formatDelta()`; replaced 3-deep `strategyType` ternary in all 3 snapshot divs with `STRATEGY_LABEL[]`; replaced duplicated `isSpread`/`strikeDisplay` logic in 3 components with `formatStrike()`; extracted `useOutsideClick` hook (`src/hooks/`) — used by `ShareMenu` + `SearchHistory`; removed dead `useEffect` in `ChecklistSection` (duplicated `useState` initializer); `claude.js`: `scrubbed` thunk → const (was evaluated twice); `extractReadableStrings` scan now skipped when `onProgress` is null (eliminates O(n²) work on Strategist/Critic SSE streams)

- **Abort signal listener cleanup** — `fetchMarketData` restructured with `finally` block (`clearTimeout` + `removeEventListener` now guaranteed); both `callAPI` and `fetchMarketData` capture `onInternalAbort` handler on `controller.signal` to release `combined` AbortController immediately on completion (not after timeout); `callAPI` wrapped in single outer `try/finally` (cleanup in one place instead of 3); `__BACKGROUNDED__` sentinel removed — AbortError propagated directly, `App.jsx` reads `signal.aborted`; `MobileComparisonView` fallback `"Aggressive"` → `"Moderate"`

- **Mobile backgrounding abort** — `freeze` event (Page Lifecycle API) aborts in-flight analysis when the OS suspends the browser (mobile backgrounding, screen lock); AbortSignal threaded through full pipeline (`App` → `api.js` → `orchestrate` → `fetchMarketData` + all agents → `callAPI`); shows "Analysis interrupted — tap to retry" instead of malformed card or hung spinner; desktop tab switches unaffected (`freeze` only fires on OS-level suspension)

- **Stale options chain fix** — after a large intraday move (e.g. earnings gap), `delta=.05-.95` values are stale so all returned strikes can be far from current price; worker now detects this (no strike within 10% of current price) and retries chain fetch with `strike=${85%}–${115%}` anchored to real quote; retry capped at 4s via `AbortSignal.timeout`

- **Mobile auth zoom fix** — `.modal-email-input` font-size `13px` → `16px`; iOS Safari auto-zooms inputs below 16px, causing full-screen zoom when the sign-in modal appears

- **Mantine v8 migration** — replaced ~3,600 lines of vanilla CSS with Mantine components (Tabs, Modal, Accordion, Alert); `tokens.css` deleted, tokens consolidated into `src/theme.js` + `app.css`; dark mode migrated to `useMantineColorScheme()`; UI audit fixes: dark mode button/card contrast, modal layout shift, checklist arrow, a11y props, focus rings, touch targets, share/download wired up in all three views (TradeCard, MobileComparisonView, DesktopComparisonTable); sign-out resets app state

- **Mobile strategy switcher** — replaced cramped comparison matrix with a 3-column card bar; full tier names (Conservative / Moderate / Aggressive), strategy name, max profit/max loss per column; tier-tinted active state (green/amber/red-light) with 3px bottom border indicator; tap feedback on `:active`; old `.mtv-matrix-*` CSS removed

- **Option chain expansion** — tiered expiry selection: 2 near (7–45d) + 2 mid (45–120d) + 2 far (120–365d); `strikeLimit` 5→10; `delta=.05-.95` filter; fetch uses `from`/`to` range (comma-separated expiration param was broken); `buildLiveDataBlock()` updated with compact per-contract format and expiry summary header; cost analysis documented at `docs/COST_ANALYSIS.md` (~$0.20/analysis typical)

- **Desktop comparison table polish** — shared IV ENV row spans all 3 strategy columns (`grid-column: 2 / -1`); `IVGauge` restored (semicircle recharts, `hideIV` prop added to GreeksGrid so IV doesn't repeat per-column); Greek symbols added (Δ Θ ν Γ); bull/bear/base scenario arrows (↑ → ↓); chart title `.card-label` styled; double-padding in DETAILS row fixed; checklist border-top removed inside `.dct-cell` context

- **Checklist toggle layout** — toggle button is now two-row: title + dot on row 1, score summary on row 2; score format changed to `X/N passed · Y failed` for clarity

- **TradeCard terminal redesign** — full Bloomberg/thinkorswim aesthetic: monospace header line, two-row data grid (STRIKES/EXPIRY/DTE/ENTRY/MAX WIN/MAX LOSS/B/E + IV RANK/DELTA/PROB/R/R), tab bar (SUMMARY | GREEKS | ANALYSIS), ASCII IV bar and probability bars, dot risk meter; ~924 lines of old card CSS removed

- **Risk tier ordering fix** — Strategist prompt now enforces conservative < moderate < aggressive max loss; Critic check #6 flags moderate > aggressive as HIGH severity to trigger retry

- **Tier ordering fix** — removed `enforceRiskOrdering()` sort-and-relabel; tiers now stay locked to the Strategist that built them; Critic check #6 strengthened to validate structural risk (strategy type + probability) not just dollar max loss, with high severity to trigger retries on mismatches
- **Docs overhaul** — README, CLAUDE.md, PLANS.md updated with current multi-agent architecture, ASCII pipeline diagrams, and Phase C–F roadmap; PLANS.md replaces stale Tradier plan with concrete next agent phases
- **Worker redeployed** — `claude-haiku-4-5-20251001` added to ALLOWED_MODELS; wrangler added as dev dependency (`npm run` → `npx wrangler deploy --config worker/wrangler.toml`)

- **Agent pipeline Phase A+B** — orchestrator pattern + Critic agent shipped. Phase A: `callAPI` → `src/lib/claude.js`, Researcher (Haiku) + Strategist in `src/agents/`, pipeline DAG in `src/orchestrator.js`, `api.js` is now a one-line wrapper. Phase B: Critic (Haiku) validates all 3 trades against live chain data after Strategists; failing tiers retry Strategist with critique feedback (max 2 attempts); loading screen shows "Validating trades…" stage
- **docs/CONTEXT.md** — created project context doc for Claude chat sessions (replaces deleted arch/deployment/dev docs)
- **Market data timeout fix** — increased frontend abort from 5s→9s; cold Worker requests to marketdata.app were taking 6-8s and getting cut off
- **Backend migrated to Cloudflare Workers** — `api/` deleted; `worker/worker.js` deployed at `https://api.optionsbrief.workers.dev` (free, no cold starts); local dev: run `npx wrangler dev --config worker/wrangler.toml` + `npm run dev` in parallel; secrets in `worker/.dev.vars`
- **Vercel deployment** — app live at https://options-advisor-sepia.vercel.app
- **Backend proxy** — Vercel Edge→Node.js function (`api/analyze.js`) keeps API key server-side; 60s timeout via `vercel.json`
- **JSON resilience** — `jsonrepair` fallback + system prompt JSON safety rules fix parse errors from malformed model output
- **Search history** — localStorage, last 20 entries, re-run from history
- **Responsive design** — three breakpoints (≤900px, ≤600px, ≤380px) covering all screen sizes
- **Open Graph** — static `og.png` (logo mark on navy), correct meta tags for all platforms
- **Mobile header fixes** — `min-width: 0` on flex containers; subtitle truncates; brand mark scales across breakpoints
- **iOS zoom fix** — search input kept at 16px on mobile
- **Header animations removed** — static header, no sweep/pulse animations

- **Analysis tabs** — each search opens its own tab with independent loading state; spinner on loading tabs; history items switch to existing tab if already open; max 6 tabs
- **System prompt trim** — replaced full example JSON with compact schema; ~60% smaller prompt; 1 trade output
- **History caching** — full API result stored in localStorage per history entry; clicking history restores instantly without re-fetching
- **User profiles (Phases 1–4)** — Supabase auth with Google OAuth + magic link; avatar/user menu in header; analyses persisted to Supabase when signed in; localStorage migration on first sign-in; history resets on sign-out; sign-in nudge after 3+ guest analyses
- **Mobile landing** — vertically positioned search bar with popular ticker chips (NVDA, AAPL, TSLA, SPY, AMZN, META) and market scan shortcut; header subtitle hidden on mobile
- **Learn page** — `/learn` route with 5 sections (Start Here, Basics, Greeks, Volatility, Strategies); interactive payoff diagrams with live sliders; ITM/ATM/OTM explainer; IV gauge; strategy P&L diagrams; mobile responsive
- **Active tab text fix** — hover pseudo-class was overriding active state color; fixed for learn nav, header Learn button, and analysis tabs

- **Security hardened** — `api/analyze.js` validates model allowlist + max_tokens; "recommendation" → "analysis" throughout UI; disclaimer strengthened to explicitly exclude financial advice/solicitation language.

- **Mobile landing redesign** — tagline ("Understand the trade. Before you make it.") in Fraunces serif italic above search bar; top-anchored layout (no more vertical centering void); scan CTA is filled navy primary button; learn link de-emphasized to plain text; tagline visible on desktop too (26px) and mobile (30px)

- **Codebase refactor (Phase 1)** — extracted system prompts into `src/prompts/research.js` + `src/prompts/strategy.js`; extracted `useTheme` and `useAnalysisState` hooks from App.jsx; converted `TradeCard.jsx` → `TradeCard/` folder with `ShareMenu.jsx`; split `LearnPage.jsx` → `Learn/` folder with one file per section (IntroSection, BasicsSection, GreeksSection, IVSection, StrategiesSection)
- **Codebase refactor (Phase 2)** — split `styles.css` (2545 lines) into 4 focused files (`tokens.css`, `app.css`, `trade-card.css`, `learn.css`); extracted 6 TradeCard section components (`EntrySection`, `ExitSection`, `GreeksGrid`, `ThesisRisk`, `ScenariosSection`, `SignalsSection`); trimmed CLAUDE.md JSON schema block (~35 lines saved); added `src/CODEBASE.md` navigation index; renamed `utils.js` → `utils.jsx` (contains JSX)

- **App renamed to Options Brief** — removed "Advisor" from header, page title, OG/Twitter meta, screenshot brand, share text, and markdown export

- **IV rank fix** — `STRATEGY_SYSTEM_PROMPT_LIVE` now explicitly copies `ivRank` from Phase 1 research; code-side override in `api.js` enforces it post-Phase 2; "never use 0" guard added to research prompt
- **Loading screen redesign** — stage-based progress (Market Data → Research → Strategies); live AI findings feed from streamed text blocks; removed internal "report" stage
- **Homepage redesign** — Fraunces italic headline ("The analysis desk / you never had."), constrained centered layout, dark mode radial ambient glow; eyebrow text "Research · Strategy · Execution"
- **Mobile landing overhaul** — vertical centering; plain-text chips (no borders); eyebrow/label/hint/learn-link hidden; 3-column chip grid; "Scan market" CTA removed; Recent analyses moved below chips
- **Search history → floating dropdown** — converted from inline expand to `position: absolute` panel with `max-height: 300px` scroll; renamed "Recent searches" → "Recent analyses"; dark mode contrast fix for dropdown panel
- **Logo clickable** — clicking brand mark/name returns to landing state (`navigate("/") + setActiveId(null)`)
- **Removed Robinhood mentions** — "How to execute on Robinhood" → "How to execute"; header subtitle simplified
- **Dark mode fixes** — Analyze button hover no longer turns dark navy; "Today" label in theta decay chart fixed (was black due to missing `--blue` token); dropdown panels use `--surface-3` for contrast
- **Placeholder simplified** — search input placeholder changed to "Enter a ticker"
- **Console.log removed** — removed `console.error` from analyze error handler

- **Mobile comparison view overhaul** — replaced mobile switcher with 3-column sticky-header comparison grid (MobileComparisonView); all sections (DETAILS, METRICS, THESIS, ENTRY, EXIT, GREEKS, SCENARIOS, SIGNALS, CHECKLIST, CHARTS) collapsible via chevron toggle; expanded checklist sections show per-column item detail (status + value + note) within the 3-column grid instead of a full-width panel; section label column shows stacked chevron + abbreviated name

- **Trade Discipline Checklist** — single "Run Checklist" button triggers 3 parallel Haiku calls (one per trade tier); fixed blank moderate/aggressive columns caused by batch call's sparse schema example and token budget; results persisted to localStorage/Supabase via onAuditComplete; cached results pre-populate on reload for both mobile and desktop; desktop: full-width header row with single "Run Checklist" button, per-column results rendered directly (no per-column toggle buttons), all sections auto-expanded; checklist section summary shows "x/x passed" format

- **Citation strip** — `<cite>` tags from web search tool stripped from market summary banner via `stripCitations()` in utils

- **COST_ANALYSIS.md updated** — Trade Discipline Checklist adds ~$0.023/run (3 × 1200-token Haiku calls, one-time cost per analysis due to caching)

- **Code simplification** — extracted `tallyItems`, `formatRRRatio`, `formatDelta`, `TIER_COLOR`, `TIER_LABEL` into `utils.jsx`; removed 3× duplicate R/R+delta derivations and 2× duplicate tally loops; ShareMenu clone effect changed to `useLayoutEffect` (fixes empty-preview flash); `captureCanvas()` returns canvas directly so `handleNativeShare` uses `canvas.toBlob()` instead of `fetch(dataUrl)`; `noHeader ? true : undefined` clarity fix in ChecklistSection

## Known Issues / Next Up

- Phase 5 deferred: thumbs up/down + report on trade cards (DB columns already exist)
- See PLANS.md for future feature roadmap
