export default function SignalsSection({ watchFor, sources, robinhoodSteps }) {
  return (
    <>
      <div className="tc-section">
        <div className="tc-section-label">SIGNALS</div>
        {(watchFor?.bullishSignals ?? []).map((s, i) => (
          <div key={i} className="tc-signal tc-signal--bull">↑ {s}</div>
        ))}
        {(watchFor?.warningSignals ?? []).map((s, i) => (
          <div key={i} className="tc-signal tc-signal--bear">↓ {s}</div>
        ))}
        {sources.length > 0 && (
          <div className="tc-sources">
            {sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="tc-source-link">
                {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="tc-section">
        <div className="tc-section-label">EXECUTE</div>
        {(robinhoodSteps ?? []).map((step, i) => (
          <div key={i} className="tc-step">
            <span className="tc-step-num">{i + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </>
  );
}
