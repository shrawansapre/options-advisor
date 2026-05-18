import { useState, useEffect } from "react";
import { checklistAuditor } from "../../agents/checklistAuditor.js";

const STATUS_ICON = { pass: "✓", fail: "✗", warning: "⚠", needs_input: "?" };

function AuditItem({ item }) {
  return (
    <div className={`audit-item audit-item--${item.status}`}>
      <span className="audit-item-icon">{STATUS_ICON[item.status] ?? "?"}</span>
      <div className="audit-item-body">
        <div className="audit-item-label">{item.label}</div>
        <div className="audit-item-data">{item.value} · {item.threshold}</div>
        {item.note ? <div className="audit-item-note">{item.note}</div> : null}
      </div>
    </div>
  );
}

function AuditSection({ section, defaultOpen }) {
  const hasConcerns = section.items.some(i => i.status !== "pass");
  const [open, setOpen] = useState(defaultOpen ?? hasConcerns);
  const failCount = section.items.filter(i => i.status === "fail").length;
  const warnCount = section.items.filter(i => i.status === "warning").length;
  const passCount = section.items.filter(i => i.status === "pass").length;

  const total = section.items.length;
  const summary = `${passCount}/${total} passed${failCount > 0 ? ` · ${failCount} failed` : warnCount > 0 ? ` · ${warnCount} ⚠` : ""}`;

  return (
    <div className="audit-section">
      <button className="audit-section-header" onClick={() => setOpen(o => !o)}>
        <span className="audit-section-chevron">{open ? "▼" : "▶"}</span>
        <span className="audit-section-name">{section.name}</span>
        <span className={`audit-section-summary audit-section-summary--${failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "pass"}`}>
          {summary}
        </span>
      </button>
      {open && (
        <div className="audit-section-items">
          {section.items.map((item, i) => <AuditItem key={i} item={item} />)}
        </div>
      )}
    </div>
  );
}

export default function ChecklistSection({ trade, chainData, initialResult, noHeader }) {
  const [loadState, setLoadState] = useState(initialResult ? "loaded" : "idle");
  const [result, setResult] = useState(initialResult ?? null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (initialResult) {
      setResult(initialResult);
      setLoadState("loaded");
    }
  }, [initialResult]);

  async function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && loadState === "idle") {
      setLoadState("loading");
      try {
        const r = await checklistAuditor({ trade, chainData });
        setResult(r);
        setLoadState("loaded");
      } catch {
        setLoadState("error");
      }
    }
  }

  const dotColor =
    loadState !== "loaded" ? null
    : result.criticalFlags?.length > 0 || result.overallScore?.failed > 0 ? "red"
    : result.overallScore?.warnings > 0 ? "amber"
    : "green";

  function headerSummary() {
    if (loadState === "idle") return null;
    if (loadState === "loading") return <span className="checklist-loading-indicator">Auditing…</span>;
    if (loadState === "error") return <span className="checklist-unavailable">Unavailable</span>;
    const { passed = 0, failed = 0, warnings = 0, needsInput = 0 } = result.overallScore ?? {};
    return (
      <span className="checklist-score-inline">
        <span className="checklist-score-pass">{passed}✓</span>
        {failed > 0 && <span className="checklist-score-fail">{failed}✗</span>}
        {warnings > 0 && <span className="checklist-score-warn">{warnings}⚠</span>}
        {needsInput > 0 && <span className="checklist-score-input">{needsInput}?</span>}
      </span>
    );
  }

  const showBody = noHeader ? loadState === "loaded" : (expanded && loadState === "loaded");

  return (
    <div className="checklist-wrap">
      {!noHeader && (
        <button className="checklist-toggle" onClick={handleToggle}>
          <div className="checklist-toggle-row">
            <span className="checklist-chevron">{expanded ? "▼" : "▶"}</span>
            <span className="checklist-title">Trade Discipline Checklist</span>
            {dotColor && <span className={`checklist-dot checklist-dot--${dotColor}`} />}
          </div>
          {loadState !== "idle" && (
            <div className="checklist-toggle-score">{headerSummary()}</div>
          )}
        </button>
      )}

      {showBody && result && (
        <div className="checklist-body">
          {result.criticalFlags?.length > 0 && (
            <div className="checklist-critical">
              {result.criticalFlags.map((flag, i) => (
                <div key={i} className="checklist-critical-item">⚠ {flag}</div>
              ))}
            </div>
          )}
          <div className="checklist-sections">
            {(result.sections ?? []).map((section, i) => (
              <AuditSection key={i} section={section} defaultOpen={noHeader ? true : undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
