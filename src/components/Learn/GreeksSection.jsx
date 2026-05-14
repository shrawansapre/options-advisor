function DeltaViz() {
  return (
    <svg viewBox="0 0 56 38" className="learn-greek-viz" aria-hidden="true">
      <line x1="4" y1="34" x2="52" y2="34" stroke="var(--border)" strokeWidth="1" />
      <polyline points="4,34 28,20 52,8" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" />
      <polygon points="49,5 56,11 52,8" fill="var(--navy)" />
    </svg>
  );
}
function ThetaViz() {
  return (
    <svg viewBox="0 0 56 38" className="learn-greek-viz" aria-hidden="true">
      <line x1="4" y1="6" x2="4" y2="34" stroke="var(--border)" strokeWidth="1" />
      <line x1="4" y1="34" x2="52" y2="34" stroke="var(--border)" strokeWidth="1" />
      <path d="M4,8 C16,9 28,15 38,24 C44,29 50,33 52,34" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function GammaViz() {
  return (
    <svg viewBox="0 0 56 38" className="learn-greek-viz" aria-hidden="true">
      <line x1="4" y1="34" x2="52" y2="34" stroke="var(--border)" strokeWidth="1" />
      <path d="M4,32 Q28,4 52,32" fill="none" stroke="var(--amber-ui)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function VegaViz() {
  return (
    <svg viewBox="0 0 56 38" className="learn-greek-viz" aria-hidden="true">
      <path d="M0,20 Q7,6 14,20 Q21,34 28,20 Q35,6 42,20 Q49,34 56,20" fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" />
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

export default function GreeksSection() {
  const greeks = [
    {
      symbol: "Δ", name: "Delta", color: "color-navy",
      tagline: "How much the option moves per $1 in stock",
      viz: <DeltaViz />,
      body: "Delta ranges 0–1 for calls (0 to −1 for puts). A delta of 0.60 means your option gains $0.60 for every $1 the stock rises. Higher delta = behaves more like owning the stock.",
      analogy: "Delta is driving speed. A 0.60 delta means you're moving at 60% of the stock's pace — you gain ground, but not dollar for dollar.",
      example: "Stock +$5 · Delta 0.60 → Option +$3.00 → +$300 per contract",
    },
    {
      symbol: "Θ", name: "Theta", color: "color-red",
      tagline: "Daily cost of holding the option",
      viz: <ThetaViz />,
      body: "Theta is the dollar amount your option loses every day, all else equal. It accelerates sharply in the final 2–3 weeks before expiration — the clock always ticks against buyers.",
      analogy: "Theta is a parking meter. Every hour you're parked it ticks down. The last hour before it runs out drains the fastest.",
      example: "Theta −$0.08 → You lose $8/day per contract even if the stock doesn't move",
    },
    {
      symbol: "Γ", name: "Gamma", color: "color-amber",
      tagline: "How fast delta changes",
      viz: <GammaViz />,
      body: "Gamma measures how much delta shifts for each $1 move in the stock. High gamma means your position can accelerate quickly — for you or against you. Peaks near-the-money close to expiration.",
      analogy: "If delta is speed, gamma is acceleration. A sports car (high gamma) goes from 0 to 60 fast. A lorry (low gamma) changes speed slowly.",
      example: "Delta 0.40 · Gamma 0.06 → Stock +$1 → Delta becomes 0.46",
    },
    {
      symbol: "ν", name: "Vega", color: "color-violet",
      tagline: "Sensitivity to implied volatility",
      viz: <VegaViz />,
      body: "Vega tells you how much your option's value changes for every 1% shift in implied volatility. Long options have positive vega — you want IV to expand after you buy.",
      analogy: "Vega is the fear premium. When markets get nervous, IV spikes and options get expensive even if the stock doesn't move. You want to be long vega before the storm, not after.",
      example: "Vega 0.15 · IV +5% → Option +$0.75 per share → +$75 per contract",
    },
  ];

  return (
    <div className="learn-greeks-grid">
      {greeks.map(g => (
        <div key={g.name} className="learn-card learn-greek-card">
          <div className="learn-greek-top">
            <div className={`learn-greek-badge ${g.color}`}>
              <span className="learn-greek-symbol">{g.symbol}</span>
            </div>
            <div className="learn-greek-meta">
              <div className="learn-greek-name">{g.name}</div>
              <div className="learn-greek-tagline">{g.tagline}</div>
            </div>
            <div className="learn-greek-viz-wrap">{g.viz}</div>
          </div>
          <p className="learn-body">{g.body}</p>
          <Analogy>{g.analogy}</Analogy>
          <div className="learn-example-chip">{g.example}</div>
        </div>
      ))}
    </div>
  );
}
