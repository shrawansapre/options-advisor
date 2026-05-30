import { findUnusualContracts } from "../src/utils/unusualSignals.js";
import { rankLeaderboard, netPremium } from "../src/lib/signals.js";

const UNIVERSE = [
  "SPY","QQQ","IWM","AAPL","MSFT","NVDA","AMZN","META","GOOGL","TSLA",
  "AMD","NFLX","AVGO","JPM","BAC","XLF","DIA","SMH","COIN","PLTR",
  "MU","INTC","BABA","DIS","UBER","SHOP","SOFI","MARA","RIOT","ARKK",
  "GLD","SLV","XLE","XOM","BA","CAT","WMT","COST","CRM","ORCL",
];

const DISCOVER_FRESH_MS = 30 * 60 * 1000;

const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001']);
const MAX_TOKENS_LIMIT = 16000;

const ALLOWED_ORIGINS = new Set([
  'https://options-advisor-sepia.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8787',
]);

// Staging only: one extra allowed origin (the Vercel preview URL), supplied via the
// `ALLOWED_ORIGIN_EXTRA` env var on the staging worker. Captured lazily on first request.
// Production never sets this var, so its allowlist stays exactly as above.
let EXTRA_ORIGIN = null;

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin) || (EXTRA_ORIGIN !== null && origin === EXTRA_ORIGIN);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'https://options-advisor-sepia.vercel.app',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Internal-Token',
    'Vary': 'Origin',
  };
}

function checkToken(req, env) {
  if (!env.INTERNAL_TOKEN) return true;
  return req.headers.get('X-Internal-Token') === env.INTERNAL_TOKEN;
}

