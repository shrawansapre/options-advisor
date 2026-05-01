import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ordinalSuffix } from "../utils";

export default function IVGauge({ value, reading }) {
  const num = parseInt(value, 10) || 0;
  const clipped = Math.min(100, Math.max(0, num));
  const color = clipped < 40 ? "var(--green)" : clipped > 60 ? "var(--red)" : "var(--amber)";
  const rawLabel = reading || (clipped < 40 ? "Below average" : clipped > 60 ? "Above average" : "Near average");
  const label = rawLabel.replace(/\s*\(.*?\)/g, "").trim();
  const data = [{ value: clipped }, { value: 100 - clipped }];

  return (
    <div className="iv-gauge-wrap">
      <ResponsiveContainer width="100%" height={130}>
        <PieChart>
          <Pie data={data} cx="50%" cy="88%" startAngle={180} endAngle={0}
            innerRadius={52} outerRadius={72} dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="var(--surface-3)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="iv-gauge-overlay">
        <div className="iv-gauge-num">{num}<sup>{ordinalSuffix(num)}</sup></div>
        <div className="iv-gauge-label" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}
