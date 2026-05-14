export const config = { runtime: 'nodejs', maxDuration: 10 };

// Best-effort deduplication for warm serverless instances; misses on cold starts
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

// marketdata.app returns columnar arrays — all field values at same index belong to same option
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  const ticker = sanitizeTicker(req.query?.ticker ?? new URL(req.url, 'http://localhost').searchParams.get('ticker'));

  if (!ticker) {
    res.status(400).json({ error: 'ticker_required' });
    return;
  }

  const key = cacheKey(ticker);
  if (cache.has(key)) {
    res.status(200).json(cache.get(key));
    return;
  }

  const token = process.env.MARKET_DATA_TOKEN;
  if (!token) {
    res.status(200).json({ error: 'market_data_unavailable' });
    return;
  }

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
    const expirations = allExpirations.length <= 3
      ? allExpirations
      : [allExpirations[0], allExpirations[1], allExpirations[allExpirations.length - 1]];

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

    res.status(200).json(result);
  } catch {
    res.status(200).json({ error: 'market_data_unavailable' });
  }
}
