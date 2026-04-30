# Status

## Recently Completed

- **Vercel deployment** — app live at https://options-advisor-sepia.vercel.app
- **Backend proxy** — Vercel Edge→Node.js function (`api/analyze.js`) keeps API key server-side; 60s timeout via `vercel.json`
- **JSON resilience** — `jsonrepair` fallback + system prompt JSON safety rules fix parse errors from malformed model output
- **Search history** — localStorage, last 20 entries, re-run from history
- **Responsive design** — three breakpoints (≤900px, ≤600px, ≤380px) covering all screen sizes
- **Open Graph** — static `og.png` (logo mark on navy), correct meta tags for all platforms
- **Bug fix** — `.map()` on undefined arrays (riskFactors, robinhoodSteps, bullishSignals, warningSignals) caused blank page in production; guarded with `?? []`

- **Mobile header fixes** — `min-width: 0` on flex containers prevents overflow; subtitle truncates with ellipsis; brand mark scales 36→28→24px across breakpoints; letter-spacing reduced; subtitle hidden at ≤380px
- **Loading panel step alignment** — `align-items: flex-start` on `.lp-step` so icon pins to first line when text wraps on narrow screens
- **iOS zoom fix** — search input kept at 16px on mobile (iOS auto-zooms on inputs below 16px)
- **JSON parse resilience** — third repair pass strips control characters before retrying `jsonrepair`; all failures now show user-friendly "try again" message instead of raw position error
- **Header animations removed** — sweep line and ◈ pulse replaced with static versions
- **Code cleanup** — `--amber-ui` CSS token, `validSources` derived once per render, `completedSteps` keyed by index

## Known Issues / Next Up

- None outstanding
