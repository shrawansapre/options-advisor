import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

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

export default function LoadingMessages({ ticker, progress }) {
  const [index, setIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const intervalRef = useRef(null);

  const strings = progress?.type === "text" ? (progress.strings ?? []) : [];
  const isWriting = strings.length > 0;

  useEffect(() => {
    if (isWriting) {
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
  }, [isWriting]);

  const searchCount = progress?.type === "search" ? progress.count : 0;

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
        </div>

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

        {isWriting && (
          <motion.div
            className="lp-stream"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="lp-stream-label">Writing analysis</div>
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
