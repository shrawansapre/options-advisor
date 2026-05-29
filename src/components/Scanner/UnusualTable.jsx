import { useState } from 'react';
import ContractRow from './ContractRow';

const COLS = [
  { key: 'strike',       label: 'Strike' },
  { key: 'expiration',   label: 'Exp' },
  { key: 'side',         label: 'C/P' },
  { key: 'volume',       label: 'Vol' },
  { key: 'openInterest', label: 'OI' },
  { key: '_volOi',       label: 'Vol/OI' },
  { key: 'iv',           label: 'IV' },
  { key: 'delta',        label: 'Δ' },
  { key: 'last',         label: 'Last' },
  { key: 'bid',          label: 'Bid/Ask' },
];

function numVal(c, key) {
  if (key === '_volOi') return c._volOi ?? 0;
  if (key === 'side') return c.side === 'call' ? 1 : 0;
  return parseFloat(c[key]) || 0;
}

function ContractCard({ contract: c }) {
  const [expanded, setExpanded] = useState(false);
  const sideKey = c.side === 'call' ? 'call' : 'put';
  const strike = c.strike != null ? `$${parseFloat(c.strike).toFixed(0)}` : '—';
  const exp = c.expiration ? c.expiration.slice(5).replace('-', '/') : '—';
  const volOi = c._volOi != null ? `${c._volOi.toFixed(1)}×` : '—';
  const vol = c.volume != null ? c.volume.toLocaleString() : '—';
  const oi = c.openInterest != null ? c.openInterest.toLocaleString() : '—';
  const iv = c.iv != null ? `${(parseFloat(c.iv) * 100).toFixed(1)}%` : '—';
  const delta = c.delta != null ? parseFloat(c.delta).toFixed(2) : '—';
  const gamma = c.gamma != null ? parseFloat(c.gamma).toFixed(4) : '—';
  const theta = c.theta != null ? parseFloat(c.theta).toFixed(4) : '—';
  const vega = c.vega != null ? parseFloat(c.vega).toFixed(4) : '—';

  return (
    <div
      className={`scanner-contract-card scanner-contract-card--${sideKey}`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="scanner-contract-card__top">
        <div className="scanner-contract-card__id">
          <span className={`scanner-side-badge scanner-side-badge--${sideKey}`}>
            {sideKey === 'call' ? 'C' : 'P'}
          </span>
          <span className="scanner-contract-card__strike">{strike}</span>
          <span className="scanner-contract-card__exp">{exp}</span>
        </div>
        <span className="scanner-contract-card__voloi">{volOi}</span>
      </div>
      <div className="scanner-contract-card__stats">
        <span className="scanner-contract-card__stat">
          <span className="scanner-contract-card__stat-label">Vol </span>{vol}
        </span>
        <span className="scanner-contract-card__stat">
          <span className="scanner-contract-card__stat-label">OI </span>{oi}
        </span>
        <span className="scanner-contract-card__stat">
          <span className="scanner-contract-card__stat-label">IV </span>{iv}
        </span>
      </div>
      {expanded && (
        <div className="scanner-contract-card__greeks">
          <span><span className="scanner-greek-label">Δ</span> {delta}</span>
          <span><span className="scanner-greek-label">Γ</span> {gamma}</span>
          <span><span className="scanner-greek-label">Θ</span> {theta}</span>
          <span><span className="scanner-greek-label">ν</span> {vega}</span>
          <span><span className="scanner-greek-label">DTE</span> {c.dte ?? '—'}</span>
        </div>
      )}
    </div>
  );
}

export default function UnusualTable({ contracts, tilt, onLowerThresholds, ticker }) {
  const [sortKey, setSortKey] = useState('volume');
  const [sortDir, setSortDir] = useState('desc');

  function toggleSort(key) {
    if (key === 'bid') return;
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...contracts].sort((a, b) => {
    const av = numVal(a, sortKey);
    const bv = numVal(b, sortKey);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  if (contracts.length === 0) {
    return (
      <div className="scanner-empty-results">
        <p>No unusual activity in {ticker} at these thresholds. Try lowering Min Vol/OI or widening the DTE range.</p>
        <button className="scanner-lower-btn" onClick={onLowerThresholds}>
          Lower thresholds
        </button>
      </div>
    );
  }

  return (
    <div className="scanner-table-wrap">
      <div className="scanner-table-header">
        <span className="scanner-table-title">Unusual contracts</span>
        <span className="scanner-table-count">{contracts.length} found</span>
        {tilt && tilt.callPct + tilt.putPct > 0 && (
          <span className="scanner-tilt">
            Calls {tilt.callPct.toFixed(0)}% · Puts {tilt.putPct.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Desktop: scrollable table */}
      <div className="scanner-table-scroll scanner-desktop-table">
        <table className="unusual-table">
          <thead>
            <tr>
              {COLS.map(col => (
                <th
                  key={col.key}
                  className={`unusual-table__th${sortKey === col.key ? ' unusual-table__th--sorted' : ''}`}
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="unusual-table__sort-arrow">{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <ContractRow key={`${c.expiration}-${c.strike}-${c.side}-${i}`} contract={c} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="scanner-mobile-cards">
        {sorted.map((c, i) => (
          <ContractCard key={`${c.expiration}-${c.strike}-${c.side}-${i}`} contract={c} />
        ))}
      </div>
    </div>
  );
}
