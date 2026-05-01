import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Clock, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SECTIONS = [
  { id: "intro",      label: "Start Here" },
  { id: "basics",     label: "Basics" },
  { id: "greeks",     label: "The Greeks" },
  { id: "iv",         label: "Volatility" },
  { id: "strategies", label: "Strategies" },
];

// ─── SVG helpers ──────────────────────────────────────────────────────────

function ZeroLine() {
  return <line x1="0" y1="54" x2="200" y2="54" stroke="var(--border)" strokeWidth="1" />;
}
function StrikeLine({ x = 100 }) {
  return <line x1={x} y1="2" x2={x} y2="88" stroke="var(--border)" strokeWidth="0.75" strokeDasharray="3,3" />;
}
function SvgMono(props) {
  return <text {...props} fontFamily="var(--mono)" fontSize="8" fill="var(--t3)" />;
}

// ─── Static payoff SVGs (used in Strategies tab) ──────────────────────────

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

// ─── Interactive payoff diagrams ──────────────────────────────────────────
// Call: price range $80–$130, strike $105, premium $3.50, breakeven $108.50
// SVG: x = (price–80)*4, y = 54 – pl*2

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
        {/* payoff line */}
        <polyline
          points={`0,${toY(MIN)} ${toX(strike)},${toY(strike)} 200,${toY(MAX)}`}
          fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"
        />
        {/* live indicator */}
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

// Put: price range $70–$120, strike $95, premium $3.50, breakeven $91.50
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

// ─── ITM / ATM / OTM explainer ────────────────────────────────────────────

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
        {itm && <>Stock at <strong>${price}</strong> is ${intrinsic} above the strike. This call has <strong>${intrinsic} of intrinsic value</strong> per share (${ intrinsic * 100} per contract) — it's already worth something regardless of time left.</>}
        {!itm && !atm && <>Stock at <strong>${price}</strong> is ${Math.abs(diff)} below the strike. This call is <strong>out of the money</strong> — it has no intrinsic value. You need the stock to rise above $100 before expiry to profit.</>}
      </p>
    </div>
  );
}

// ─── Greek mini visuals ───────────────────────────────────────────────────

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

// ─── IV Gauge ─────────────────────────────────────────────────────────────

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

// ─── Shared ───────────────────────────────────────────────────────────────

function Analogy({ children }) {
  return (
    <div className="learn-analogy">
      <span className="learn-analogy-icon">◈</span>
      <span>{children}</span>
    </div>
  );
}

// ─── START HERE section ───────────────────────────────────────────────────

const CMP_ROWS = [
  { label: "Capital needed",   stock: "$500",            call: "$500",              callClass: "" },
  { label: "Stock rises to $120 (+20%)", stock: "+$100  (+20%)",  call: "+$1,500 (+300%)", callClass: "green" },
  { label: "Stock stays flat",  stock: "$0",              call: "−$500 (−100%)",    callClass: "red" },
  { label: "Stock falls to $80 (−20%)", stock: "−$100 (−20%)",  call: "−$500 (−100%)",   callClass: "red" },
  { label: "Max possible loss", stock: "−$500 (only if stock → $0)", call: "−$500 (always capped)", callClass: "" },
];

