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

## Known Issues / Next Up

- Phase 5 deferred: thumbs up/down + report on trade cards (DB columns already exist)
