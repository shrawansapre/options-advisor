import { useState } from "react";

function ZeroLine() {
  return <line x1="0" y1="54" x2="200" y2="54" stroke="var(--border)" strokeWidth="1" />;
}
function StrikeLine({ x = 100 }) {
  return <line x1={x} y1="2" x2={x} y2="88" stroke="var(--border)" strokeWidth="0.75" strokeDasharray="3,3" />;
}
function SvgMono(props) {
  return <text {...props} fontFamily="var(--mono)" fontSize="8" fill="var(--t3)" />;
}

function Analogy({ children }) {
  return (
    <div className="learn-analogy">
      <span className="learn-analogy-icon">◈</span>
      <span>{children}</span>
    </div>
  );
}

function InteractiveCallPayoff() {
  const [price, setPrice] = useState(100);
  const strike = 105, premium = 3.5, breakeven = 108.5;
  const MIN = 80, MAX = 130;

  const toX = p => ((p - MIN) / (MAX - MIN)) * 200;
  const pl = p => Math.max(-premium, p - breakeven);
  const toY = p => 54 - pl(p) * 2;

  const ix = toX(price);
  const iy = Math.max(6, Math.min(86, toY(price)));
  const plNow = pl(price);
  const plDollars = Math.round(plNow * 100);
  const isProfit = plNow >= 0;

  return (
    <div className="learn-interactive-wrap">
      <svg viewBox="0 0 200 90" className="learn-payoff-svg" aria-hidden="true">
        <ZeroLine />
        <StrikeLine x={toX(strike)} />
        <SvgMono x="3" y="50">Profit</SvgMono>
        <SvgMono x="3" y="82">Loss</SvgMono>
        <SvgMono x={toX(strike) - 3} y="88" textAnchor="middle">$105</SvgMono>
        <polyline
          points={`0,${toY(MIN)} ${toX(strike)},${toY(strike)} 200,${toY(MAX)}`}
          fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"
        />
        <line x1={ix} y1="2" x2={ix} y2="88" stroke={isProfit ? "var(--green)" : "var(--red)"} strokeWidth="1" strokeDasharray="3,2" />
        <circle cx={ix} cy={iy} r="5" fill={isProfit ? "var(--green)" : "var(--red)"} />
      </svg>

      <div className={`learn-pl-display ${isProfit ? "learn-pl-display--profit" : "learn-pl-display--loss"}`}>
        <span className="learn-pl-price">Stock @ <strong>${price}</strong></span>
        <span className="learn-pl-value">{isProfit ? `+$${plDollars}` : `-$${Math.abs(plDollars)}`} per contract</span>
        <span className="learn-pl-note">{price < strike ? "OTM — worthless at expiry" : price < breakeven ? "ITM but below breakeven" : "Profitable ✓"}</span>
      </div>

      <input type="range" min={MIN} max={MAX} step={1} value={price}
        onChange={e => setPrice(+e.target.value)} className="learn-slider" />
      <div className="learn-slider-labels">
        <span>${MIN} ← drag to move stock price → ${MAX}</span>
        <span>Strike ${strike} · Breakeven ${breakeven}</span>
      </div>
    </div>
  );
}

