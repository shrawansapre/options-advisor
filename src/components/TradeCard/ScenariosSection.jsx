import { BookOpen } from "lucide-react";

export default function ScenariosSection({ predictions }) {
  return (
    <div className="card">
      <div className="card-label"><BookOpen size={11} /> Outcome scenarios</div>
      <div className="scenarios-grid">
        {[
          { key: "bull", label: "Bull case", data: predictions.bullCase, colorClass: "green-text", fillClass: "prob-fill--bull" },
          { key: "base", label: "Base case", data: predictions.baseCase, colorClass: "navy-text", fillClass: "prob-fill--base" },
          { key: "bear", label: "Bear case", data: predictions.bearCase, colorClass: "red-text",  fillClass: "prob-fill--bear" },
        ].map(({ key, label, data, colorClass, fillClass }) => (
          <div key={key} className="scenario-card">
            <div className="scenario-top">
              <span className="scenario-label">{label}</span>
              <span className="scenario-prob">{data.probability}</span>
            </div>
            <div className={`scenario-return ${colorClass}`}>{data.optionReturn}</div>
            <div className="scenario-target">→ {data.stockTarget}</div>
            <div className="prob-bar">
              <div className={`prob-fill ${fillClass}`} style={{ width: data.probability }} />
            </div>
            <p className="scenario-desc">{data.scenario}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
