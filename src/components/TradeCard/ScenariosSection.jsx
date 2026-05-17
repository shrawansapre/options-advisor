export default function ScenariosSection({ predictions }) {
  if (!predictions) return null;

  const cases = [
    { key: "bull", label: "BULL", icon: "↑", data: predictions.bullCase ?? {}, cls: "bull" },
    { key: "base", label: "BASE", icon: "→", data: predictions.baseCase ?? {}, cls: "base" },
    { key: "bear", label: "BEAR", icon: "↓", data: predictions.bearCase ?? {}, cls: "bear" },
  ];

  return (
    <div className="tc-section">
      <div className="tc-section-label">SCENARIOS</div>
      {cases.map(({ key, label, icon, data, cls }) => {
        const pctNum = parseInt(data.probability ?? "0", 10) || 0;
        const filled = Math.round((pctNum / 100) * 32);
        const bar = "█".repeat(filled) + "░".repeat(32 - filled);
        return (
          <div key={key} className={`tc-scenario tc-scenario--${cls}`}>
            <div className="tc-scenario-top">
              <span className="tc-scenario-label">
                <span className="tc-scenario-icon">{icon}</span>{label}
              </span>
              <span className="tc-scenario-prob">{data.probability}</span>
              <span className="tc-scenario-return">{data.optionReturn}</span>
              <span className="tc-scenario-target">{data.stockTarget}</span>
            </div>
            <div className="tc-scenario-bar">{bar}</div>
            <p className="tc-scenario-desc">{data.scenario}</p>
          </div>
        );
      })}
    </div>
  );
}
