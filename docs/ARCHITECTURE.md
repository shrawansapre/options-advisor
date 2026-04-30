# Architecture

## The two-mode design

The app runs in two configurations depending on the environment.
The switch is automatic — no code change needed between local and production.

```
┌─────────────────────────────────────────────────────────────────────┐
│  LOCAL DEVELOPMENT  (npm run dev)                                   │
│                                                                     │
│   Browser ──────────────────────────────────► Anthropic API        │
│               direct HTTPS call                   api.anthropic.com │
│               with API key in header                                │
│                                                                     │
│   Key lives in .env (gitignored). Nobody else ever sees it.         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  PRODUCTION  (Vercel)                                               │
│                                                                     │
│   Browser ──────────► /api/analyze ──────────► Anthropic API       │
│            your call    Edge Function            api.anthropic.com  │
│            (no key)     on Vercel's servers                         │
│                         adds the key                                │
│                                                                     │
│   The browser never sees the key. It only talks to /api/analyze,   │
│   which is YOUR server. The key lives in Vercel's secret store.     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why two modes?

Browsers are public. Anything in client-side JavaScript — including env vars prefixed
with `VITE_` — can be read by anyone who opens DevTools. A leaked key means someone
can make API calls at your expense.

A backend proxy fixes this: the browser calls your own server, and your server calls
Anthropic. The key never leaves the server.

Local dev still calls Anthropic directly because it only runs on your machine.

---

## How the auto-switch works

One line in `src/api.js` decides which path to take:

```js
const USE_PROXY = !import.meta.env.VITE_ANTHROPIC_API_KEY;
```

| Environment | `VITE_ANTHROPIC_API_KEY` | `USE_PROXY` | Calls |
|---|---|---|---|
| Local (`npm run dev`) | set in `.env` | `false` | `api.anthropic.com` |
| Vercel (production) | not set in Vercel | `true` | `/api/analyze` |

When proxying, the browser sends no auth headers at all:

```js
// proxy mode — browser sends this (safe to inspect in DevTools)
{ "Content-Type": "application/json" }

// direct mode — local only, never reaches production
{ "Content-Type": "application/json",
  "x-api-key": "sk-ant-...",
  "anthropic-dangerous-direct-browser-access": "true" }
```

---

## The Edge Function (`api/analyze.js`)

The backend route. Runs on Vercel's global Edge Network — a serverless function
that wakes up on demand, handles the request, then shuts down.

```
Request from browser
        │
        ▼
┌────────────────────────────────────────────────────────┐
│  api/analyze.js  (Vercel Edge Function)                │
│                                                        │
│  1. Receive POST body from browser                     │
│     { model, messages, system, tools, max_tokens }     │
│                                                        │
│  2. Read ANTHROPIC_API_KEY from Vercel env vars        │
│     (server-only — the browser never sees this)        │
│                                                        │
│  3. Forward body to Anthropic with auth header added   │
│     POST https://api.anthropic.com/v1/messages         │
│     x-api-key: sk-ant-...  ◄── injected here           │
│                                                        │
│  4. Stream Anthropic's response straight back          │
│     SSE stream passes through unchanged                │
└────────────────────────────────────────────────────────┘
        │
        ▼
Response streamed back to browser
```

**Why Edge Functions, not regular serverless?**
- Start in ~0ms — no cold start because they run V8 isolates, not Node.js processes
- Run geographically close to the user
- Ideal for streaming — they pipe the response body directly without buffering

---

## Full request lifecycle (production)

```
User types "NVDA" → clicks Analyze
        │
        ▼
handleAnalyze() in App.jsx
  validates ticker to [A-Z0-9.\-], max 10 chars
        │
        ▼
fetchRecommendation() in src/api.js
  sanitizes ticker again (defense in depth against prompt injection)
  builds request body: model + system prompt + user message + web_search tool
        │
        ▼  POST /api/analyze  (no API key in headers)
Vercel Edge Function  (api/analyze.js)
  reads ANTHROPIC_API_KEY from Vercel env vars
  adds auth + anthropic-version headers
  forwards body to Anthropic
        │
        ▼  POST https://api.anthropic.com/v1/messages
Anthropic API
  runs web_search tool 2–4× to gather live data
  writes the JSON trade recommendation
  streams it back token by token (SSE)
        │
        ▼  SSE stream piped back through /api/analyze
fetchRecommendation() stream loop in src/api.js
  extracts readable strings as they arrive → shows in loading screen
  detects each web_search event → increments search counter
  after stream ends: finds first { and last }, parses JSON
        │
        ▼
App.jsx
  setResult(data) → React renders the trade card
  addEntry() → saves ticker + strategy summary to localStorage history
```

---

## Input validation

User input is sanitized in two places:

1. **`App.jsx` onChange** — strips non-ticker characters as the user types:
   ```js
   .replace(/[^A-Z0-9.\-]/g, "").slice(0, 10)
   ```

2. **`src/api.js`** — strips again before it touches the prompt:
   ```js
   const safeTicker = (ticker || "").replace(/[^A-Z0-9.\-]/gi, "").slice(0, 10)
   ```

This prevents prompt injection (e.g. `; ignore all instructions`) from reaching
the model. Valid tickers like `BRK.B` and `BF-B` pass through unchanged.
