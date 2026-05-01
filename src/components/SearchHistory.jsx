import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, ChevronRight, X } from "lucide-react";
import { supabase } from "../lib/supabase";
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

  // Load from Supabase when signed in
  useEffect(() => {
    if (!user || !supabase) return;
    supabase
      .from("analyses")
      .select("id, ticker, strategy, strategy_type, result_json, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data) return;
        const rows = data.map(r => ({
          id: r.id,
          ticker: r.ticker || "",
          ts: r.created_at,
          strategy: r.strategy || "",
          strategyType: r.strategy_type || "neutral",
          confidenceScore: r.result_json?.trades?.[0]?.summary?.confidenceScore ?? 0,
          result: r.result_json,
        }));
        setHistory(rows);
      });
  }, [user]);

  // Migrate localStorage → Supabase on first sign-in
  useEffect(() => {
    if (!user || !supabase) return;
    const local = (() => {
      try { return JSON.parse(localStorage.getItem("oa-history") || "[]"); }
      catch { return []; }
    })();
    if (!local.length) return;

    const rows = local.map(h => ({
      user_id: user.id,
      ticker: h.ticker || "",
      strategy: h.strategy || "",
      strategy_type: h.strategyType || "neutral",
      result_json: h.result ?? null,
      created_at: h.ts,
    }));

    supabase.from("analyses").insert(rows).then(() => {
      localStorage.removeItem("oa-history");
    });
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

    if (user && supabase) {
      const { data } = await supabase.from("analyses").insert({
        user_id: user.id,
        ticker: entry.ticker,
        strategy: entry.strategy,
        strategy_type: entry.strategyType,
        result_json: fullResult ?? null,
      }).select("id").single();
      if (data) entry.id = data.id;
    }

    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    if (!user) {
      try { localStorage.setItem("oa-history", JSON.stringify(next)); } catch (_) {}
    }
  }

  async function clearHistory() {
    setHistory([]);
    if (user && supabase) {
      await supabase.from("analyses").delete().eq("user_id", user.id);
    } else {
      try { localStorage.removeItem("oa-history"); } catch (_) {}
    }
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
