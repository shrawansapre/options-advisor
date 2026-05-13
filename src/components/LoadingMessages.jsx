import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { fmtElapsed } from "../utils";

const LOADING_MESSAGES = [
  "Pulling the live options chain…",
  "Checking IV rank against its 52-week range…",
  "Reading earnings calendars so you don't have to…",
  "Scanning news for hidden catalysts…",
  "Cross-referencing technical support and resistance…",
  "Verifying Greek values from the live option chain…",
  "Stress-testing the bear case…",
  "Building your three exit rules…",
  "Sourcing news article links…",
  "Assembling your Robinhood execution steps…",
];

const TIERS = [
  { key: "conservative", label: "Conservative", color: "green" },
  { key: "moderate",     label: "Moderate",     color: "amber" },
  { key: "aggressive",   label: "Aggressive",   color: "red"   },
];

export default function LoadingMessages({ ticker, progress, startedAt }) {
  const [index, setIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const isStrategiesPhase = progress?.type === "strategies";
  const tierStatus = isStrategiesPhase ? progress.tiers : null;
  const strings = (!isStrategiesPhase && progress?.type === "text") ? (progress.strings ?? []) : [];
  const isWriting = strings.length > 0;
  const searchCount = (!isStrategiesPhase && progress?.type === "search") ? progress.count : 0;

  useEffect(() => {
    if (isWriting || isStrategiesPhase) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setIndex(i => {
        setCompletedSteps(prev => [...prev, LOADING_MESSAGES[i]].slice(-5));
        return (i + 1) % LOADING_MESSAGES.length;
      });
    }, 2600);
    return () => clearInterval(intervalRef.current);
  }, [isWriting, isStrategiesPhase]);

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

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
            {isStrategiesPhase
              ? "Building strategies…"
              : ticker
                ? <><span className="lp-dim">Researching </span><strong>{ticker}</strong></>
                : "Scanning the market"}
          </span>
          <AnimatePresence>
            {searchCount > 0 && (
              <motion.span
                className="lp-search-badge"
                key={searchCount}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {searchCount} {searchCount === 1 ? "search" : "searches"}
              </motion.span>
            )}
          </AnimatePresence>
          {elapsed > 0 && (
            <span className="lp-elapsed">{fmtElapsed(elapsed)}</span>
          )}
        </div>

        {isStrategiesPhase ? (
          <motion.div
            className="lp-strategies"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
                  {done
                    ? <CheckCircle2 size={12} className="lp-tier-icon" />
                    : <div className="lp-step-dot" />}
                  <span>{label}</span>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="lp-steps">
            <AnimatePresence initial={false}>
              {completedSteps.map((step, i) => (
                <motion.div
                  key={i}
                  className="lp-step lp-step--done"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <CheckCircle2 size={11} className="lp-check-icon" />
                  <span>{step}</span>
                </motion.div>
              ))}
            </AnimatePresence>

            {!isWriting && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  className="lp-step lp-step--active"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="lp-step-dot" />
                  <span>{LOADING_MESSAGES[index]}</span>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

        {isWriting && (
          <motion.div
            className="lp-stream"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="lp-stream-label">Writing research report</div>
            <div className="lp-stream-lines">
              <AnimatePresence initial={false}>
                {strings.slice(-5).map((s, i, arr) => (
                  <motion.div
                    key={s.slice(0, 40)}
                    className={`lp-stream-line${i < arr.length - 1 ? " lp-stream-line--faded" : ""}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {s.length > 110 ? s.slice(0, 110) + "…" : s}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