function InteractivePutPayoff() {
  const [price, setPrice] = useState(100);
  const strike = 95, premium = 3.5, breakeven = 91.5;
  const MIN = 70, MAX = 120;

  const toX = p => ((p - MIN) / (MAX - MIN)) * 200;
  const pl = p => Math.max(-premium, breakeven - p);
  const toY = p => 54 - pl(p) * 2;

  const ix = toX(price);
  const iy = Math.max(6, Math.min(86, toY(price)));
  const plNow = pl(price);
  const plDollars = Math.round(plNow * 100);
  const isProfit = plNow >= 0;

  return (
    <div className="learn-interactive-wrap">
      <svg viewBox="0 0 200 90" className="learn-payoff-svg" aria-hidden="true">
        <ZeroLine />
        <StrikeLine x={toX(strike)} />
        <SvgMono x="3" y="50">Profit</SvgMono>
        <SvgMono x="3" y="82">Loss</SvgMono>
        <SvgMono x={toX(strike) - 3} y="88" textAnchor="middle">$95</SvgMono>
        <polyline
          points={`0,${toY(MIN)} ${toX(strike)},${toY(strike)} 200,${toY(MAX)}`}
          fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"
        />
        <line x1={ix} y1="2" x2={ix} y2="88" stroke={isProfit ? "var(--green)" : "var(--red)"} strokeWidth="1" strokeDasharray="3,2" />
        <circle cx={ix} cy={iy} r="5" fill={isProfit ? "var(--green)" : "var(--red)"} />
      </svg>

      <div className={`learn-pl-display ${isProfit ? "learn-pl-display--profit" : "learn-pl-display--loss"}`}>
        <span className="learn-pl-price">Stock @ <strong>${price}</strong></span>
        <span className="learn-pl-value">{isProfit ? `+$${plDollars}` : `-$${Math.abs(plDollars)}`} per contract</span>
        <span className="learn-pl-note">{price > strike ? "OTM — worthless at expiry" : price > breakeven ? "ITM but below breakeven" : "Profitable ✓"}</span>
      </div>

      <input type="range" min={MIN} max={MAX} step={1} value={price}
        onChange={e => setPrice(+e.target.value)} className="learn-slider" />
      <div className="learn-slider-labels">
        <span>${MIN} ← drag → ${MAX}</span>
        <span>Strike ${strike} · Breakeven ${breakeven}</span>
      </div>
    </div>
  );
}

