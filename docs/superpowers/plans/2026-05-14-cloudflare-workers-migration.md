# Cloudflare Workers Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `api/analyze.js` and `api/market.js` off Vercel onto a single free Cloudflare Worker, and update the React frontend to call the new URLs.

**Architecture:** A single Cloudflare Worker (`worker/worker.js`) routes `/analyze` and `/market` requests. The worker uses the Web Fetch API (same model as the current Vercel Edge function for analyze; adapted for market). The Vercel-hosted static frontend calls the Worker via an absolute URL stored in `VITE_API_BASE`.

**Tech Stack:** Cloudflare Workers (module syntax), `wrangler` CLI, Vite env vars

---

## Files

| Action | Path | Purpose |
|--------|------|---------|
| Create | `worker/wrangler.toml` | Cloudflare project config |
| Create | `worker/worker.js` | Single Worker entry — both handlers + router |
| Create | `worker/.dev.vars` | Local secrets for `wrangler dev` (gitignored) |
| Modify | `.gitignore` | Add `worker/.dev.vars` |
| Modify | `src/api.js:119` | Use `VITE_API_BASE` for analyze URL |
| Modify | `src/api.js:213` | Use `VITE_API_BASE` for market URL |
| Modify | `.env.local` | Add `VITE_API_BASE=http://localhost:8787` |
| Delete | `api/analyze.js` | Replaced by Worker |
| Delete | `api/market.js` | Replaced by Worker |
| Modify | `vercel.json` | Remove `functions` block (no more server functions) |

---

## Task 1: Scaffold Worker project

**Files:**
- Create: `worker/wrangler.toml`
- Create: `worker/.dev.vars`
- Modify: `.gitignore`

- [ ] **Step 1: Create `worker/wrangler.toml`**

```toml
name = "options-brief-api"
main = "worker.js"
compatibility_date = "2024-01-01"
```

- [ ] **Step 2: Create `worker/.dev.vars` with local secrets**

Copy the values from `.env.local`:

```
ANTHROPIC_API_KEY=<value of ANTHROPIC_API_KEY from .env.local>
MARKET_DATA_TOKEN=<value of MARKET_DATA_TOKEN from .env.local>
```

- [ ] **Step 3: Add `worker/.dev.vars` to `.gitignore`**

Append to `.gitignore`:

```
worker/.dev.vars
```

- [ ] **Step 4: Commit**

```bash
git add worker/wrangler.toml .gitignore
git commit -m "feat: scaffold Cloudflare Worker project"
```

---

## Task 2: Write the Worker (`worker/worker.js`)

**Files:**
- Create: `worker/worker.js`

- [ ] **Step 1: Create `worker/worker.js` with the complete implementation**