function IntroSection() {
  return (
    <div className="learn-grid">

      {/* Hook */}
      <div className="learn-card learn-card--wide learn-intro-hero">
        <p className="learn-intro-hook">
          An option is a contract that gives you the right — but not the obligation — to buy or sell a stock at a fixed price, before a specific date.
        </p>
        <p className="learn-intro-sub">One contract = 100 shares. You pay a small upfront fee (the premium) for this right. That fee is the most you can ever lose.</p>
      </div>

      {/* Why: leverage */}
      <div className="learn-card">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--green">Why: Leverage</span>
        </div>
        <p className="learn-body">Control 100 shares of a $480 stock for a few hundred dollars — not $48,000. Your upside is amplified because you're managing far more shares than you could afford outright.</p>
        <Analogy>A $5 deposit holds a $500 concert ticket you can resell. If the show sells out and tickets hit $800, you pocket $300 on a $5 bet. If the concert's cancelled, you lose the $5.</Analogy>
      </div>

      {/* Why: protection */}
      <div className="learn-card">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--amber">Why: Protection</span>
        </div>
        <p className="learn-body">Already own a stock and worried about a crash? Buy a put option as insurance. If the stock falls, the put gains value — offsetting your losses while you keep the upside.</p>
        <Analogy>You own a $50,000 car. You pay $800/year for insurance. If the car gets totalled, you're covered. If nothing happens, the $800 is gone — but you slept well all year.</Analogy>
      </div>

      {/* Comparison table */}
      <div className="learn-card learn-card--wide">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--violet">Stock vs Option — same $500, very different outcomes</span>
        </div>
        <p className="learn-body" style={{ marginBottom: 16 }}>
          Stock is at <strong>$100</strong>. You invest $500.
          Option A: buy <strong>5 shares</strong>.
          Option B: buy <strong>1 call contract</strong> (100 shares, strike $100, premium $5 = $500 total).
        </p>
        <div className="learn-cmp-table">
          <div className="learn-cmp-header">
            <span />
            <span>5 shares of stock</span>
            <span>1 call option (100 sh)</span>
          </div>
          {CMP_ROWS.map(r => (
            <div key={r.label} className="learn-cmp-row">
              <span className="learn-cmp-label">{r.label}</span>
              <span className="learn-cmp-stock">{r.stock}</span>
              <span className={`learn-cmp-call ${r.callClass ? `learn-cmp-call--${r.callClass}` : ""}`}>{r.call}</span>
            </div>
          ))}
        </div>
        <p className="learn-cmp-note">The call turns a 20% move into 300% — but also turns a flat market into a total loss. Leverage amplifies both directions.</p>
      </div>

      {/* 3 forces */}
      <div className="learn-card learn-card--wide">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--navy">3 forces that move option prices</span>
        </div>
        <p className="learn-body">Every option price is driven by three things. Master these and you understand 90% of what happens to your position.</p>
        <div className="learn-forces">
          <div className="learn-force-card learn-force-card--navy">
            <div className="learn-force-icon"><TrendingUp size={18} /></div>
            <div className="learn-force-greek">Δ Delta</div>
            <div className="learn-force-title">Stock Price</div>
            <p className="learn-force-body">The biggest lever. The stock moves, the option moves with it — scaled by delta. This is why you buy options: directional exposure.</p>
          </div>
          <div className="learn-force-card learn-force-card--red">
            <div className="learn-force-icon"><Clock size={18} /></div>
            <div className="learn-force-greek">Θ Theta</div>
            <div className="learn-force-title">Time Decay</div>
            <p className="learn-force-body">Every day that passes, your option loses value. Even if the stock doesn't move. This is the cost of holding — and it accelerates near expiry.</p>
          </div>
          <div className="learn-force-card learn-force-card--violet">
            <div className="learn-force-icon"><Activity size={18} /></div>
            <div className="learn-force-greek">ν Vega</div>
            <div className="learn-force-title">Volatility</div>
            <p className="learn-force-body">When fear spikes, options get expensive even if the stock hasn't moved yet. Buy before the storm, not after — and watch IV after earnings.</p>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── BASICS section ───────────────────────────────────────────────────────

function BasicsSection() {
  return (
    <div className="learn-grid">

      <div className="learn-card learn-card--wide">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--green">Call Option</span>
          <span className="learn-card-sub">The right to buy</span>
        </div>
        <p className="learn-body">A call option gives you the <strong>right, but not the obligation</strong>, to buy 100 shares at a fixed price (the strike) before expiration. You profit when the stock rises above your strike plus the premium you paid.</p>
        <Analogy>Think of it like a reservation deposit on a house. You pay a small fee to lock in today's price. If the neighbourhood booms, you buy at the locked price. If it doesn't, you just lose the deposit.</Analogy>
        <InteractiveCallPayoff />
        <p className="learn-diagram-caption">Drag the slider to see your exact P&amp;L at any stock price. Losses are always capped at the premium paid ($350).</p>
      </div>

      <div className="learn-card learn-card--wide">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--red">Put Option</span>
          <span className="learn-card-sub">The right to sell</span>
        </div>
        <p className="learn-body">A put option gives you the <strong>right, but not the obligation</strong>, to sell 100 shares at the strike price before expiration. Puts profit when the stock falls.</p>
        <Analogy>It's insurance on your car. You pay a premium. If your car gets totalled (stock crashes), the policy pays out. If nothing bad happens, the premium expires worthless — but you had full protection.</Analogy>
        <InteractivePutPayoff />
        <p className="learn-diagram-caption">Drag the slider. Notice: you profit as the stock falls below the breakeven ($91.50), and max loss is always $350.</p>
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

// ─── GREEKS section ───────────────────────────────────────────────────────

function GreeksSection() {
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

// ─── VOLATILITY section ───────────────────────────────────────────────────

function IVSection() {
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

// ─── STRATEGIES section ───────────────────────────────────────────────────

function StrategiesSection() {
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

// ─── Main ─────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const [section, setSection] = useState("intro");
  const navigate = useNavigate();

  return (
    <motion.div
      className="learn-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
    >
      <div className="learn-topbar">
        <div className="learn-topbar-left">
          <button className="learn-back-btn" onClick={() => navigate("/")}>
            <ArrowLeft size={13} /> Back
          </button>
          <h1 className="learn-heading">Options Glossary</h1>
        </div>
        <nav className="learn-nav">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`learn-nav-btn${section === s.id ? " learn-nav-btn--active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {section === "intro"      && <IntroSection />}
          {section === "basics"     && <BasicsSection />}
          {section === "greeks"     && <GreeksSection />}
          {section === "iv"         && <IVSection />}
          {section === "strategies" && <StrategiesSection />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
