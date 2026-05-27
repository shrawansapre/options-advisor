import { TrendingUp, Clock, Activity } from "lucide-react";

const CMP_ROWS = [
  { label: "Capital needed",       stock: "$500",         call: "$500",          callClass: "" },
  { label: "Stock → $120 (+20%)",  stock: "+$100 (+20%)", call: "+$1,500 (+300%)", callClass: "green" },
  { label: "Stock stays flat",     stock: "$0",           call: "−$500 (−100%)", callClass: "red" },
  { label: "Stock → $80 (−20%)",   stock: "−$100 (−20%)", call: "−$500 (−100%)", callClass: "red" },
  { label: "Max loss",             stock: "−$500",        call: "−$500 (capped)", callClass: "" },
];

function Analogy({ children }) {
  return (
    <div className="learn-analogy">
      <span className="learn-analogy-icon">◈</span>
      <span>{children}</span>
    </div>
  );
}

export default function IntroSection() {
  return (
    <div className="learn-grid">

      <div className="learn-card learn-card--wide learn-intro-hero">
        <p className="learn-intro-hook">
          An option is a contract that gives you the right — but not the obligation — to buy or sell a stock at a fixed price, before a specific date.
        </p>
        <p className="learn-intro-sub">One contract = 100 shares. You pay a small upfront fee (the premium) for this right. That fee is the most you can ever lose.</p>
      </div>

      <div className="learn-card">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--green">Why: Leverage</span>
        </div>
        <p className="learn-body">Control 100 shares of a $480 stock for a few hundred dollars — not $48,000. Your upside is amplified because you're managing far more shares than you could afford outright.</p>
        <Analogy>A $5 deposit holds a $500 concert ticket you can resell. If the show sells out and tickets hit $800, you pocket $300 on a $5 bet. If the concert's cancelled, you lose the $5.</Analogy>
      </div>

      <div className="learn-card">
        <div className="learn-card-header">
          <span className="learn-tag learn-tag--amber">Why: Protection</span>
        </div>
        <p className="learn-body">Already own a stock and worried about a crash? Buy a put option as insurance. If the stock falls, the put gains value — offsetting your losses while you keep the upside.</p>
        <Analogy>You own a $50,000 car. You pay $800/year for insurance. If the car gets totalled, you're covered. If nothing happens, the $800 is gone — but you slept well all year.</Analogy>
      </div>

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
