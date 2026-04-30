# Development

## Setup

```bash
git clone https://github.com/shrawansapre/options-advisor
cd options-advisor
npm install
cp .env.example .env
# paste your Anthropic key into .env
npm run dev
```

App runs at `http://localhost:3000`.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server with hot reload |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |

---

## File map

```
options-advisor/
│
├── api/
│   └── analyze.js        ← Vercel Edge Function — backend proxy to Anthropic
│
├── src/
│   ├── main.jsx          ← React root mount (3 lines, don't touch)
│   ├── App.jsx           ← Every component lives here
│   │                        SearchHistory, LoadingMessages, IVGauge,
│   │                        TradeCard, and the root App
│   ├── api.js            ← System prompt + fetchRecommendation()
│   └── styles.css        ← All styles (CSS custom properties at the top)
│
├── docs/
│   ├── ARCHITECTURE.md   ← How the two-mode proxy works
│   ├── DEPLOYMENT.md     ← Vercel setup
│   └── DEVELOPMENT.md    ← You are here
│
├── index.html            ← Entry point (loads src/main.jsx)
├── vite.config.js
├── .env                  ← Local secrets (gitignored)
└── .env.example          ← Template — safe to commit
```

---

## Key design decisions

**Everything in one file (`App.jsx`)**
At current scale this is simpler than splitting into `src/components/`. When the file
exceeds ~600 lines meaningfully, split into `components/TradeCard.jsx`, etc.

**System prompt in `src/api.js`**
The prompt is ~4 KB and drives every field in the UI. If you rename a field in the
prompt, grep the codebase for the old name — components read it directly.

**No TypeScript**
Keep it plain JS unless the project grows substantially. The JSON schema is documented
in `CLAUDE.md` and validated at runtime via optional chaining throughout.

**No state management library**
`useState` is enough. The only global state is `result`, `loading`, `error`,
`analysedAt`, and the localStorage history. If you add routing or shared state
across multiple pages, consider Zustand.

**Streaming without a parser**
Rather than trying to parse partial JSON (which breaks), `extractReadableStrings()`
regex-extracts completed string values from the raw SSE stream for the loading preview.
The full JSON is only parsed after the stream ends.

---

## Changing the JSON schema

The API returns a specific JSON shape defined by the system prompt. The shape is
documented in `CLAUDE.md`. If you add or rename a field:

1. Update the field name in `SYSTEM_PROMPT` inside `src/api.js`
2. Update the example JSON in the same prompt so the model knows what to output
3. Update the component that reads the field in `App.jsx`
4. Check for optional chaining — the component should degrade gracefully if the field is missing

---

## Planned features

1. **Trade journal** — localStorage log of trades entered, with entry/exit price and P&L
2. **Watchlist** — save tickers and re-scan with one tap
3. **Dark mode** — CSS variables are set up for it; add `@media (prefers-color-scheme: dark)`
4. **P&L calculator** — given entry price and current option price, show live gain/loss
5. **Portfolio Greeks** — aggregate delta/theta/vega across open positions
6. **Backend hardening** — move system prompt server-side so it's not visible in the bundle
7. **Rate limiting** — add request throttling in `api/analyze.js` per IP
8. **Broker support** — Tastytrade/IBKR execution steps alongside Robinhood
