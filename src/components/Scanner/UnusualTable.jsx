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
      <div className="scanner-table-scroll">
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
    </div>
  );
}
