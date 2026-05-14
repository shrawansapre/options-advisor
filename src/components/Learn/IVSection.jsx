function IVGauge({ pct = 50 }) {
  const cx = 60, cy = 62, r = 44;
  const toXY = (deg, radius = r) => ({
    x: cx + radius * Math.cos((deg * Math.PI) / 180),
    y: cy + radius * Math.sin((deg * Math.PI) / 180),
  });
  const start = toXY(180);
  const seg1  = toXY(240);
  const seg2  = toXY(300);
  const end   = toXY(360);
  const needleDeg = 180 + 180 * (pct / 100);
  const np = toXY(needleDeg, r - 8);
  const largeFill = (180 * pct / 100) > 180 ? 1 : 0;
  const color = pct < 33 ? "var(--green)" : pct < 66 ? "var(--amber-ui)" : "var(--red)";

  return (
    <svg viewBox="0 0 120 70" className="learn-iv-gauge" aria-hidden="true">
      <path d={`M${start.x},${start.y} A${r},${r} 0 0,1 ${seg1.x},${seg1.y}`} fill="none" stroke="var(--green)"    strokeWidth="6" strokeLinecap="round" opacity="0.35" />
      <path d={`M${seg1.x},${seg1.y} A${r},${r} 0 0,1 ${seg2.x},${seg2.y}`} fill="none" stroke="var(--amber-ui)"  strokeWidth="6" strokeLinecap="round" opacity="0.35" />
      <path d={`M${seg2.x},${seg2.y} A${r},${r} 0 0,1 ${end.x},${end.y}`}   fill="none" stroke="var(--red)"       strokeWidth="6" strokeLinecap="round" opacity="0.35" />
      {pct > 0 && (
        <path d={`M${start.x},${start.y} A${r},${r} 0 ${largeFill},1 ${np.x},${np.y}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      )}
      <line x1={cx} y1={cy} x2={np.x} y2={np.y} stroke="var(--t1)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="var(--t1)" />
      <text x={cx} y={cy - 14} textAnchor="middle" fontFamily="var(--serif)" fontStyle="italic" fontSize="13" fontWeight="500" fill="var(--t1)">{pct}</text>
      <text x={cx} y={cy - 4}  textAnchor="middle" fontFamily="var(--mono)"  fontSize="5.5" fill="var(--t3)">IV RANK</text>
      <text x="14" y="68" fontFamily="var(--mono)" fontSize="7" fill="var(--t3)">Low</text>
      <text x="88" y="68" fontFamily="var(--mono)" fontSize="7" fill="var(--t3)">High</text>
    </svg>
  );
}

function Analogy({ children }) {
  return (
    <div className="learn-analogy">
      <span className="learn-analogy-icon">◈</span>
      <span>{children}</span>
    </div>
  );
}

export default function IVSection() {
  return (
    <div className="learn-grid">
      <div className="learn-card learn-card--wide">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--violet">Implied Volatility (IV)</span>
        </div>
        <p className="learn-body">IV is the market's forecast of how much a stock <em>will</em> move over the next year, expressed as a percentage. It's derived from current option prices — not historical data. High IV = expensive options. Low IV = cheap options.</p>
        <Analogy>IV is a storm forecast. If meteorologists say a hurricane is coming, hotel prices near the coast triple. When traders expect big moves, option premiums explode — even before the stock does anything.</Analogy>
        <div className="learn-iv-bars">
          {[
            { ticker: "NVDA", pct: 72, label: "72% — Expensive", color: "var(--red)" },
            { ticker: "AAPL", pct: 28, label: "28% — Moderate",  color: "var(--amber-ui)" },
            { ticker: "SPY",  pct: 18, label: "18% — Cheap",      color: "var(--green)" },
          ].map(r => (
            <div key={r.ticker} className="learn-iv-row">
              <span className="learn-iv-ticker">{r.ticker}</span>
              <div className="learn-iv-track"><div className="learn-iv-fill" style={{ width: `${r.pct}%`, background: r.color }} /></div>
              <span className="learn-iv-label">{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="learn-card learn-card--wide">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--navy">IV Rank</span>
          <span className="learn-card-sub">Is IV cheap or expensive right now?</span>
        </div>
        <p className="learn-body">IV Rank measures where current IV sits within its 52-week range: <strong>(Current IV − 52wk Low) / (52wk High − 52wk Low) × 100</strong>. An IV Rank of 80 means current IV is 80% of the way from its yearly low to its yearly high — near the top of its historical range.</p>
        <Analogy>IV Rank is like checking if a flight is a good deal. A $400 ticket means nothing without context. If that route usually costs $150–$500, you're near the expensive end. If it usually costs $350–$600, you're getting a bargain.</Analogy>
        <div className="learn-gauge-row">
          {[
            { pct: 12, label: "Buy options — IV cheap vs history", color: "var(--green)" },
            { pct: 50, label: "Neutral — no edge either way",       color: "var(--t3)" },
            { pct: 84, label: "Sell premium — IV rich vs history",  color: "var(--red)" },
          ].map((g, i) => (
            <div key={i} className="learn-gauge-block">
              <IVGauge pct={g.pct} />
              <p className="learn-gauge-label" style={{ color: g.color }}>{g.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
