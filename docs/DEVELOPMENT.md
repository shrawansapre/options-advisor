# Development

## Setup

```bash
git clone https://github.com/shrawansapre/options-advisor
cd options-advisor
npm install
cp .env.example .env
# fill in your keys (see .env.example for what's needed)
npm run dev
```

App runs at `http://localhost:3000`.

Auth (Google OAuth + magic link) requires Supabase credentials — see `.env.example`. The app works without them; history just stays local.

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
│   └── analyze.js           ← Vercel Edge Function — proxy to Anthropic
│                               Validates model allowlist + max_tokens before forwarding
│
├── src/
│   ├── main.jsx             ← React root mount + BrowserRouter + AuthProvider
│   ├── App.jsx              ← Layout, routing, tab state, analyze flow
│   ├── api.js               ← SYSTEM_PROMPT constant + fetchRecommendation()
│   ├── styles.css           ← All styles (design tokens at top)
│   ├── utils.js             ← Shared helpers (share markdown, etc.)
│   │
│   ├── lib/
│   │   └── supabase.js      ← Supabase client (exports null if env vars missing)
│   │
│   └── components/
│       ├── TradeCard.jsx    ← Main trade card with tab orchestration
│       ├── AnalysisTabs.jsx ← Tab bar for switching between open analyses
│       ├── SearchHistory.jsx← Recent searches row + history sync
│       ├── LoadingMessages.jsx ← Streaming progress display
│       ├── LearnPage.jsx    ← /learn route — interactive options education
│       ├── IVGauge.jsx      ← IV rank gauge component
│       ├── TradeCharts.jsx  ← Payoff diagram charts
│       ├── AuthContext.jsx  ← useAuth() hook + AuthProvider
│       ├── AuthModal.jsx    ← Sign-in modal (Google OAuth + magic link)
│       └── ErrorBoundary.jsx
│
├── docs/                    ← You are here
├── public/
│   └── og.png               ← Open Graph image
├── index.html
├── vite.config.js
├── vercel.json              ← SPA rewrite rule
├── .env                     ← Local secrets (gitignored)
└── .env.example             ← Template — safe to commit
```

---

## Key design decisions

**Components split out of App.jsx**
`App.jsx` handles layout, routing, tab state, and the analyze flow. Individual trade display, auth, history, loading, and education each live in their own file under `src/components/`.

**System prompt in `src/api.js`**
The prompt is the source of truth for the JSON schema. Every field in the UI maps to a field defined there. If you rename a field in the prompt, grep the codebase for the old name — components read it directly.

**No TypeScript**
Plain JS. The JSON schema is documented in `CLAUDE.md` and validated at runtime via optional chaining throughout.

**No state management library**
`useState` is enough. Global state (analyses array, active tab, auth) all lives in `App.jsx`. If you add cross-component shared state beyond what's there, consider Zustand.

**Streaming without a partial-JSON parser**
Rather than trying to parse partial JSON (which breaks), `extractReadableStrings()` regex-extracts completed string values from the raw SSE stream for the loading preview. The full JSON is only parsed after the stream ends, with up to 4 repair attempts.

**Supabase is optional**
`src/lib/supabase.js` exports `null` when env vars are missing. `useAuth()` degrades gracefully — the app works fully without it, history just stays in localStorage.

---

## Changing the JSON schema

The API returns a specific JSON shape defined by the system prompt. The shape is documented in `CLAUDE.md`. If you add or rename a field:

1. Update the field in `SYSTEM_PROMPT` inside `src/api.js`
2. Update the example JSON in the same prompt
3. Update the component that reads the field
4. Use optional chaining so the component degrades gracefully if the field is absent

---

## Future features

See [PLANS.md](../PLANS.md) for the full roadmap.
