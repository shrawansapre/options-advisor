# Status

## Recently Completed

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

- **3-tier trade system** — system prompt now returns 3 trades per analysis (conservative / moderate / aggressive); `riskTier` field added to schema; max_tokens raised to 16000
- **MultiTradeView** — tier selector above a single mounted TradeCard; `useAnimationControls` fade-out/in on tier switch (no remount); icons updated to Shield / Activity / Zap
- **Unified data block** — contract specs + financial outcomes merged into one bordered container with internal divider; old separate strips removed
- **Inline strategy meta line** — replaced bordered pill badges with `● strategy · conviction` inline text; risk tier appended on desktop, hidden on mobile (redundant with tier selector)
- **Market banner** — column layout (MARKET label above paragraph text); Globe icon removed; tightened on mobile
- **Mobile UI overhaul** — tier selector collapses to compact segmented control on ≤600px (colored tint on active); inactive tabs slim on ≤768px; financials row goes 1-col at ≤380px; stock price scales down; card margin reduced; meta line wraps cleanly
- **Search history mobile** — two-line grid layout on ≤600px: ticker + date on row 1, strategy + strikes on row 2; long names truncate with ellipsis; date restored to top-right slot
- **Credit spread payoff fix** — TradeCharts correctly models bull put / bear call credit spreads (received premium, kHigh/kLow normalisation)
- **Share button** — moved to top-right of card header; outside-click closes menu
- **html-to-image** — added as dependency for share card download / native share

## Known Issues / Next Up

- Phase 5 deferred: thumbs up/down + report on trade cards (DB columns already exist)
- See PLANS.md for future feature roadmap
