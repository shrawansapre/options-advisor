import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, ChevronRight, X } from "lucide-react";

export function useSearchHistory() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("oa-history") || "[]"); }
    catch { return []; }
  });

  function addEntry(ticker, trade, fullResult) {
    const entry = {
      id: Date.now().toString(),
      ticker: ticker || "",
      ts: new Date().toISOString(),
      strategy: trade.strategy ?? "",
      strategyType: trade.strategyType ?? "neutral",
      confidenceScore: trade.summary?.confidenceScore ?? 0,
      result: fullResult ?? null,
    };
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    try { localStorage.setItem("oa-history", JSON.stringify(next)); } catch (_) {}
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem("oa-history"); } catch (_) {}
  }

  return { history, addEntry, clearHistory };
}

export function SearchHistory({ history, onSelect, onSelectCached, onClear }) {
  const [open, setOpen] = useState(false);
  if (!history.length) return null;

  return (
    <div className="search-history">
      <button className="history-toggle" onClick={() => setOpen(o => !o)}>
        <History size={11} />
        <span>Recent searches ({history.length})</span>
        <ChevronRight size={11} className={`history-chevron ${open ? "history-chevron--open" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="history-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            {history.map(h => (
              <button key={h.id} className="history-row" onClick={() => h.result ? onSelectCached(h.result, new Date(h.ts)) : onSelect(h.ticker)}>
                <span className={`history-dot history-dot--${h.strategyType}`} />
                <span className="history-ticker">{h.ticker || "Market scan"}</span>
                <span className="history-strategy">{h.strategy}</span>
                <span className="history-meta">
                  {h.confidenceScore}% · {new Date(h.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </button>
            ))}
            <button className="history-clear-btn" onClick={onClear}>
              <X size={10} /><span>Clear history</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
