import { useState } from 'react';

export default function ContractRow({ contract: c }) {
  const [expanded, setExpanded] = useState(false);

  const iv = c.iv != null ? `${(parseFloat(c.iv) * 100).toFixed(1)}%` : '—';
  const delta = c.delta != null ? parseFloat(c.delta).toFixed(2) : '—';
  const volOi = c._volOi != null ? `${c._volOi.toFixed(1)}×` : '—';
  const bid = c.bid != null ? c.bid.toFixed(2) : '—';
  const ask = c.ask != null ? c.ask.toFixed(2) : '—';
  const last = c.last != null ? `$${parseFloat(c.last).toFixed(2)}` : '—';
  const strike = c.strike != null ? `$${parseFloat(c.strike).toFixed(2)}` : '—';
  const exp = c.expiration ? c.expiration.slice(5).replace('-', '/') : '—';
  const sideKey = c.side === 'call' ? 'call' : 'put';

  return (
    <>
      <tr
        className={`unusual-table__row unusual-table__row--${sideKey}`}
        onClick={() => setExpanded(e => !e)}
      >
        <td className="unusual-table__td unusual-table__td--mono">{strike}</td>
        <td className="unusual-table__td unusual-table__td--mono">{exp}</td>
        <td className="unusual-table__td">
          <span className={`scanner-side-badge scanner-side-badge--${sideKey}`}>
            {sideKey === 'call' ? 'C' : 'P'}
          </span>
        </td>
        <td className="unusual-table__td unusual-table__td--mono unusual-table__td--hl">
          {c.volume?.toLocaleString() ?? '—'}
        </td>
        <td className="unusual-table__td unusual-table__td--mono">
          {c.openInterest?.toLocaleString() ?? '—'}
        </td>
        <td className="unusual-table__td unusual-table__td--mono unusual-table__td--hl">
          {volOi}
        </td>
        <td className="unusual-table__td unusual-table__td--mono">{iv}</td>
        <td className="unusual-table__td unusual-table__td--mono">{delta}</td>
        <td className="unusual-table__td unusual-table__td--mono">{last}</td>
        <td className="unusual-table__td unusual-table__td--mono unusual-table__td--bidask">
          {bid}/{ask}
        </td>
      </tr>
      {expanded && (
        <tr className="unusual-table__expand-row">
          <td colSpan={10} className="unusual-table__expand-cell">
            <div className="scanner-greeks">
              <span>
                <span className="scanner-greek-label">Γ</span>{' '}
                {c.gamma != null ? parseFloat(c.gamma).toFixed(4) : '—'}
              </span>
              <span>
                <span className="scanner-greek-label">Θ</span>{' '}
                {c.theta != null ? parseFloat(c.theta).toFixed(4) : '—'}
              </span>
              <span>
                <span className="scanner-greek-label">ν</span>{' '}
                {c.vega != null ? parseFloat(c.vega).toFixed(4) : '—'}
              </span>
              <span>
                <span className="scanner-greek-label">DTE</span>{' '}
                {c.dte ?? '—'}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