```js
const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-sonnet-4-20250514']);
const MAX_TOKENS_LIMIT = 16000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function text(body, status = 200) {
  return new Response(body, { status, headers: CORS });
}

// ─── Analyze handler ──────────────────────────────────────────────────────────

async function handleAnalyze(req, env) {
  if (req.method !== 'POST') return text('Method not allowed', 405);

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: { message: 'ANTHROPIC_API_KEY not configured' } }, 500);

  let body;
  try { body = await req.json(); } catch { return text('Invalid JSON', 400); }

  if (!ALLOWED_MODELS.has(body.model)) return text('Forbidden', 403);
  if (!body.max_tokens || body.max_tokens > MAX_TOKENS_LIMIT) return text('Forbidden', 403);

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify(body),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...CORS,
      'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ─── Market handler ───────────────────────────────────────────────────────────

const cache = new Map();

function cacheKey(ticker) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
  return `${ticker}:${ts}`;
}

function sanitizeTicker(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const upper = raw.toUpperCase().trim();
  if (!/^[A-Z0-9.\-]{1,10}$/.test(upper)) return null;
  return upper;
}

function daysToExpiry(expiryStr) {
  const now = new Date();
  const exp = new Date(expiryStr + 'T00:00:00Z');
  return Math.round((exp - now) / (1000 * 60 * 60 * 24));
}

function extractQuote(data) {
  if (data?.s !== 'ok' || !data.last?.[0]) return null;
  return {
    last: data.last[0],
    bid: data.bid?.[0] ?? null,
    ask: data.ask?.[0] ?? null,
    changePercent: data.changepct?.[0] != null ? +(data.changepct[0] * 100).toFixed(2) : null,
  };
}

function extractExpirations(data) {
  if (data?.s !== 'ok' || !Array.isArray(data.expirations)) return [];
  return data.expirations;
}

function extractChains(data, currentPrice, expirations) {
  if (data?.s !== 'ok' || !Array.isArray(data.strike)) return [];
  const byExpiry = {};
  for (const exp of expirations) byExpiry[exp] = [];
  for (let i = 0; i < data.strike.length; i++) {
    const ts = data.expiration?.[i];
    const exp = ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null;
    if (!byExpiry[exp]) continue;
    byExpiry[exp].push({
      type: data.side?.[i] ?? null,
      strike: data.strike[i],
      bid: data.bid?.[i] ?? null,
      ask: data.ask?.[i] ?? null,
      delta: data.delta?.[i] ?? null,
      theta: data.theta?.[i] ?? null,
      gamma: data.gamma?.[i] ?? null,
      vega: data.vega?.[i] ?? null,
      iv: data.iv?.[i] ?? null,
      volume: data.volume?.[i] ?? null,
      openInterest: data.openInterest?.[i] ?? null,
    });
  }
  return expirations
    .map(exp => ({ expiry: exp, daysToExpiry: daysToExpiry(exp), options: byExpiry[exp] }))
    .filter(c => c.options.length > 0);
}

function extractIvCurrent(chains, currentPrice) {
  for (const chain of chains) {
    if (!chain.options?.length) continue;
    let closest = null, minDist = Infinity;
    for (const o of chain.options) {
      const dist = Math.abs(o.strike - currentPrice);
      if (dist < minDist) { minDist = dist; closest = o.strike; }
    }
    const atm = chain.options.filter(o => o.strike === closest);
    const ivs = [atm.find(o => o.type === 'call')?.iv, atm.find(o => o.type === 'put')?.iv]
      .filter(v => v != null && v > 0);
    if (ivs.length) return ivs.reduce((a, b) => a + b, 0) / ivs.length;
  }
  return null;
}

async function handleMarket(req, env) {
  if (req.method !== 'GET') return text('Method not allowed', 405);

  const ticker = sanitizeTicker(new URL(req.url).searchParams.get('ticker'));
  if (!ticker) return json({ error: 'ticker_required' }, 400);

  const key = cacheKey(ticker);
  if (cache.has(key)) return json(cache.get(key));

  const token = env.MARKET_DATA_TOKEN;
  if (!token) return json({ error: 'market_data_unavailable' });

  try {
    const base = 'https://api.marketdata.app/v1';
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    const [quoteRes, expRes] = await Promise.all([
      fetch(`${base}/stocks/quotes/${ticker}/`, { headers }),
      fetch(`${base}/options/expirations/${ticker}/`, { headers }),
    ]);
    if (!quoteRes.ok || !expRes.ok) throw new Error('fetch failed');

    const [quoteData, expData] = await Promise.all([quoteRes.json(), expRes.json()]);

    const quote = extractQuote(quoteData);
    if (!quote) throw new Error('no quote data');

    const allExpirations = extractExpirations(expData);
    if (!allExpirations.length) throw new Error('no expirations');
    const nearTerm = allExpirations.filter(exp => {
      const dte = daysToExpiry(exp);
      return dte >= 21 && dte <= 120;
    });
    const expirations = (nearTerm.length > 0 ? nearTerm : allExpirations).slice(0, 3);

    const from = expirations[0];
    const to = expirations[expirations.length - 1];
    const chainRes = await fetch(
      `${base}/options/chain/${ticker}/?from=${from}&to=${to}&strikeLimit=5&delta=.05-.95`,
      { headers }
    );
    if (!chainRes.ok) throw new Error('chain fetch failed');
    const chains = extractChains(await chainRes.json(), quote.last, expirations);

    const result = {
      ticker,
      quote,
      ivRank: null,
      ivCurrent: extractIvCurrent(chains, quote.last),
      chains,
      fetchedAt: new Date().toISOString(),
    };

    if (cache.size > 500) cache.clear();
    cache.set(key, result);
    return json(result);
  } catch {
    return json({ error: 'market_data_unavailable' });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const { pathname } = new URL(req.url);
    if (pathname === '/analyze') return handleAnalyze(req, env);
    if (pathname === '/market') return handleMarket(req, env);
    return new Response('Not found', { status: 404, headers: CORS });
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add worker/worker.js
git commit -m "feat: add Cloudflare Worker with analyze and market handlers"
```

