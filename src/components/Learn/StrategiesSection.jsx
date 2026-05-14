function ZeroLine() {
  return <line x1="0" y1="54" x2="200" y2="54" stroke="var(--border)" strokeWidth="1" />;
}
function StrikeLine({ x = 100 }) {
  return <line x1={x} y1="2" x2={x} y2="88" stroke="var(--border)" strokeWidth="0.75" strokeDasharray="3,3" />;
}
function SvgMono(props) {
  return <text {...props} fontFamily="var(--mono)" fontSize="8" fill="var(--t3)" />;
}

function CallPayoff() {
  return (
    <svg viewBox="0 0 200 90" className="learn-payoff-svg" aria-hidden="true">
      <ZeroLine /><StrikeLine />
      <SvgMono x="3" y="50">Profit</SvgMono>
      <SvgMono x="3" y="82">Loss</SvgMono>
      <SvgMono x="97" y="88" textAnchor="middle">Strike</SvgMono>
      <polyline points="0,70 100,70 200,14" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="100" cy="70" r="3.5" fill="var(--green)" />
    </svg>
  );
}

function PutPayoff() {
  return (
    <svg viewBox="0 0 200 90" className="learn-payoff-svg" aria-hidden="true">
      <ZeroLine /><StrikeLine />
      <SvgMono x="3" y="50">Profit</SvgMono>
      <SvgMono x="3" y="82">Loss</SvgMono>
      <SvgMono x="97" y="88" textAnchor="middle">Strike</SvgMono>
      <polyline points="0,14 100,70 200,70" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="100" cy="70" r="3.5" fill="var(--red)" />
    </svg>
  );
}

function BullCallSpreadPayoff() {
  return (
    <svg viewBox="0 0 200 90" className="learn-payoff-svg" aria-hidden="true">
      <ZeroLine /><StrikeLine x={70} /><StrikeLine x={140} />
      <SvgMono x="66" y="88" textAnchor="middle">K1</SvgMono>
      <SvgMono x="136" y="88" textAnchor="middle">K2</SvgMono>
      <polygon points="70,66 140,66 140,28 70,54" fill="var(--green)" opacity="0.08" />
      <polyline points="0,66 70,66 140,28 200,28" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="66" r="3" fill="var(--navy)" />
      <circle cx="140" cy="28" r="3.5" fill="var(--green)" />
    </svg>
  );
}

function IronCondorPayoff() {
  return (
    <svg viewBox="0 0 200 90" className="learn-payoff-svg" aria-hidden="true">
      <ZeroLine /><StrikeLine x={55} /><StrikeLine x={145} />
      <polygon points="75,36 125,36 145,54 55,54" fill="var(--green)" opacity="0.1" />
      <polyline points="0,76 55,76 75,36 125,36 145,76 200,76" fill="none" stroke="var(--violet)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <SvgMono x="51" y="88" textAnchor="middle">K1</SvgMono>
      <SvgMono x="141" y="88" textAnchor="middle">K2</SvgMono>
    </svg>
  );
}

function CoveredCallPayoff() {
  return (
    <svg viewBox="0 0 200 90" className="learn-payoff-svg" aria-hidden="true">
      <ZeroLine /><StrikeLine x={120} />
      <SvgMono x="116" y="88" textAnchor="middle">Strike</SvgMono>
      <polygon points="0,54 120,54 120,24 0,80" fill="var(--navy)" opacity="0.06" />
      <polyline points="0,80 120,24 200,24" fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="120" cy="24" r="3.5" fill="var(--navy)" />
    </svg>
  );
}

export default function StrategiesSection() {
  const strategies = [
    {
      name: "Long Call", tag: "learn-tag--green",
      diagram: <CallPayoff />,
      body: "Buy a call. Unlimited profit if stock surges. Max loss is the premium paid. The purest bullish bet.",
      when: "You're strongly bullish and want leveraged upside without owning shares.",
      risk: "Low — max loss = premium paid",
      riskClass: "green",
    },
    {
      name: "Long Put", tag: "learn-tag--red",
      diagram: <PutPayoff />,
      body: "Buy a put. Profits as the stock falls. Max loss is the premium paid. Used to speculate bearish or to hedge existing stock.",
      when: "You're bearish, or want to protect a stock position you own.",
      risk: "Low — max loss = premium paid",
      riskClass: "green",
    },
    {
      name: "Bull Call Spread", tag: "learn-tag--green",
      diagram: <BullCallSpreadPayoff />,
      body: "Buy a lower-strike call, sell a higher-strike call. Capped profit, capped loss. Costs less than a naked call.",
      when: "Moderately bullish. Want defined risk at lower cost.",
      risk: "Defined — max loss = net debit paid",
      riskClass: "green",
    },
    {
      name: "Iron Condor", tag: "learn-tag--violet",
      diagram: <IronCondorPayoff />,
      body: "Sell an OTM call spread and OTM put spread simultaneously. Profits when the stock stays rangebound between your short strikes.",
      when: "IV is elevated and you expect the stock to stay quiet through expiration.",
      risk: "Defined — but can lose on both sides",
      riskClass: "amber",
    },
    {
      name: "Covered Call", tag: "learn-tag--navy",
      diagram: <CoveredCallPayoff />,
      body: "Own 100 shares, sell a call against them. Generates income from the premium but caps your upside at the strike.",
      when: "You own stock and want to collect yield in sideways or mildly bullish conditions.",
      risk: "Stock downside remains — call only offsets a little",
      riskClass: "amber",
    },
  ];

  return (
    <div className="learn-strategies-grid">
      {strategies.map(s => (
        <div key={s.name} className="learn-card learn-strategy-card">
          <div className="learn-card-header">
            <span className={`learn-tag ${s.tag}`}>{s.name}</span>
          </div>
          {s.diagram}
          <p className="learn-body" style={{ marginTop: 8 }}>{s.body}</p>
          <div className="learn-when">
            <span className="learn-when-label">Use when:</span> {s.when}
          </div>
          <div className={`learn-risk-note learn-risk-note--${s.riskClass}`}>
            <span className="learn-when-label">Risk:</span> {s.risk}
          </div>
        </div>
      ))}
    </div>
  );
}
