export default function EntrySection({ entryTiming }) {
  if (!entryTiming) return null;
  return (
    <div className="tc-section">
      <div className="tc-section-label">ENTRY</div>
      <div className="tc-kv-row">
        <span className="tc-kv-key">Enter now?</span>
        <span className={`tc-badge tc-badge--${entryTiming.canEnterNow ? "yes" : "no"}`}>
          {entryTiming.canEnterNow ? "Yes" : "No"}
        </span>
      </div>
      {entryTiming.nowAssessment && (
        <p className="tc-kv-desc">{entryTiming.nowAssessment}</p>
      )}
      <div className="tc-kv-row tc-kv-row--spaced">
        <span className="tc-kv-key">Optimal</span>
        <span className="tc-kv-val">{entryTiming.optimalEntry}</span>
      </div>
      <p className="tc-kv-desc">{entryTiming.condition}</p>
      {entryTiming.idealEntryPrice && (
        <p className="tc-kv-meta">Ideal price: {entryTiming.idealEntryPrice} per contract</p>
      )}
    </div>
  );
}
