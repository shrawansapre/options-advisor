export function findUnusualContracts(contracts, opts = {}) {
  const {
    minVolume = 500,
    minVolOiRatio = 2.0,
    minDte = 7,
    maxDte = 120,
    deltaMin = 0.10,
    deltaMax = 0.50,
    side = 'both',
  } = opts;

  return contracts
    .filter(c => side === 'both' || c.side === side)
    .map(c => {
      const oi = Math.max(parseInt(c.openInterest, 10) || 0, 1);
      const vol = parseInt(c.volume, 10) || 0;
      const delta = Math.abs(parseFloat(c.delta) || 0);
      return { ...c, _vol: vol, _volOi: vol / oi, _absDelta: delta };
    })
    .filter(c =>
      c._vol > minVolume &&
      c._volOi > minVolOiRatio &&
      c.dte >= minDte &&
      c.dte <= maxDte &&
      c._absDelta >= deltaMin &&
      c._absDelta <= deltaMax
    )
    .sort((a, b) => b._vol - a._vol);
}

export function callPutRatio(contracts) {
  const calls = contracts.filter(c => c.side === 'call');
  const puts = contracts.filter(c => c.side === 'put');
  const cVol = calls.reduce((s, c) => s + (parseInt(c.volume, 10) || 0), 0);
  const pVol = puts.reduce((s, c) => s + (parseInt(c.volume, 10) || 0), 0);
  return { callVolume: cVol, putVolume: pVol, ratio: cVol / Math.max(pVol, 1) };
}

export function flowSentiment(ratio) {
  if (ratio > 2.0) return { label: 'Bullish flow', tone: 'bullish' };
  if (ratio < 0.5) return { label: 'Bearish flow', tone: 'bearish' };
  return { label: 'Mixed flow', tone: 'neutral' };
}

export function unusualTilt(unusualContracts) {
  const cVol = unusualContracts
    .filter(c => c.side === 'call')
    .reduce((s, c) => s + (parseInt(c.volume, 10) || 0), 0);
  const pVol = unusualContracts
    .filter(c => c.side === 'put')
    .reduce((s, c) => s + (parseInt(c.volume, 10) || 0), 0);
  const total = cVol + pVol;
  return total === 0
    ? { callPct: 0, putPct: 0 }
    : { callPct: (cVol / total) * 100, putPct: (pVol / total) * 100 };
}
