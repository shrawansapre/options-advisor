import { Clock } from "lucide-react";

export default function EntrySection({ entryTiming }) {
  if (!entryTiming) return null;
  return (
    <div className="card">
      <div className="card-label"><Clock size={11} /> Entry timing</div>
      <div className="entry-timing-rows">
        <div className={`entry-rule entry-rule--now${entryTiming.canEnterNow ? " entry-rule--yes" : " entry-rule--no"}`}>
          <div className="entry-rule-head">
            <span className="exit-title">Enter now?</span>
            <span className={`entry-now-badge${entryTiming.canEnterNow ? " entry-now-badge--yes" : " entry-now-badge--no"}`}>
              {entryTiming.canEnterNow ? "Yes" : "No"}
            </span>
          </div>
          {entryTiming.nowAssessment && (
            <p className="exit-desc">{entryTiming.nowAssessment}</p>
          )}
        </div>
        <div className={`entry-rule entry-rule--${entryTiming.urgency ?? "immediate"}`}>
          <div className="entry-rule-head">
            <span className="exit-title">Optimal entry</span>
            <span className={`entry-rec entry-rec--${entryTiming.urgency ?? "immediate"}`}>
              {entryTiming.optimalEntry}
            </span>
          </div>
          <p className="exit-desc">{entryTiming.condition}</p>
          {entryTiming.idealEntryPrice && (
            <div className="exit-meta">Ideal price: {entryTiming.idealEntryPrice} per contract</div>
          )}
        </div>
      </div>
    </div>
  );
}
