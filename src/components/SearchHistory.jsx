import { useState, useEffect, useRef } from "react";
import { useOutsideClick } from "../hooks/useOutsideClick";
import { motion, AnimatePresence } from "framer-motion";
import { History, ChevronRight, X } from "lucide-react";
import { clearRemoteHistory, importHistory, insertHistory, listHistory, updateHistory } from "../lib/account";
import { useAuth } from "./AuthContext";

export function useSearchHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("oa-history") || "[]"); }
    catch { return []; }
  });

  // Reset to localStorage when signed out
  useEffect(() => {
    if (user !== null) return;
    try { setHistory(JSON.parse(localStorage.getItem("oa-history") || "[]")); }
    catch { setHistory([]); }
  }, [user]);

  // Load cloud history when signed in, and move any guest history up with it.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const local = (() => {
        try { return JSON.parse(localStorage.getItem("oa-history") || "[]"); }
        catch { return []; }
      })();
      if (local.length) {
        const imported = await importHistory(local);
        if (imported) {
          try { localStorage.removeItem("oa-history"); } catch { /* ignore */ }
          if (!cancelled) setHistory(imported);
          return;
        }
      }
      const rows = await listHistory();
      if (!cancelled && rows) setHistory(rows);
    })();
    return () => { cancelled = true; };
  }, [user]);

  async function addEntry(ticker, trade, fullResult) {
    const entry = {
      id: Date.now().toString(),
      ticker: ticker || "",
      ts: new Date().toISOString(),
      strategy: trade.strategy ?? "",
      strategyType: trade.strategyType ?? "neutral",
      confidenceScore: trade.summary?.confidenceScore ?? 0,
      result: fullResult ?? null,
    };

    if (user) {
      const saved = await insertHistory({
        ticker: entry.ticker,
        strategy: entry.strategy,
        strategyType: entry.strategyType,
        result: fullResult ?? null,
        ts: entry.ts,
      });
      if (saved) {
        entry.id = saved.id;
        entry.ts = saved.ts;
      }
    }

    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    if (!user) {
      try { localStorage.setItem("oa-history", JSON.stringify(next)); } catch (_) {}
    }
  }

  async function updateEntry(analysedAt, resultPatch) {
    const ts = analysedAt instanceof Date ? analysedAt.toISOString() : analysedAt;
    const idx = history.findIndex(h => h.ts === ts);
    if (idx === -1) return;
    const updated = { ...history[idx], result: { ...history[idx].result, ...resultPatch } };
    const next = [...history];
    next[idx] = updated;
    setHistory(next);
    if (user) {
      await updateHistory(updated.id, updated.result);
    } else {
      try { localStorage.setItem("oa-history", JSON.stringify(next)); } catch (_) {}
    }
  }

  async function clearHistory() {
    setHistory([]);
    if (user) {
      await clearRemoteHistory();
    } else {
      try { localStorage.removeItem("oa-history"); } catch (_) {}
    }
  }

  return { history, addEntry, updateEntry, clearHistory };
}

export function SearchHistory({ history, onSelect, onSelectCached, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useOutsideClick(ref, () => setOpen(false), open);

  if (!history.length) return null;

  return (
    <div className="search-history" ref={ref}>
      <button className="history-toggle" onClick={() => setOpen(o => !o)}>
        <History size={11} />
        <span>Recent searches ({history.length})</span>
        <ChevronRight size={11} className={`history-chevron ${open ? "history-chevron--open" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="history-list"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {history.map(h => (
              <button key={h.id} className="history-row" onClick={() => { setOpen(false); h.result ? onSelectCached(h.result, new Date(h.ts)) : onSelect(h.ticker); }}>
                <span className={`history-dot history-dot--${h.strategyType}`} />
                <span className="history-ticker">{h.ticker || "Market scan"}</span>
                <span className="history-strategy">{h.strategy}</span>
                {(() => {
                  const t0 = h.result?.trades?.[0];
                  const strike = t0?.strike2 ? `$${t0.strike}/$${t0.strike2}` : t0?.strike ? `$${t0.strike}` : null;
                  const expiry = t0?.expiryLabel?.replace(/, \d{4}$/, "") ?? null;
                  return <>
                    <span className="history-strikes">{strike ?? "—"}</span>
                    <span className="history-expiry">{expiry ?? "—"}</span>
                  </>;
                })()}
                <span className="history-meta">
                  {new Date(h.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(h.ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
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
