import { useState } from "react";

const MAX_TABS = 6;

export function makeAnalysis(ticker) {
  return {
    id: Date.now().toString(),
    ticker: ticker || "",
    status: "loading",
    result: null,
    progress: null,
    error: null,
    analysedAt: null,
    startedAt: Date.now(),
    elapsedMs: null,
    strategyType: "neutral",
  };
}

export function useAnalysisState() {
  const [analyses, setAnalyses] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const active = analyses.find(a => a.id === activeId) ?? null;

  const update = (id, patch) =>
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));

  function openTab(analysis) {
    setAnalyses(prev => {
      let next = [analysis, ...prev];
      if (next.length > MAX_TABS) {
        const dropIdx = [...next].reverse().findIndex(a => a.id !== activeId && a.id !== analysis.id);
        if (dropIdx !== -1) next.splice(next.length - 1 - dropIdx, 1);
      }
      return next;
    });
    setActiveId(analysis.id);
  }

  function closeTab(id) {
    setAnalyses(prev => {
      const next = prev.filter(a => a.id !== id);
      if (activeId === id && next.length) {
        const idx = Math.max(0, prev.findIndex(a => a.id === id) - 1);
        setActiveId(next[Math.min(idx, next.length - 1)].id);
      } else if (!next.length) {
        setActiveId(null);
      }
      return next;
    });
  }

  function handleSelectCached(cachedResult, cachedAt) {
    const existing = analyses.find(a =>
      a.analysedAt?.toISOString() === cachedAt?.toISOString()
    );
    if (existing) { setActiveId(existing.id); return; }

    const a = {
      ...makeAnalysis(cachedResult.trades?.[0]?.ticker ?? ""),
      status: "done",
      result: cachedResult,
      analysedAt: cachedAt,
      strategyType: cachedResult.trades?.[0]?.strategyType ?? "neutral",
    };
    openTab(a);
  }

  function resetState() {
    setAnalyses([]);
    setActiveId(null);
  }

  return { analyses, activeId, active, setActiveId, openTab, closeTab, update, handleSelectCached, resetState };
}
