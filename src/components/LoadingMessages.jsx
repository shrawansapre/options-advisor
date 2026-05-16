import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { fmtElapsed } from "../utils";

const TIERS = [
  { key: "conservative", label: "Conservative", color: "green" },
  { key: "moderate",     label: "Moderate",     color: "amber" },
  { key: "aggressive",   label: "Aggressive",   color: "red"   },
];

const STAGES = ["marketData", "research", "strategies", "critic"];

function stageIdx(s) { return STAGES.indexOf(s); }

function completedLabel(key, { liveDataOk, searchCount, criticDone }) {
  if (key === "marketData") return liveDataOk ? "Live options chain & Greeks loaded" : "Using web search for market data";
  if (key === "research")   return `Searched news & catalysts${searchCount > 1 ? ` (${searchCount} searches)` : ""}`;
  if (key === "strategies") return "3 trade strategies built";
  if (key === "critic")     return criticDone
    ? `${criticDone.passed} of 3 trades validated${criticDone.failed ? ` · ${criticDone.failed} refined` : ""}`
    : "Trades validated";
  return null;
}

function activeLabel(stage, criticMessage) {
  if (stage === "marketData") return "Fetching live options chain…";
  if (stage === "research")   return "Searching news & catalysts…";
  if (stage === "strategies") return "Building 3 strategies…";
  if (stage === "critic")     return criticMessage;
}

export default function LoadingMessages({ ticker, progress, startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  const [stage, setStage]             = useState("marketData");
  const [liveDataOk, setLiveDataOk]   = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [tierStatus, setTierStatus]   = useState(null);
  const [finding, setFinding]         = useState(null);
  const [criticMessage, setCriticMessage] = useState("Validating trades against live data…");
  const [criticDone, setCriticDone]   = useState(null);

  useEffect(() => {
    if (!progress) return;
    const { type } = progress;

    if (type === "marketData") {
      setLiveDataOk(progress.ok);
      setStage(s => stageIdx("research") > stageIdx(s) ? "research" : s);
    } else if (type === "search") {
      setSearchCount(progress.count);
      setStage(s => stageIdx("research") > stageIdx(s) ? "research" : s);
    } else if (type === "text") {
      const last = progress.strings?.[progress.strings.length - 1];
      if (last) setFinding(last);
    } else if (type === "strategies") {
      setTierStatus(progress.tiers);
      setFinding(null);
      setStage(s => stageIdx("strategies") > stageIdx(s) ? "strategies" : s);
    } else if (type === "critic") {
      setStage(s => stageIdx("critic") > stageIdx(s) ? "critic" : s);
      if (progress.status === "retrying") {
        setCriticMessage(`Refining ${progress.tier} trade…`);
      } else if (progress.status === "done") {
        setCriticDone({ passed: progress.passed, failed: progress.failed });
      }
    }
  }, [progress]);

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const curIdx = stageIdx(stage);
  const completedStages = STAGES.slice(0, curIdx);
  const isStrategies = stage === "strategies";
  const meta = { liveDataOk, searchCount, criticDone };

  return (
    <div className="loading-wrap">
      <motion.div
        className="loading-panel"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="lp-header">
          <div className="lp-pulse-dot" />
          <span className="lp-title">
            {ticker
              ? <><span className="lp-dim">Analyzing </span><strong>{ticker}</strong></>
              : "Scanning the market"}
          </span>
          {liveDataOk && (
            <span className="lp-live-chip">
              <span className="lp-live-chip-dot" />Live data
            </span>
          )}
          {elapsed > 0 && <span className="lp-elapsed">{fmtElapsed(elapsed)}</span>}
        </div>

        <div className="lp-steps">
          <AnimatePresence initial={false}>
            {completedStages.map(key => (
              <motion.div
                key={key}
                className={`lp-step lp-step--done${key === "marketData" && liveDataOk ? " lp-step--live" : ""}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22 }}
              >
                <CheckCircle2 size={11} className={`lp-check-icon${key === "marketData" && liveDataOk ? " lp-check-icon--live" : ""}`} />
                <span>{completedLabel(key, meta)}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              className="lp-step lp-step--active"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <div className="lp-step-dot" />
              <span>{activeLabel(stage, criticMessage)}</span>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {finding && (
              <motion.div
                key={finding}
                className="lp-finding"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                {finding}
              </motion.div>
            )}
          </AnimatePresence>

          {isStrategies && (
            <motion.div
              className="lp-strategies"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {TIERS.map(({ key, label, color }) => {
                const done = tierStatus?.[key] === "done";
                return (
                  <motion.div
                    key={key}
                    className={`lp-tier-pill lp-tier-pill--${color}${done ? " lp-tier-pill--done" : ""}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {done ? <CheckCircle2 size={12} className="lp-tier-icon" /> : <div className="lp-step-dot" />}
                    <span>{label}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