function ITMExplainer() {
  const [price, setPrice] = useState(100);
  const strike = 100;
  const intrinsic = Math.max(0, price - strike);
  const diff = price - strike;
  const atm = Math.abs(diff) <= 1;
  const itm = diff > 1;
  const status = atm ? "ATM" : itm ? "ITM" : "OTM";
  const label = atm ? "At the Money" : itm ? "In the Money" : "Out of the Money";
  const color = atm ? "var(--amber)" : itm ? "var(--green)" : "var(--red)";
  const pricePct = Math.max(0, Math.min(100, ((price - 85) / 30) * 100));

  return (
    <div>
      <div className="learn-itm-status" style={{ borderColor: color }}>
        <span className="learn-itm-badge" style={{ background: color }}>{status}</span>
        <span className="learn-itm-label" style={{ color }}>{label}</span>
        {itm && <span className="learn-itm-intrinsic">${intrinsic}/share intrinsic value</span>}
        {!itm && <span className="learn-itm-intrinsic">$0 intrinsic — pure time value</span>}
      </div>

      <div className="learn-itm-track-wrap">
        <div className="learn-itm-track">
          <div className="learn-itm-zone-otm" />
          <div className="learn-itm-zone-itm" />
          <div className="learn-itm-strike-pin" />
          <div className="learn-itm-dot" style={{ left: `${pricePct}%`, background: color }} />
        </div>
        <div className="learn-itm-axis">
          <span>$85</span><span>$100 strike</span><span>$115</span>
        </div>
      </div>

      <input type="range" min={85} max={115} step={1} value={price}
        onChange={e => setPrice(+e.target.value)} className="learn-slider" style={{ marginTop: 10 }} />

      <p className="learn-itm-explain">
        {atm && <>Stock and strike are equal. Delta ≈ 0.50. The option is <strong>all time value</strong> — no intrinsic value yet.</>}
        {itm && <>Stock at <strong>${price}</strong> is ${intrinsic} above the strike. This call has <strong>${intrinsic} of intrinsic value</strong> per share (${intrinsic * 100} per contract) — it's already worth something regardless of time left.</>}
        {!itm && !atm && <>Stock at <strong>${price}</strong> is ${Math.abs(diff)} below the strike. This call is <strong>out of the money</strong> — it has no intrinsic value. You need the stock to rise above $100 before expiry to profit.</>}
      </p>
    </div>
  );
}

export default function BasicsSection() {
  return (
    <div className="learn-grid">

      <div className="learn-card learn-card--wide">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--green">Call Option</span>
          <span className="learn-card-sub">The right to buy</span>
        </div>
        <div className="learn-basics-split">
          <div className="learn-basics-split__text">
            <p className="learn-body">A call option gives you the <strong>right, but not the obligation</strong>, to buy 100 shares at a fixed price (the strike) before expiration. You profit when the stock rises above your strike plus the premium you paid.</p>
            <Analogy>Think of it like a reservation deposit on a house. You pay a small fee to lock in today's price. If the neighbourhood booms, you buy at the locked price. If it doesn't, you just lose the deposit.</Analogy>
          </div>
          <div className="learn-basics-split__chart">
            <InteractiveCallPayoff />
            <p className="learn-diagram-caption">Drag the slider to see your P&amp;L. Losses are always capped at the premium paid ($350).</p>
          </div>
        </div>
      </div>

      <div className="learn-card learn-card--wide">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--red">Put Option</span>
          <span className="learn-card-sub">The right to sell</span>
        </div>
        <div className="learn-basics-split">
          <div className="learn-basics-split__text">
            <p className="learn-body">A put option gives you the <strong>right, but not the obligation</strong>, to sell 100 shares at the strike price before expiration. Puts profit when the stock falls.</p>
            <Analogy>It's insurance on your car. You pay a premium. If your car gets totalled (stock crashes), the policy pays out. If nothing bad happens, the premium expires worthless — but you had full protection.</Analogy>
          </div>
          <div className="learn-basics-split__chart">
            <InteractivePutPayoff />
            <p className="learn-diagram-caption">Drag the slider. Max loss is always $350 — you profit as the stock falls below breakeven ($91.50).</p>
          </div>
        </div>
      </div>

      <div className="learn-card">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--navy">Strike Price</span>
        </div>
        <p className="learn-body">The fixed price at which you can buy (call) or sell (put). An NVDA $500 call means you can buy NVDA at $500 regardless of where it trades.</p>
        <div className="learn-strike-viz">
          <div className="learn-strike-track">
            <div className="learn-strike-current" style={{ left: "44%" }}>
              <span className="learn-strike-price-label">$480</span>
            </div>
            <div className="learn-strike-flag" style={{ left: "64%" }}>
              <span>$500 strike</span>
            </div>
          </div>
          <p className="learn-meta-note">Out of the money — $20 gap to bridge before the option has intrinsic value.</p>
        </div>
      </div>

      <div className="learn-card">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--amber">Expiration</span>
        </div>
        <p className="learn-body">The last date your option can be exercised. After this, it's worthless if it hasn't been closed. Time works against option buyers — especially in the final two weeks.</p>
        <Analogy>Like a supermarket coupon. Every day that passes, the urgency grows. At expiry, it's either worth something or it's in the bin.</Analogy>
        <div className="learn-expiry-viz">
          <div className="learn-expiry-track">
            <div className="learn-expiry-fill" style={{ width: "62%" }} />
            <div className="learn-expiry-today" style={{ left: "62%" }} />
          </div>
          <div className="learn-expiry-labels">
            <span>Open</span><span className="learn-expiry-now">Today</span><span>Expiry</span>
          </div>
          <p className="learn-meta-note" style={{ color: "var(--amber)" }}>62% of life elapsed — theta drag accelerating.</p>
        </div>
      </div>

      <div className="learn-card">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--violet">Premium</span>
        </div>
        <p className="learn-body">The price you pay for the contract. One contract covers 100 shares, so a $3.50 option costs $350 total. Premium = intrinsic value + time value.</p>
        <div className="learn-premium-breakdown">
          <div className="learn-premium-row">
            <span>Intrinsic value</span>
            <span className="learn-premium-val" style={{ color: "var(--green)" }}>$2.10</span>
          </div>
          <div className="learn-premium-row">
            <span>Time value</span>
            <span className="learn-premium-val" style={{ color: "var(--amber)" }}>$1.40</span>
          </div>
          <div className="learn-premium-row learn-premium-row--total">
            <span>Total × 100 shares</span>
            <span className="learn-premium-val">$350</span>
          </div>
        </div>
      </div>

      <div className="learn-card learn-card--wide">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--navy">ITM / ATM / OTM</span>
          <span className="learn-card-sub">where is the stock relative to the strike?</span>
        </div>
        <p className="learn-body">These terms describe how the current stock price compares to the strike price of a call option. They determine whether your option has <strong>intrinsic value</strong> right now.</p>
        <ITMExplainer />
      </div>

    </div>
  );
}
