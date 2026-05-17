export default function ScenariosSection({ predictions }) {
  const cases = [
    { key: "bull", label: "BULL", data: predictions.bullCase, cls: "bull" },
    { key: "base", label: "BASE", data: predictions.baseCase, cls: "base" },
    { key: "bear", label: "BEAR", data: predictions.bearCase, cls: "bear" },
  ];

  return (
    <div className="tc-section">
      <div className="tc-section-label">SCENARIOS</div>
      {cases.map(({ key, label, data, cls }) => {
        const pctNum = parseInt(data.probability, 10) || 0;
        const filled = Math.round((pctNum / 100) * 32);
        const bar = "█".repeat(filled) + "░".repeat(32 - filled);
        return (
          <div key={key} className={`tc-scenario tc-scenario--${cls}`}>
            <div className="tc-scenario-top">
              <span className="tc-scenario-label">{label}</span>
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