---

## Task 3: Test locally with `wrangler dev`

**Files:** (no changes — test only)

- [ ] **Step 1: Install wrangler if not already installed**

```bash
npx wrangler --version
```

If it prints a version, skip the install. If it errors, run:

```bash
npm install -g wrangler
```

- [ ] **Step 2: Start the worker locally**

Run this in a separate terminal (leave it running):

```bash
npx wrangler dev --config worker/wrangler.toml
```

Expected output includes:
```
⛅️ wrangler x.x.x
[wrangler:inf] Ready on http://localhost:8787
```

- [ ] **Step 3: Test the market endpoint**

```bash
curl "http://localhost:8787/market?ticker=AAPL"
```

Expected: JSON with `ticker`, `quote`, `chains` fields (or `{"error":"market_data_unavailable"}` if marketdata.app is down — that's fine, it means the handler ran).

- [ ] **Step 4: Test the analyze endpoint rejects bad requests**

```bash
curl -X POST http://localhost:8787/analyze \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","max_tokens":100}'
```

Expected: `Forbidden` (status 403) — the model allowlist is working.

- [ ] **Step 5: Test CORS preflight**

```bash
curl -X OPTIONS http://localhost:8787/analyze \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Expected: status 204, `Access-Control-Allow-Origin: *` in response headers.

---

## Task 4: Deploy to Cloudflare

**Files:** (no code changes — deployment only)

- [ ] **Step 1: Log in to Cloudflare**

```bash
npx wrangler login
```

This opens a browser to authenticate. Complete the OAuth flow.

- [ ] **Step 2: Set the Anthropic API key secret**

```bash
npx wrangler secret put ANTHROPIC_API_KEY --config worker/wrangler.toml
```

When prompted, paste the value of `ANTHROPIC_API_KEY` from `.env.local`. You will not see the value echoed.

- [ ] **Step 3: Set the market data secret**

```bash
npx wrangler secret put MARKET_DATA_TOKEN --config worker/wrangler.toml
```

When prompted, paste the value of `MARKET_DATA_TOKEN` from `.env.local`.

- [ ] **Step 4: Deploy**

```bash
npx wrangler deploy --config worker/wrangler.toml
```

Expected output ends with something like:
```
Published options-brief-api (x.xx sec)
  https://options-brief-api.<your-account>.workers.dev
```

Copy that URL — you will need it in Task 5.

- [ ] **Step 5: Smoke-test the deployed worker**

Replace `<WORKER_URL>` with the URL from the previous step.

```bash
curl "<WORKER_URL>/market?ticker=AAPL"
```

Expected: JSON with `ticker: "AAPL"` and quote/chain data.

```bash
curl -X POST "<WORKER_URL>/analyze" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","max_tokens":100}'
```

Expected: `Forbidden`

---

## Task 5: Update the frontend to call the Worker

**Files:**
- Modify: `src/api.js:119`
- Modify: `src/api.js:213`
- Modify: `.env.local`

- [ ] **Step 1: Update the analyze URL in `src/api.js` (line 119)**

Current:
```js
      USE_PROXY ? "/api/analyze" : "https://api.anthropic.com/v1/messages",
```

Replace with:
```js
      USE_PROXY ? `${import.meta.env.VITE_API_BASE ?? ''}/analyze` : "https://api.anthropic.com/v1/messages",
```

- [ ] **Step 2: Update the market URL in `src/api.js` (line 213)**

Current:
```js
    const res = await fetch(`/api/market?ticker=${ticker}`, { signal: controller.signal });
```

Replace with:
```js
    const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}/market?ticker=${ticker}`, { signal: controller.signal });
```

