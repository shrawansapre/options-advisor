import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ScannerInput({ onScan, loading, filters, onFiltersChange, onReset }) {
  const [input, setInput] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (sym) onScan(sym);
  }

  function setFilter(key, value) {
    onFiltersChange(f => ({ ...f, [key]: value }));
  }

  return (
    <div className="scanner-input-wrap">
      <div className="scanner-header-row">
        <h1 className="scanner-title">Scanner</h1>
        <button
          type="button"
          className="scanner-filter-toggle"
          onClick={() => setFiltersOpen(o => !o)}
        >
          Filters {filtersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      <form className="scanner-search-bar" onSubmit={handleSubmit}>
        <input
          className="scanner-search-input"
          type="text"
          placeholder="Enter ticker…"
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 10))}
          disabled={loading}
          autoComplete="off"
          spellCheck="false"
        />
        <button className="scanner-search-btn" type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Scanning…' : 'Scan'}
        </button>
      </form>

      {filtersOpen && (
        <div className="scanner-filters">
          <div className="scanner-filter-group">
            <label className="scanner-filter-label">Side</label>
            <div className="scanner-seg">
              {['both', 'call', 'put'].map(s => (
                <button
                  key={s}
                  type="button"
                  className={`scanner-seg-btn${filters.side === s ? ' scanner-seg-btn--active' : ''}`}
                  onClick={() => setFilter('side', s)}
                >
                  {s === 'both' ? 'Both' : s === 'call' ? 'Calls' : 'Puts'}
                </button>
              ))}
            </div>
          </div>
          <div className="scanner-filter-row">
            <div className="scanner-filter-group">
              <label className="scanner-filter-label">Min Volume</label>
              <input type="number" className="scanner-filter-input" value={filters.minVolume} min="0"
                onChange={e => setFilter('minVolume', Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            <div className="scanner-filter-group">
              <label className="scanner-filter-label">Min Vol/OI</label>
              <input type="number" className="scanner-filter-input" value={filters.minVolOiRatio} min="0" step="0.1"
                onChange={e => setFilter('minVolOiRatio', Math.max(0, parseFloat(e.target.value) || 0))} />
            </div>
          </div>
          <div className="scanner-filter-row">
            <div className="scanner-filter-group">
              <label className="scanner-filter-label">Min DTE</label>
              <input type="number" className="scanner-filter-input" value={filters.minDte} min="0"
                onChange={e => setFilter('minDte', Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            <div className="scanner-filter-group">
              <label className="scanner-filter-label">Max DTE</label>
              <input type="number" className="scanner-filter-input" value={filters.maxDte} min="1"
                onChange={e => setFilter('maxDte', Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
          </div>
          <div className="scanner-filter-row">
            <div className="scanner-filter-group">
              <label className="scanner-filter-label">Min |Δ|</label>
              <input type="number" className="scanner-filter-input" value={filters.deltaMin} min="0" max="1" step="0.01"
                onChange={e => setFilter('deltaMin', Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))} />
            </div>
            <div className="scanner-filter-group">
              <label className="scanner-filter-label">Max |Δ|</label>
              <input type="number" className="scanner-filter-input" value={filters.deltaMax} min="0" max="1" step="0.01"
                onChange={e => setFilter('deltaMax', Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))} />
            </div>
          </div>
          <button type="button" className="scanner-reset-btn" onClick={onReset}>
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
