import { Ban, Lightbulb } from "lucide-react";
import { parseBold } from "../../utils";

export default function ThesisRisk({ rationale, riskLevel, riskFactors }) {
  const riskColor = riskLevel <= 2 ? "green" : riskLevel <= 3 ? "amber" : "red";
  const riskLabel = riskLevel <= 2 ? "Low" : riskLevel <= 3 ? "Moderate" : "High";

  return (
    <div className="card card-inner-split">
      <div className="card-inner-col">
        <div className="card-label"><Lightbulb size={11} /> Thesis</div>
        <p className="rationale">{parseBold(rationale)}</p>
      </div>
      <div className="card-inner-col">
        <div className="card-label">Risk profile</div>
        <div className="risk-meter">
          <div className="risk-segments">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`risk-seg ${i <= riskLevel ? `risk-seg--${riskColor}` : ""}`} />
            ))}
          </div>
          <span className={`risk-label risk-label--${riskColor}`}>{riskLabel} risk</span>
        </div>
        <ul className="risk-list">
          {(riskFactors ?? []).map((f, i) => (
            <li key={i}><Ban size={11} className="risk-icon" /><span>{f}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
