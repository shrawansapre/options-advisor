import { ChevronRight, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";

export default function SignalsSection({ watchFor, sources, robinhoodSteps }) {
  return (
    <>
      <div className="card signals-card">
        <div className="signals-cols">
          <div>
            <div className="signals-head green-text"><TrendingUp size={13} /> Bullish signals</div>
            <ul className="signal-list">
              {(watchFor?.bullishSignals ?? []).map((s, i) => (
                <li key={i}><ChevronRight size={11} className="signal-arrow green-text" /><span>{s}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="signals-head red-text"><TrendingDown size={13} /> Warning signs</div>
            <ul className="signal-list">
              {(watchFor?.warningSignals ?? []).map((s, i) => (
                <li key={i}><ChevronRight size={11} className="signal-arrow red-text" /><span>{s}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="sources-bar">
          <span className="sources-bar-label"><ExternalLink size={10} /> Sources</span>
          {sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="sources-bar-link">
              {s.title}{i < sources.length - 1 && <span className="sources-bar-sep">·</span>}
            </a>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-label">How to execute</div>
        <div className="steps-flow">
          {(robinhoodSteps ?? []).map((step, i) => (
            <div key={i} className="step-row">
              <div className="step-num">{i + 1}</div>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
