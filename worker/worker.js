const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001']);
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

    // Tiered selection: 2 near (7–45d), 2 mid (45–120d), 2 far (120–365d)
    // Covers event plays, standard trades, and conservative LEAPS.
    const withDTE = allExpirations.map(exp => ({ exp, dte: daysToExpiry(exp) }));
    const pick = (min, max, n) => withDTE.filter(e => e.dte >= min && e.dte < max).slice(0, n).map(e => e.exp);
    const tiered = [...pick(7, 45, 2), ...pick(45, 120, 2), ...pick(120, 365, 2)];
    const selected = (tiered.length > 0 ? tiered : allExpirations.slice(0, 6)).sort();

    // Use from/to range (tested, reliable) — extractChains filters to selected dates only
    const from = selected[0];
    const to = selected[selected.length - 1];
    const chainRes = await fetch(
      `${base}/options/chain/${ticker}/?from=${from}&to=${to}&strikeLimit=10&delta=.05-.95`,
      { headers }
    );
    if (!chainRes.ok) throw new Error('chain fetch failed');
    let chains = extractChains(await chainRes.json(), quote.last, selected);

    // After a large intraday move (e.g. earnings gap), delta values in the chain can be stale,
    // causing all returned strikes to be far from the current price. Detect this and retry
    // using an explicit price-anchored strike range so the chain stays usable.
    const chainsHaveATM = chains.some(c =>
      c.options.some(o => o.strike >= quote.last * 0.90 && o.strike <= quote.last * 1.10)
    );
    if (!chainsHaveATM && chains.length > 0) {
      const strikeFrom = Math.round(quote.last * 0.85);
      const strikeTo = Math.round(quote.last * 1.15);
      const retryRes = await fetch(
        `${base}/options/chain/${ticker}/?from=${from}&to=${to}&strikeLimit=10&strike=${strikeFrom}-${strikeTo}`,
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
