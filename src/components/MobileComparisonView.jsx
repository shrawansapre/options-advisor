import { useState } from "react";
import { Accordion } from "@mantine/core";
import { AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";
import ShareMenu from "./TradeCard/ShareMenu";
import { checklistAuditorBatch } from "../agents/checklistAuditor";
import { PayoffChart, ThetaDecayChart } from "./TradeCharts";
import { parseBold } from "../utils";

const SECTION_ABBR = {
  "DTE Rules": "DTE",
  "IV Environment vs Strategy": "IV",
  "Profit Target & Stop Loss": "Exit",
  "Position Sizing": "Size",
  "Liquidity": "Liq",
  "Delta Checks (Short Strikes Only)": "Delta",
  "Delta Checks": "Delta",
  "Greeks Alignment": "GRK",
  "Strategy Match": "Match",
  "Retail Trap Scan": "Traps",
  "Final Gate": "Gate",
};

function sectionSummary(result, name) {
  if (!result) return "—";
  const section = result.sections?.find(s => s.name === name);
  if (!section) return "—";
  const items = section.items || [];
  const pass  = items.filter(i => i.status === "pass").length;
  const fail  = items.filter(i => i.status === "fail").length;
  const warn  = items.filter(i => i.status === "warning").length;
  const total = items.length;
  if (fail > 0) return `${pass}/${total} · ${fail}✗`;
  if (warn > 0) return `${pass}/${total} · ${warn}⚠`;
  return `${pass}/${total} passed`;
}

function sectionCellClass(result, name) {
  if (!result) return "";
  const section = result.sections?.find(s => s.name === name);
  if (!section) return "";
  const items = section.items || [];
  if (items.some(i => i.status === "fail")) return "mcv-cell--audit-fail";
  if (items.some(i => i.status === "warning")) return "mcv-cell--audit-warn";
  if (items.every(i => i.status === "needs_input")) return "mcv-cell--audit-ni";
  return "mcv-cell--audit-pass";
}

const TIER_COLOR = { conservative: "green", moderate: "amber", aggressive: "red" };
const TIER_LABEL = { conservative: "Conservative", moderate: "Moderate", aggressive: "Aggressive" };

function Row({ label, values, cellClass, cellClasses }) {
  return (
    <div className="mcv-row">
      <div className="mcv-row-label">{label}</div>
      {values.map((v, i) => {
        const cls = cellClasses?.[i] || cellClass || "";
        return <div key={i} className={`mcv-cell${cls ? " " + cls : ""}`}>{v ?? "—"}</div>;
      })}
    </div>
  );
}


const ITEM_STATUS_ICON  = { pass: "✓", fail: "✗", warning: "⚠", needs_input: "?" };
const ITEM_STATUS_CLASS = { pass: "mcv-cell--audit-pass", fail: "mcv-cell--audit-fail", warning: "mcv-cell--audit-warn", needs_input: "mcv-cell--audit-ni" };

export default function MobileComparisonView({ trades, chainData, analysedAt, hasLiveData, marketContext, initialAuditResults, onAuditComplete }) {
  const [activeChart, setActiveChart] = useState(0);
  const [auditState, setAuditState] = useState(initialAuditResults ? "done" : "idle");
  const [auditResults, setAuditResults] = useState(initialAuditResults ?? null);
  const [expandedSections, setExpandedSections] = useState(new Set());

  function toggleSection(name) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function runChecklist() {
    setAuditState("loading");
    try {
      const results = await checklistAuditorBatch({ trades, chainData });
      setAuditResults(results);
      setAuditState("done");
      onAuditComplete?.(results);
    } catch {
      setAuditState("idle");
    }
  }
  const first = trades[0];

  const td = trades.map(trade => {
    const isSpread = !!trade.strike2;
    const strikeDisplay = isSpread ? `$${trade.strike}/$${trade.strike2}` : `$${trade.strike}`;
    const maxProfitNum = parseFloat((trade.maxProfit ?? "").replace(/[^0-9.]/g, ""));
    const maxLossNum   = parseFloat((trade.maxLoss   ?? "").replace(/[^0-9.]/g, ""));
    const rrRatio = (!isNaN(maxProfitNum) && !isNaN(maxLossNum) && maxLossNum > 0)
      ? (maxProfitNum / maxLossNum).toFixed(1) + ":1" : "—";
    const deltaRaw = trade.greeks?.delta?.value;
    const deltaDisplay = deltaRaw != null
      ? (isNaN(+deltaRaw) ? deltaRaw : (+deltaRaw).toFixed(2))
      : "—";
    return { ...trade, strikeDisplay, rrRatio, deltaDisplay };
  });

  return (
    <div className="mcv">

      {/* Sticky header */}
      <div className="mcv-sticky">
        <div className="mcv-stock-row">
          <span className="mcv-ticker">{first.ticker}</span>
          <span className="mcv-price">${first.currentPrice}</span>
          <span className={`tc-data-badge tc-data-badge--${hasLiveData ? "live" : "web"}`}>
            {hasLiveData ? "Live" : "Web"}
          </span>
          {analysedAt && (
            <span className="mcv-time">
              {analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="mcv-col-headers">
          <div className="mcv-row-label" />
          {trades.map((trade, i) => {
            const color = TIER_COLOR[trade.riskTier] ?? "amber";
            const isExpired = trade.expiry && analysedAt && new Date(trade.expiry) < analysedAt;
            return (
              <div key={i} className={`mcv-col-header mcv-col-header--${color}`}>
                <div className="mcv-col-header-top">
                  <span className={`mcv-tier-label mcv-tier-label--${color}`}>
                    {TIER_LABEL[trade.riskTier] ?? `T${i + 1}`}
                  </span>
                  <ShareMenu
                    trade={trade}
                    analysedAt={analysedAt}
                    marketContext={marketContext}
                    snapshotRef={{ current: null }}
                  />
                </div>
                <span className="mcv-col-strategy">{trade.strategy}</span>
                {isExpired && (
                  <div className="mcv-expired"><AlertTriangle size={9} /> Expired</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mcv-content">
        <Accordion
          multiple
          aria-label="Trade comparison sections"
          defaultValue={["DETAILS", "METRICS", "THESIS", "ENTRY", "EXIT", "GREEKS", "SCENARIOS", "SIGNALS", "CHECKLIST"]}
          classNames={{
            item:    'mcv-accordion-item',
            control: 'mcv-accordion-control',
            chevron: 'mcv-accordion-chevron',
            panel:   'mcv-accordion-panel',
          }}
        >
          <Accordion.Item value="DETAILS">
            <Accordion.Control>DETAILS</Accordion.Control>
            <Accordion.Panel>
              <Row label="STRIKES" values={td.map(t => t.strikeDisplay)} />
              <Row label="EXPIRY"  values={td.map(t => t.expiryLabel)} />
              <Row label="DTE"     values={td.map(t => t.daysToExpiry)} />
              <Row label="ENTRY"   values={td.map(t => t.totalCost?.split(/\s/)[0] ?? "—")} />
              <Row label="WIN"     values={td.map(t => t.maxProfit)} cellClass="mcv-cell--profit" />
              <Row label="LOSS"    values={td.map(t => t.maxLoss)} cellClass="mcv-cell--loss" />
              <Row label="B/E"     values={td.map(t => `$${t.breakeven}`)} />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="METRICS">
            <Accordion.Control>METRICS</Accordion.Control>
            <Accordion.Panel>
              <Row label="IV"   values={td.map(t => t.ivRank)} />
              <Row label="Δ"    values={td.map(t => t.deltaDisplay)} />
              <Row label="PROB" values={td.map(t => t.predictions?.baseCase?.probability ?? "—")} />
              <Row label="R/R"  values={td.map(t => t.rrRatio)} />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="THESIS">
            <Accordion.Control>THESIS</Accordion.Control>
            <Accordion.Panel>
              <div className="mcv-text-row mcv-text-row--thesis">
                <div className="mcv-row-label" />
                {td.map((trade, i) => {
                  const rl = trade.riskLevel ?? 3;
                  const dots = [1,2,3,4,5].map(n => n <= rl ? "●" : "○").join("");
                  const lbl = rl <= 2 ? "Low" : rl <= 3 ? "Moderate" : "High";
                  const cls = rl <= 2 ? "green" : rl <= 3 ? "amber" : "red";
                  return (
                    <div key={i} className="mcv-text-cell">
                      <p className="mcv-body">{parseBold(trade.rationale)}</p>
                      <div className="mcv-risk-row">
                        <span className={`tc-risk-dots tc-risk-dots--${cls}`}>{dots}</span>
                        <span className={`tc-risk-label tc-risk-label--${cls}`}>{lbl}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="ENTRY">
            <Accordion.Control>ENTRY</Accordion.Control>
            <Accordion.Panel>
              <div className="mcv-text-row">
                <div className="mcv-row-label" />
                {td.map((trade, i) => {
                  const e = trade.entryTiming;
                  if (!e) return <div key={i} className="mcv-text-cell">—</div>;
                  return (
                    <div key={i} className="mcv-text-cell">
                      <span className={`tc-badge tc-badge--${e.canEnterNow ? "yes" : "no"} mcv-badge`}>
                        {e.canEnterNow ? "Enter now" : "Wait"}
                      </span>
                      {e.optimalEntry && <p className="mcv-body mcv-muted">{e.optimalEntry}</p>}
                      {e.condition && <p className="mcv-body mcv-muted">{e.condition}</p>}
                    </div>
                  );
                })}
              </div>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="EXIT">
            <Accordion.Control>EXIT</Accordion.Control>
            <Accordion.Panel>
              <div className="mcv-text-row">
                <div className="mcv-row-label" />
                {td.map((trade, i) => {
                  const ex = trade.exitStrategy;
                  if (!ex?.profitTarget) return <div key={i} className="mcv-text-cell">—</div>;
                  return (
                    <div key={i} className="mcv-text-cell">
                      <div className="mcv-exit-line">
                        <span className="mcv-exit-type">TGT</span>
                        <span className="mcv-exit-val green-text">+{ex.profitTarget.returnPct}%</span>
                      </div>
                      <div className="mcv-exit-line">
                        <span className="mcv-exit-type">STP</span>
                        <span className="mcv-exit-val red-text">−{ex.stopLoss?.lossPct}%</span>
                      </div>
                      {ex.timeStop && <p className="mcv-body mcv-muted">{ex.timeStop.rule}</p>}
                    </div>
                  );
                })}
              </div>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="GREEKS">
            <Accordion.Control>GREEKS</Accordion.Control>
            <Accordion.Panel>
              {[
                ["Δ", t => t.greeks?.delta?.value ?? "—"],
                ["Θ", t => t.greeks?.theta?.value ?? "—"],
                ["ν", t => t.greeks?.vega?.value ?? "—"],
                ["Γ", t => t.greeks?.gamma?.value ?? "—"],
              ].map(([sym, get]) => (
                <Row key={sym} label={sym} values={td.map(get)} />
              ))}
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="SCENARIOS">
            <Accordion.Control>SCENARIOS</Accordion.Control>
            <Accordion.Panel>
              {[
                { key: "bullCase", icon: "↑", cls: "bull" },
                { key: "baseCase", icon: "→", cls: "base" },
                { key: "bearCase", icon: "↓", cls: "bear" },
              ].map(({ key, icon, cls }) => (
                <div key={key} className="mcv-text-row">
                  <div className={`mcv-row-label mcv-scenario-icon mcv-scenario-icon--${cls}`}>{icon}</div>
                  {td.map((trade, i) => {
                    const d = trade.predictions?.[key] ?? {};
                    return (
                      <div key={i} className="mcv-text-cell">
                        <div className="mcv-scenario-meta">
                          <span className="mcv-scenario-prob">{d.probability ?? "—"}</span>
                          <span className={`mcv-scenario-ret mcv-scenario-ret--${cls}`}>{d.optionReturn ?? "—"}</span>
                        </div>
                        {d.scenario && <p className="mcv-body mcv-muted">{d.scenario}</p>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="SIGNALS">
            <Accordion.Control>SIGNALS</Accordion.Control>
            <Accordion.Panel>
              <div className="mcv-text-row">
                <div className="mcv-row-label" />
                {td.map((trade, i) => (
                  <div key={i} className="mcv-text-cell">
                    {(trade.watchFor?.bullishSignals ?? []).map((s, j) => (
                      <div key={j} className="tc-signal tc-signal--bull mcv-signal">↑ {s}</div>
                    ))}
                    {(trade.watchFor?.warningSignals ?? []).map((s, j) => (
                      <div key={j} className="tc-signal tc-signal--bear mcv-signal">↓ {s}</div>
                    ))}
                  </div>
                ))}
              </div>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="CHECKLIST">
            <Accordion.Control>TRADE DISCIPLINE CHECKLIST</Accordion.Control>
            <Accordion.Panel>
              {auditState === "idle" && (
                <div className="mcv-audit-trigger">
                  <button className="mcv-audit-btn" onClick={runChecklist}>Run Checklist</button>
                </div>
              )}
              {auditState === "loading" && (
                <div className="mcv-audit-trigger">
                  <span className="mcv-audit-status">Auditing…</span>
                </div>
              )}
              {auditState === "done" && auditResults && (() => {
                const sectionNames = auditResults.find(r => r)?.sections?.map(s => s.name) ?? [];
                const overallRow = auditResults.map(r => r
                  ? `${r.overallScore.passed}✓${r.overallScore.failed > 0 ? ` ${r.overallScore.failed}✗` : ""}${r.overallScore.warnings > 0 ? ` ${r.overallScore.warnings}⚠` : ""}`
                  : "—"
                );
                return (
                  <div className="mcv-audit-rows">
                    <Row label="Score" values={overallRow} />
                    {sectionNames.flatMap(name => {
                      const isOpen = expandedSections.has(name);
                      const refItems = auditResults.find(r => r)?.sections?.find(s => s.name === name)?.items ?? [];
                      const rows = [
                        <div key={name} className="mcv-row mcv-audit-section-row" onClick={() => toggleSection(name)}>
                          <div className="mcv-row-label mcv-audit-section-label">
                            <span className="mcv-audit-chevron-icon">{isOpen ? <ChevronDown size={8} /> : <ChevronRight size={8} />}</span>
                            <span className="mcv-audit-abbr">{SECTION_ABBR[name] ?? name.slice(0, 4)}</span>
                          </div>
                          {auditResults.map((r, i) => (
                            <div key={i} className={`mcv-cell ${sectionCellClass(r, name)}`}>{sectionSummary(r, name)}</div>
                          ))}
                        </div>
                      ];
                      if (isOpen) {
                        rows.push(
                          <div key={name + "-items"} className="mcv-text-row">
                            <div className="mcv-row-label" />
                            {auditResults.map((r, tradeIdx) => {
                              const sectionItems = r?.sections?.find(s => s.name === name)?.items ?? [];
                              return (
                                <div key={tradeIdx} className="mcv-text-cell">
                                  {refItems.map(refItem => {
                                    const it = sectionItems.find(i => i.label === refItem.label) ?? null;
                                    const icon = it ? (ITEM_STATUS_ICON[it.status] ?? "?") : "?";
                                    const cls  = it ? (ITEM_STATUS_CLASS[it.status] ?? "") : "";
                                    return (
                                      <div key={refItem.label} className="mcv-acol-item">
                                        <div className={`mcv-acol-status${cls ? " " + cls : ""}`}>
                                          {icon} {it?.label ?? refItem.label}
                                        </div>
                                        {it?.value && <div className="mcv-acol-value">{it.value}</div>}
                                        {it?.note && <div className={`mcv-acol-note${cls ? " " + cls : ""}`}>{it.note}</div>}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return rows;
                    })}
                  </div>
                );
              })()}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>

      {/* Full-width charts */}
      <div className="mcv-charts">
        <Accordion
          multiple
          aria-label="Trade charts"
          defaultValue={["CHARTS"]}
          classNames={{
            item:    'mcv-accordion-item',
            control: 'mcv-accordion-control',
            chevron: 'mcv-accordion-chevron',
            panel:   'mcv-accordion-panel',
          }}
        >
          <Accordion.Item value="CHARTS">
            <Accordion.Control>CHARTS</Accordion.Control>
            <Accordion.Panel>
              <div className="mcv-charts-tabs">
                {trades.map((trade, i) => {
                  const color = TIER_COLOR[trade.riskTier] ?? "amber";
                  return (
                    <button
                      key={i}
                      className={`mcv-charts-tab mcv-charts-tab--${color}${activeChart === i ? " mcv-charts-tab--active" : ""}`}
                      onClick={() => setActiveChart(i)}
                    >
                      {(TIER_LABEL[trade.riskTier] ?? `T${i + 1}`).slice(0, 3).toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <div className="mcv-charts-content">
                <PayoffChart trade={trades[activeChart]} />
                <ThetaDecayChart trade={trades[activeChart]} analysedAt={analysedAt} />
              </div>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>

    </div>
  );
}
