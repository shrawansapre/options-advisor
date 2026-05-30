export default function ScannerSummary({ quote, ticker, ivCurrent, cpRatio, sentiment, unusualCount, onScrollToTable }) {
  const price = quote?.last;
  const change = quote?.changePercent;
  const changeSign = change != null && change >= 0 ? '+' : '';
  const changeClass = change > 0 ? 'bullish' : change < 0 ? 'bearish' : 'neutral';

  return (
    <div className="scanner-summary">
      <div className="scanner-summary__item">
        <div className="scanner-summary__label">Price</div>
        <div className="scanner-summary__price">
          {price != null ? `$${price.toFixed(2)}` : '—'}
        </div>
        {change != null && (
          <div className={`scanner-summary__change scanner-summary__change--${changeClass}`}>
            {changeSign}{change.toFixed(2)}%
          </div>
        )}
        <div className="scanner-summary__sub">{ticker}</div>
      </div>

      <div className="scanner-summary__item">
        <div className="scanner-summary__label">IV Current</div>
        <div className="scanner-summary__value">
          {ivCurrent != null ? `${(ivCurrent * 100).toFixed(1)}%` : '—'}
        </div>
        <div className="scanner-summary__sub">ATM avg</div>
      </div>

      <div className="scanner-summary__item">
        <div className="scanner-summary__label">C/P Ratio</div>
        <div className="scanner-summary__value">
          {cpRatio ? cpRatio.ratio.toFixed(2) : '—'}
        </div>
        {sentiment && (
          <span className={`scanner-badge scanner-badge--${sentiment.tone}`}>
            {sentiment.label}
          </span>
        )}
      </div>

      <div className="scanner-summary__item">
        <div className="scanner-summary__label">Unusual Contracts</div>
        <button className="scanner-unusual-count" onClick={onScrollToTable}>
          {unusualCount}
        </button>
        <div className="scanner-summary__sub">vol/OI signals</div>
      </div>
    </div>
  );
}
