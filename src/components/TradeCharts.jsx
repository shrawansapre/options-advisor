import { useState, useEffect } from "react";
import {
  AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { impactClass } from "../utils";

function useIsMobile() {
  const [v, setV] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
}

// ─── Payoff Diagram ────────────────────────────────────────────────────────────

function buildPayoffData(trade) {
  const strike = parseFloat(trade.strike);
  const strike2 = trade.strike2 ? parseFloat(trade.strike2) : null;
  const costPerShare = parseFloat(trade.entryPrice) || 0;
  const current = parseFloat(trade.currentPrice) || strike;
  const strat = (trade.strategy || "").toLowerCase();
  const isCall = strat.includes("call") || (!strat.includes("put") && trade.strategyType === "bullish");

  if (isNaN(strike) || isNaN(costPerShare) || !current) return null;

  const range = Math.max(current * 0.28, 20);
  const min = current - range;
  const max = current + range;

  return Array.from({ length: 81 }, (_, i) => {
    const s = min + (i / 80) * (max - min);
    let intrinsic;
    if (strike2) {
      intrinsic = isCall
        ? Math.max(0, s - strike) - Math.max(0, s - strike2)
        : Math.max(0, strike - s) - Math.max(0, strike2 - s);
    } else {
      intrinsic = isCall ? Math.max(0, s - strike) : Math.max(0, strike - s);
    }
    const pnl = Math.round((intrinsic - costPerShare) * 100);
    return {
      price: Math.round(s * 100) / 100,
      profit: pnl >= 0 ? pnl : null,
      loss: pnl < 0 ? pnl : null,
      pnl,
    };
  });
}

function fmtDollar(v) {
  const n = Math.abs(Math.round(v));
  const prefix = v >= 0 ? "+" : "-";
  return `${prefix}$${n >= 1000 ? (n / 1000).toFixed(1) + "k" : n}`;
}

export function PayoffChart({ trade }) {
  const data = buildPayoffData(trade);
  const isMobile = useIsMobile();
  if (!data) return null;

  const current = parseFloat(trade.currentPrice);
  const stopPrice   = parseFloat((trade.exitStrategy?.stopLoss?.stockPrice   || "").replace(/[^0-9.]/g, "")) || null;
  const targetPrice = parseFloat((trade.exitStrategy?.profitTarget?.stockPrice || "").replace(/[^0-9.]/g, "")) || null;
  const ttStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };
  const refLabel = (text, fill) => isMobile ? null : { value: text, position: "top", fill, fontSize: 10 };

  return (
    <div className="card chart-card">
      <div className="card-label"><TrendingUp size={11} /> Payoff at expiry</div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: isMobile ? 8 : 20, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="price" type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={v => `$${Math.round(v)}`}
            tick={{ fontSize: 10, fill: "var(--t3)" }}
            tickCount={isMobile ? 4 : 6}
          />
          <YAxis
            tickFormatter={fmtDollar}
            tick={{ fontSize: 10, fill: "var(--t3)" }}
            width={isMobile ? 42 : 52}
            tickCount={4}
          />
          <Tooltip
            formatter={(v, key) => [fmtDollar(v), key === "profit" ? "Profit" : "Loss"]}
            labelFormatter={v => `Stock at $${v}`}
            contentStyle={ttStyle}
          />
          <ReferenceLine y={0} stroke="var(--t3)" strokeDasharray="4 2" />
          {!isNaN(current) && (
            <ReferenceLine x={current} stroke="var(--t2)" strokeWidth={1.5} strokeDasharray="4 2"
              label={refLabel("Now", "var(--t2)")} />
          )}
          {stopPrice && (
            <ReferenceLine x={stopPrice} stroke="var(--red)" strokeWidth={1.5} strokeDasharray="4 2"
              label={refLabel("Stop", "var(--red)")} />
          )}
          {targetPrice && (
            <ReferenceLine x={targetPrice} stroke="var(--green)" strokeWidth={1.5} strokeDasharray="4 2"
              label={refLabel("Target", "var(--green)")} />
          )}
          <Area type="monotone" dataKey="profit" stroke="var(--green)" strokeWidth={2}
            fill="var(--green)" fillOpacity={0.15} dot={false} connectNulls={false} />
          <Area type="monotone" dataKey="loss" stroke="var(--red)" strokeWidth={2}
            fill="var(--red)" fillOpacity={0.15} dot={false} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
      {isMobile && (
        <div className="chart-legend">
          {!isNaN(current) && <span className="chart-legend-item"><span className="chart-legend-dash" style={{ background: "var(--t2)" }} />Now</span>}
          {stopPrice && <span className="chart-legend-item"><span className="chart-legend-dash" style={{ background: "var(--red)" }} />Stop</span>}
          {targetPrice && <span className="chart-legend-item"><span className="chart-legend-dash" style={{ background: "var(--green)" }} />Target</span>}
        </div>
      )}
    </div>
  );
}