function json(data, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

function text(body, origin, status = 200) {
  return new Response(body, { status, headers: corsHeaders(origin) });
}

// ─── Analyze handler ──────────────────────────────────────────────────────────

async function handleAnalyze(req, env) {
  const origin = req.headers.get('Origin') || '';
  if (req.method !== 'POST') return text('Method not allowed', origin, 405);
  if (!checkToken(req, env)) return text('Forbidden', origin, 403);

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: { message: 'ANTHROPIC_API_KEY not configured' } }, origin, 500);

  let body;
  try { body = await req.json(); } catch { return text('Invalid JSON', origin, 400); }

  if (!ALLOWED_MODELS.has(body.model)) return text('Forbidden', origin, 403);
  if (!body.max_tokens || body.max_tokens > MAX_TOKENS_LIMIT) return text('Forbidden', origin, 403);

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('handleAnalyze upstream error:', err?.message ?? err);
    return json({ error: { message: 'Failed to reach Anthropic API' } }, 502);
  }

  if (!upstream.ok) {
    console.error('handleAnalyze upstream status:', upstream.status);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...corsHeaders(origin),
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
  const origin = req.headers.get('Origin') || '';
  if (req.method !== 'GET') return text('Method not allowed', origin, 405);
  if (!checkToken(req, env)) return text('Forbidden', origin, 403);

  const url = new URL(req.url);
  const ticker = sanitizeTicker(url.searchParams.get('ticker'));
  if (!ticker) return json({ error: 'ticker_required' }, origin, 400);

  const chainMode = url.searchParams.get('chain'); // 'full' | null
  const cacheKeySuffix = chainMode === 'full' ? ':full' : '';
  const key = cacheKey(ticker) + cacheKeySuffix;

  const cached = env.MARKET_CACHE
    ? await env.MARKET_CACHE.get(key, 'json')
    : (cache.has(key) ? cache.get(key) : null);
  if (cached) return json(cached, origin);

  const token = env.MARKET_DATA_TOKEN;
  if (!token) return json({ error: 'market_data_unavailable' }, origin);

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

    let selected, strikeParam, deltaParam;

    if (chainMode === 'full') {
      // Scanner mode: all expirations 7–120 DTE, wider strikes, no delta filter
      const withDTE = allExpirations.map(exp => ({ exp, dte: daysToExpiry(exp) }));
      selected = withDTE
        .filter(e => e.dte >= 7 && e.dte <= 120)
        .map(e => e.exp)
        .sort();
      if (selected.length === 0) {
        const withDTE2 = allExpirations.map(exp => ({ exp, dte: daysToExpiry(exp) }));
        selected = withDTE2.filter(e => e.dte >= 1 && e.dte <= 180).map(e => e.exp).sort();
        if (selected.length === 0) selected = allExpirations.slice(0, 10).sort();
      }
      strikeParam = 'strikeLimit=20';
      deltaParam = ''; // no delta filter
    } else {
      // Pipeline mode: tiered 6 expiries (unchanged)
      const withDTE = allExpirations.map(exp => ({ exp, dte: daysToExpiry(exp) }));
      const pick = (min, max, n) => withDTE.filter(e => e.dte >= min && e.dte < max).slice(0, n).map(e => e.exp);
      const tiered = [...pick(7, 45, 2), ...pick(45, 120, 2), ...pick(120, 365, 2)];
      selected = (tiered.length > 0 ? tiered : allExpirations.slice(0, 6)).sort();
      strikeParam = 'strikeLimit=10';
      deltaParam = '&delta=.05-.95';
    }

    const from = selected[0];
    const to = selected[selected.length - 1];
    const chainRes = await fetch(
      `${base}/options/chain/${ticker}/?from=${from}&to=${to}&${strikeParam}${deltaParam}`,
      { headers }
    );
    if (!chainRes.ok) throw new Error('chain fetch failed');
    let chains = extractChains(await chainRes.json(), quote.last, selected);

    // ATM retry: detect stale delta (no strike within 10% of current price)
    const chainsHaveATM = chains.some(c =>
      c.options.some(o => o.strike >= quote.last * 0.90 && o.strike <= quote.last * 1.10)
    );
    if (!chainsHaveATM && chains.length > 0) {
      const strikeFrom = Math.round(quote.last * 0.85);
      const strikeTo = Math.round(quote.last * 1.15);
      const retryRes = await fetch(
        `${base}/options/chain/${ticker}/?from=${from}&to=${to}&${strikeParam}&strike=${strikeFrom}-${strikeTo}`,
        { headers, signal: AbortSignal.timeout(4000) }
      );
      if (retryRes.ok) {
        const retryChains = extractChains(await retryRes.json(), quote.last, selected);
        if (retryChains.length > 0) chains = retryChains;
      }
    }

    const result = {
      ticker,
      quote,
      ivRank: null,
      ivCurrent: extractIvCurrent(chains, quote.last),
      chains,
      fetchedAt: new Date().toISOString(),
    };

    if (env.MARKET_CACHE) {
      await env.MARKET_CACHE.put(key, JSON.stringify(result), { expirationTtl: 120 });
    } else {
      if (cache.size > 500) cache.clear();
      cache.set(key, result);
    }
    return json(result, origin);
  } catch (err) {
    console.error('handleMarket error:', err?.message ?? err);
    return json({ error: 'market_data_unavailable' }, origin);
  }
}

// ─── Discover handler ─────────────────────────────────────────────────────────

async function fetchChainContracts(ticker, env) {
  const token = env.MARKET_DATA_TOKEN;
  if (!token) return null;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const base = "https://api.marketdata.app/v1";
  try {
    const [quoteRes, expRes] = await Promise.all([
      fetch(`${base}/stocks/quotes/${ticker}/`, { headers }),
      fetch(`${base}/options/expirations/${ticker}/`, { headers }),
    ]);
    if (!quoteRes.ok || !expRes.ok) return null;
    const [quoteData, expData] = await Promise.all([quoteRes.json(), expRes.json()]);
    const quote = extractQuote(quoteData);
    const allExpirations = extractExpirations(expData);
    if (!quote || !allExpirations.length) return null;

    const withDTE = allExpirations.map((exp) => ({ exp, dte: daysToExpiry(exp) }));
    const selected = withDTE.filter((e) => e.dte >= 7 && e.dte <= 120).map((e) => e.exp).sort();
    if (!selected.length) return null;
    const from = selected[0], to = selected[selected.length - 1];
    const chainRes = await fetch(
      `${base}/options/chain/${ticker}/?from=${from}&to=${to}&strikeLimit=20`,
      { headers, signal: AbortSignal.timeout(8000) }
    );
    if (!chainRes.ok) return null;
    const chains = extractChains(await chainRes.json(), quote.last, selected);
    return chains.flatMap((chain) =>
      (chain.options ?? []).map((opt) => ({
        ...opt, side: opt.type, expiration: chain.expiry, dte: chain.daysToExpiry, ticker,
      }))
    );
  } catch {
    return null;
  }
}

