import { parseBold } from "../../utils";

export default function ThesisRisk({ rationale, riskLevel, riskFactors }) {
  const riskDots = [1,2,3,4,5].map(i => i <= riskLevel ? "●" : "○").join("");
  const riskLabel = riskLevel <= 2 ? "Low" : riskLevel <= 3 ? "Moderate" : "High";
  const riskClass = riskLevel <= 2 ? "green" : riskLevel <= 3 ? "amber" : "red";

  return (
    <div className="tc-section">
      <div className="tc-section-label">THESIS</div>
      <p className="tc-body">{parseBold(rationale)}</p>
      <div className="tc-section-label tc-section-label--spaced">
        RISK <span className={`tc-risk-dots tc-risk-dots--${riskClass}`}>{riskDots}</span>
        <span className={`tc-risk-label tc-risk-label--${riskClass}`}>{riskLabel}</span>
      </div>
      <ul className="tc-list">
        {(riskFactors ?? []).map((f, i) => (
          <li key={i} className="tc-list-item">· {f}</li>
        ))}
      </ul>
    </div>
  );
}
