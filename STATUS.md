# Status

## Recently Completed

- **Vercel deployment** — app live at https://options-advisor-sepia.vercel.app
- **Backend proxy** — Vercel Edge→Node.js function (`api/analyze.js`) keeps API key server-side; 60s timeout via `vercel.json`
- **JSON resilience** — `jsonrepair` fallback + system prompt JSON safety rules fix parse errors from malformed model output
- **Search history** — localStorage, last 20 entries, re-run from history
- **Responsive design** — three breakpoints (≤900px, ≤600px, ≤380px) covering all screen sizes
- **Open Graph** — static `og.png` (logo mark on navy), correct meta tags for all platforms
- **Bug fix** — `.map()` on undefined arrays (riskFactors, robinhoodSteps, bullishSignals, warningSignals) caused blank page in production; guarded with `?? []`

## Known Issues / Next Up

- None outstanding
