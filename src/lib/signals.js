// Pure Tier-1 unusual-activity + valuation math.
// Framework-free ESM. Imported by BOTH the client and the Cloudflare Worker.
// Contracts have no `last` field — always price off mid = (bid+ask)/2.

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export function mid(c) {
  const b = num(c?.bid);
  const a = num(c?.ask);
  if (b === null || a === null) return null;
  return (b + a) / 2;
}

export function dollarVolume(c) {
  const m = mid(c);
  const v = num(c?.volume) ?? 0;
  if (m === null || v <= 0) return 0;
  return v * m * 100;
}

export function probITM(c) {
  const d = num(c?.delta);
  return d === null ? 0 : Math.abs(d);
}

export function expectedMove(price, ivDecimal, dte) {
  const p = num(price), iv = num(ivDecimal), t = num(dte);
  if (p === null || iv === null || t === null || p <= 0 || t < 0) return 0;
  return p * iv * Math.sqrt(t / 365);
}

export function spreadCost(c) {
  const m = mid(c);
  const b = num(c?.bid);
  const a = num(c?.ask);
  if (m === null || m === 0 || b === null || a === null) return null;
  return (a - b) / m;
}

export function netPremium(contracts) {
  let callDollars = 0;
  let putDollars = 0;
  for (const c of contracts ?? []) {
    const d = dollarVolume(c);
    if (c.side === "call") callDollars += d;
    else if (c.side === "put") putDollars += d;
  }
  const net = callDollars - putDollars;
  const total = callDollars + putDollars;
  let tone = "neutral";
  if (total > 0) {
    const ratio = net / total;
    if (ratio > 0.2) tone = "bullish";
    else if (ratio < -0.2) tone = "bearish";
  }
  return { callDollars, putDollars, net, tone };
}

export function rankLeaderboard(contracts) {
  return (contracts ?? [])
    .map((c) => ({ ...c, _dollarVol: dollarVolume(c) }))
    .sort((a, b) => b._dollarVol - a._dollarVol);
}