// ─── Theta Decay + Key Dates ───────────────────────────────────────────────────

function buildThetaData(trade, analysedAt) {
  const dte = parseInt(trade.daysToExpiry) || 0;
  const entryValue = (parseFloat(trade.entryPrice) || 0) * 100;
  if (!entryValue || dte < 2) return null;
  const today = analysedAt || new Date();
  return Array.from({ length: dte + 1 }, (_, i) => {
    const daysLeft = dte - i;
    const date = new Date(today.getTime() + i * 864e5);
    return {
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: Math.round(entryValue * Math.sqrt(daysLeft / dte)),
      daysLeft,
    };
  });
}

function parseDate(str, fallbackYear) {
  if (!str) return null;
  const withYear = /\d{4}/.test(str) ? str : `${str}, ${fallbackYear}`;
  const d = new Date(withYear);
  return isNaN(d) ? null : d;
}

const EVENT_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#14b8a6", // teal
  "#f97316", // orange
  "#ec4899", // pink
  "#84cc16", // lime
];

export function ThetaDecayChart({ trade, analysedAt }) {
  const data = buildThetaData(trade, analysedAt);
  const isMobile = useIsMobile();
  if (!data) return null;

  const today = analysedAt || new Date();
  const todayLabel = data[0]?.label;
  const danger7 = data.find(d => d.daysLeft === 7);
  const ttStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };
  const refLabel = (text, fill) => isMobile ? null : { value: text, position: "top", fill, fontSize: 10 };

  const yr = trade.expiry ? new Date(trade.expiry).getFullYear() : today.getFullYear();

  const toDataLabel = parsed => {
    const idx = Math.round((parsed - today) / 864e5);
    return (idx >= 0 && idx < data.length) ? data[idx].label : null;
  };

  const rawEvents = [...(trade.watchFor?.keyDates || [])];
  const tsDate = trade.exitStrategy?.timeStop?.date;
  if (tsDate) rawEvents.push({ date: tsDate, event: "Time stop", impact: "Action Required" });

  const events = rawEvents
    .map(kd => ({ ...kd, parsed: parseDate(kd.date, yr) }))
    .filter(kd => kd.parsed)
    .map(kd => ({ ...kd, xLabel: toDataLabel(kd.parsed) }))
    .filter(kd => kd.xLabel)
    .sort((a, b) => a.parsed - b.parsed)
    .filter((kd, i, arr) =>
      kd.event !== "Time stop" ||
      !arr.some((o, j) => j !== i && o.event !== "Time stop" && Math.abs(o.parsed - kd.parsed) < 864e5 * 2)
    )
    .map((ev, i) => ({ ...ev, color: EVENT_COLORS[i % EVENT_COLORS.length] }));

  const daysUntil = d => Math.ceil((d - today) / 864e5);

  return (
    <div className="card chart-card">
      <div className="card-label">Θ Decay · key events</div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: isMobile ? 8 : 20, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="thetaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--amber)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--amber)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--t3)" }}
            interval={Math.max(1, Math.floor(data.length / (isMobile ? 3 : 5)))} />
          <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: "var(--t3)" }}
            width={isMobile ? 34 : 44} tickCount={4} />
          <Tooltip formatter={v => [`$${v}`, "Est. value"]} contentStyle={ttStyle} />
          {todayLabel && (
            <ReferenceLine x={todayLabel} stroke="var(--blue)" strokeDasharray="4 2"
              label={refLabel("Today", "var(--blue)")} />
          )}
          {danger7 && (
            <ReferenceLine x={danger7.label} stroke="var(--red)" strokeDasharray="3 3"
              label={refLabel("7d left", "var(--red)")} />
          )}
          {events.map((ev, i) => (
            <ReferenceLine key={i} x={ev.xLabel}
              stroke={ev.color} strokeWidth={1.5} strokeDasharray="3 3" />
          ))}
          <Area type="monotone" dataKey="value" stroke="var(--amber)" strokeWidth={2}
            fill="url(#thetaGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {events.length > 0 && (
        <div className="kdt-events">
          {events.map((ev, i) => {
            const days = daysUntil(ev.parsed);
            return (
              <div key={i} className="kdt-event-row">
                <span className="kdt-event-dot" style={{ background: ev.color }} />
                <span className="kdt-event-date">
                  {ev.parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="kdt-event-in">{days > 0 ? `in ${days}d` : "passed"}</span>
                <span className="kdt-event-name">{ev.event}</span>
                <span className={`impact-tag ${impactClass(ev.impact)}`}>{ev.impact}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