- [ ] **Step 3: Add `VITE_API_BASE` to `.env.local` for local dev**

Add this line to `.env.local`:
```
VITE_API_BASE=http://localhost:8787
```

Also remove these two lines that were only needed for `vercel dev` (no longer used):
```
# Remove both of these:
ANTHROPIC_API_KEY=sk-ant-api03-...
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```

> **Why remove `VITE_ANTHROPIC_API_KEY`?** When that var is set, the frontend calls Anthropic directly from the browser and bypasses the Worker entirely. Removing it forces local dev to use the Worker at `localhost:8787` — the same path as production.

- [ ] **Step 4: Verify local dev still works**

With `wrangler dev` still running in the other terminal, start the Vite dev server:

```bash
npm run dev
```

Open http://localhost:3000. Enter a ticker (e.g. AAPL) and run an analysis. Confirm the market data banner appears and the analysis streams correctly.

- [ ] **Step 5: Commit**

```bash
git add src/api.js .env.local
git commit -m "feat: point frontend API calls at Cloudflare Worker"
```

---

## Task 6: Configure Vercel for production and verify

**Files:** (Vercel dashboard only — no code changes)

- [ ] **Step 1: Add `VITE_API_BASE` to Vercel environment variables**

1. Go to https://vercel.com → your Options Brief project → Settings → Environment Variables
2. Add: `VITE_API_BASE` = `https://options-brief-api.<your-account>.workers.dev`
   (use the URL from Task 4 Step 4)
3. Set scope: Production + Preview

- [ ] **Step 2: Trigger a Vercel redeploy**

```bash
git commit --allow-empty -m "chore: trigger Vercel redeploy for VITE_API_BASE"
git push
```

- [ ] **Step 3: Verify production**

Open https://options-advisor-sepia.vercel.app in a browser. Run an analysis. Confirm:
- Market data banner shows live price data (or gracefully absent if market closed)
- Analysis streams and completes
- No console errors about CORS or 404

---

## Task 7: Clean up Vercel API files

Do this only after confirming production works in Task 6.

**Files:**
- Delete: `api/analyze.js`
- Delete: `api/market.js`
- Modify: `vercel.json`

- [ ] **Step 1: Delete the old API files**

```bash
rm api/analyze.js api/market.js
```

- [ ] **Step 2: Update `vercel.json` to remove the functions block**

Current `vercel.json`:
```json
{
  "framework": "vite",
  "devCommand": "vite --port $PORT",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
  "functions": {
    "api/market.js": { "maxDuration": 10 }
  }
}
```

Replace with:
```json
{
  "framework": "vite",
  "devCommand": "vite --port $PORT",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

(The rewrite pattern also simplifies — no longer needs to exclude `/api/` paths.)

- [ ] **Step 3: Commit and push**

```bash
git add api/ vercel.json
git commit -m "chore: remove Vercel API functions — replaced by Cloudflare Worker"
git push
```

- [ ] **Step 4: Final production verification**

Open https://options-advisor-sepia.vercel.app and run one more analysis to confirm nothing broke after the cleanup.
