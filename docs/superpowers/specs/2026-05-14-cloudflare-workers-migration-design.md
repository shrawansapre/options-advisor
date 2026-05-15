# Design: Migrate Backend to Cloudflare Workers

**Date:** 2026-05-14  
**Scope:** Backend only — Vercel stays for static frontend hosting  
**Goal:** Move `api/analyze.js` and `api/market.js` off Vercel to Cloudflare Workers (free tier)

---

## What Is Being Moved

Two API handlers currently deployed as Vercel functions:

| File | Current runtime | Role |
|------|----------------|------|
| `api/analyze.js` | Vercel Edge | Proxies streaming SSE requests to Anthropic API; keeps API key server-side |
| `api/market.js` | Vercel Node.js | Fetches stock quotes + options chains from marketdata.app |

The React/Vite frontend stays on Vercel. Only the API layer moves.

---

## Target Architecture

```
Browser (Vercel static)
  │
  ├─ POST /analyze  ──→  Cloudflare Worker (options-brief-api)
  │                         └─ streams SSE from api.anthropic.com
  │
  └─ GET /market    ──→  Cloudflare Worker (options-brief-api)
                            └─ fetches from api.marketdata.app
```

One Worker project, two routes, deployed to `https://options-brief-api.<account>.workers.dev`.

---

## New File Structure

```
worker/
├── wrangler.toml     # Cloudflare project config
└── worker.js         # Single entry point, routes both handlers
```

The existing `api/` directory is deleted after the migration is confirmed working in production.

---

## Worker Routing

`worker.js` exports a single `fetch` handler. It reads `url.pathname` and delegates:

```
POST /analyze  →  handleAnalyze(req, env)
GET  /market   →  handleMarket(req, env)
OPTIONS *      →  CORS preflight response
*              →  404
```

---

## Code Changes

### analyze handler (~5 line changes)

Current Vercel Edge code translates almost directly:
- Remove `export const config = { runtime: 'edge' }` — not needed
- Change `async function handler(req)` → the function receives `(req, env)` 
- Change `process.env.ANTHROPIC_API_KEY` → `env.ANTHROPIC_API_KEY`
- All streaming logic (piping `upstream.body`) stays identical — Cloudflare Workers supports the same Web Fetch API

### market handler (~20 line changes)

Current code uses Node.js `(req, res)` style. Cloudflare Workers use Web API `Request → Response`:
- `req.query.ticker` → `new URL(req.url).searchParams.get('ticker')`
- `res.status(200).json(data)` → `new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })`
- `res.status(N).send(msg)` → `new Response(msg, { status: N })`
- All business logic (caching, ticker sanitization, chain extraction, IV calculation) stays identical

### CORS headers

Both handlers add CORS headers to every response so the Vercel-hosted frontend can call the Worker:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

`OPTIONS` preflight requests return 204 with these headers and no body.

### wrangler.toml

```toml
name = "options-brief-api"
main = "worker/worker.js"
compatibility_date = "2024-01-01"
```

Secrets (`ANTHROPIC_API_KEY`, `MARKET_DATA_TOKEN`) are set via `wrangler secret put` — never committed to the repo.

---

## Frontend Changes

`src/api.js` currently calls relative URLs (`/api/analyze`, `/api/market`). These become absolute via a Vite env var:

```js
const API_BASE = import.meta.env.VITE_API_BASE ?? '';
// calls: `${API_BASE}/api/analyze`  →  `${API_BASE}/analyze`
```

Two env var entries required:
- `.env.local` (local dev): `VITE_API_BASE=https://options-brief-api.<account>.workers.dev`
- Vercel dashboard (production): same value

Path also changes: `/api/analyze` → `/analyze` and `/api/market` → `/market` (no `/api/` prefix in the Worker).

---

## Secrets Management

| Secret | Where set |
|--------|-----------|
| `ANTHROPIC_API_KEY` | `wrangler secret put ANTHROPIC_API_KEY` |
| `MARKET_DATA_TOKEN` | `wrangler secret put MARKET_DATA_TOKEN` |

Both are encrypted by Cloudflare, injected into `env` at runtime, never exposed in code or logs.

---

## One-Time Deployment Setup

1. `npm install -g wrangler` (or use `npx wrangler`)
2. `wrangler login` — authenticates with Cloudflare account
3. `wrangler secret put ANTHROPIC_API_KEY`
4. `wrangler secret put MARKET_DATA_TOKEN`
5. `wrangler deploy` — publishes the Worker
6. Add `VITE_API_BASE` to Vercel environment variables
7. Redeploy frontend on Vercel (picks up the new env var)

After confirming production works: delete `api/` directory and `vercel.json` `functions` block.

---

## What Does Not Change

- All business logic in both handlers
- Supabase auth and history sync
- Frontend components, styles, routing
- Vercel hosting for the static frontend
- The streaming SSE behaviour (Cloudflare Workers supports this natively)

---

## Free Tier Limits

Cloudflare Workers free tier: **100,000 requests/day**. For a personal options analysis app this is effectively unlimited.
