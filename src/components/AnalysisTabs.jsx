import { STRATEGY_COLORS } from "../utils";

function TabSpinner() {
  return <span className="tab-spinner" aria-hidden="true" />;
}

export default function AnalysisTabs({ analyses, activeId, onSelect, onClose }) {
  if (!analyses.length) return null;

  return (
    <div className="tab-bar" role="tablist">
      {analyses.map(a => {
        const isActive = a.id === activeId;
        const dot = a.status === "done"
          ? STRATEGY_COLORS[a.strategyType] || STRATEGY_COLORS.neutral
          : null;

        return (
          <button
            key={a.id}
            role="tab"
            aria-selected={isActive}
            className={`tab tab--${a.status}${isActive ? " tab--active" : ""}`}
            onClick={() => onSelect(a.id)}
          >
            {a.status === "loading"
              ? <TabSpinner />
              : <span className="tab-dot" style={{ background: dot }} />
            }
            <span className="tab-ticker">{a.ticker || "Market"}</span>
            <span
              className="tab-close"
              role="button"
              aria-label="Close tab"
              onClick={e => { e.stopPropagation(); onClose(a.id); }}
            >
              ×
            </span>
          </button>
        );
      })}
    </div>
  );
}