async function sweepUniverse(env) {
  const results = await Promise.allSettled(UNIVERSE.map((t) => fetchChainContracts(t, env)));
  const prints = [];
  for (const r of results) {
    if (r.status !== "fulfilled" || !r.value) continue;
    const unusual = findUnusualContracts(r.value);
    for (const c of unusual) prints.push(c);
  }
  const ranked = rankLeaderboard(prints).slice(0, 50);
  const flow = netPremium(prints);
  return { prints: ranked, flow, sweptAt: new Date().toISOString(), universeSize: UNIVERSE.length };
}

async function handleDiscover(req, env) {
  const origin = req.headers.get("Origin") || "";
  if (req.method !== "GET") return text("Method not allowed", origin, 405);
  if (!checkToken(req, env)) return text("Forbidden", origin, 403);

  const url = new URL(req.url);
  const force = url.searchParams.get("refresh") === "1";
  const key = "discover:leaderboard";

  if (!force && env.MARKET_CACHE) {
    const cached = await env.MARKET_CACHE.get(key, "json");
    if (cached && Date.now() - new Date(cached.sweptAt).getTime() < DISCOVER_FRESH_MS) {
      return json({ ...cached, stale: false }, origin);
    }
  }

  const fresh = await sweepUniverse(env);
  if (!fresh.prints.length && env.MARKET_CACHE) {
    const lastGood = await env.MARKET_CACHE.get(key, "json");
    if (lastGood) return json({ ...lastGood, stale: true }, origin);
  }
  if (env.MARKET_CACHE) {
    await env.MARKET_CACHE.put(key, JSON.stringify(fresh), { expirationTtl: 86400 });
  }
  return json({ ...fresh, stale: false }, origin);
}

// ─── Analysis cache handler ───────────────────────────────────────────────────

function analysisCacheKey(ticker) {
  const d = new Date();
  const date = d.toISOString().slice(0, 10); // per trading day
  return `analysis:${ticker.toUpperCase()}:${date}`;
}

async function handleAnalysisCache(req, env) {
  const origin = req.headers.get("Origin") || "";
  if (!checkToken(req, env)) return text("Forbidden", origin, 403);
  if (!env.MARKET_CACHE) return json({ hit: false }, origin);

  const url = new URL(req.url);
  const ticker = sanitizeTicker(url.searchParams.get("ticker"));
  if (!ticker) return json({ error: "ticker_required" }, origin, 400);
  const key = analysisCacheKey(ticker);

  if (req.method === "GET") {
    const cached = await env.MARKET_CACHE.get(key, "json");
    return json(cached ? { hit: true, result: cached } : { hit: false }, origin);
  }
  if (req.method === "PUT") {
    // Anti-poisoning: cap size + validate shape before trusting a client-supplied result.
    const raw = await req.text();
    if (raw.length > 262144) return text("Payload too large", origin, 413); // 256 KB cap
    let body;
    try { body = JSON.parse(raw); } catch { return text("Invalid JSON", origin, 400); }
    const result = body?.result;
    const valid = result && Array.isArray(result.trades) && result.trades.length > 0
      && typeof result.disclaimer === "string";
    if (!valid) return text("Invalid result shape", origin, 422);
    await env.MARKET_CACHE.put(key, JSON.stringify(result), { expirationTtl: 86400 });
    return json({ ok: true }, origin);
  }
  return text("Method not allowed", origin, 405);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(req, env) {
    if (EXTRA_ORIGIN === null && env.ALLOWED_ORIGIN_EXTRA) EXTRA_ORIGIN = env.ALLOWED_ORIGIN_EXTRA;
    const origin = req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    const { pathname } = new URL(req.url);
    if (pathname === '/analyze') return handleAnalyze(req, env);
    if (pathname === '/market') return handleMarket(req, env);
    if (pathname === '/discover') return handleDiscover(req, env);
    if (pathname === '/analysis-cache') return handleAnalysisCache(req, env);
    return new Response('Not found', { status: 404, headers: corsHeaders(origin) });
  },
};
