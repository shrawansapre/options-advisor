import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Globe, Moon, Sun } from "lucide-react";
import { fetchRecommendation } from "./api";
import { useSearchHistory, SearchHistory } from "./components/SearchHistory";
import LoadingMessages from "./components/LoadingMessages";
import TradeCard from "./components/TradeCard";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles.css";

export default function App() {
  const [ticker, setTicker]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult]     = useState(null);
  const [analysedAt, setAnalysedAt] = useState(null);
  const [error, setError]       = useState(null);
  const { history, addEntry, clearHistory } = useSearchHistory();

  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("oa-theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("oa-theme", dark ? "dark" : "light");
  }, [dark]);

  function handleSelectCached(cachedResult, cachedAt) {
    setResult(cachedResult);
    setAnalysedAt(cachedAt);
    setError(null);
    setTicker(cachedResult.trades?.[0]?.ticker ?? "");
  }

  async function handleAnalyze(explicitTicker) {
    const t = explicitTicker !== undefined ? explicitTicker : ticker.trim();
    if (explicitTicker !== undefined) setTicker(explicitTicker);

    if (t && !/^[A-Z]{1,5}([.\-][A-Z]{0,2})?$/.test(t)) {
      setError(`"${t}" doesn't look like a valid US ticker. Try something like NVDA, SPY, or BRK.B.`);
      return;
    }

    setLoading(true);
    setProgress(null);
    setError(null);
    setResult(null);
    try {
      const data = await fetchRecommendation(t, setProgress);
      setResult(data);
      const now = new Date();
      setAnalysedAt(now);
      if (data.trades?.[0]) addEntry(t, data.trades[0], data);
    } catch (e) {
      setError(e.message || "Could not generate a recommendation. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="brand-mark">◈</span>
            <div className="header-text">
              <div className="header-title">Options Advisor</div>
              <div className="header-sub">AI-powered analysis · For Robinhood</div>
            </div>
          </div>
          <button className="theme-toggle" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="search-wrap">
          <div className="search-bar">
            <input
              id="ticker-input"
              name="ticker"
              className="search-input"
              type="text"
              placeholder="Enter a ticker — NVDA, SPY, TSLA — or leave blank to scan the market"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10))}
              onKeyDown={e => e.key === "Enter" && !loading && handleAnalyze()}
              autoComplete="off"
              spellCheck="false"
            />
            <button className="search-btn" onClick={() => handleAnalyze()} disabled={loading}>
              {loading ? "…" : "Analyze"}
            </button>
          </div>
          <p className="search-hint">
            Live web search · Verified Greeks · Price, IV rank, news, technicals · Educational purposes only
          </p>
          <SearchHistory
            history={history}
            onSelect={t => handleAnalyze(t)}
            onSelectCached={handleSelectCached}
            onClear={clearHistory}
          />
        </div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingMessages ticker={ticker.trim()} progress={progress} />
            </motion.div>
          )}

          {error && (
            <motion.div key="error" className="error-bar"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <AlertTriangle size={15} />
              <span>{error}</span>
            </motion.div>
          )}

          {result && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {result.marketContext && (
                <div className="market-banner">
                  <Globe size={13} className="market-icon" />
                  <span className="market-label">Market</span>
                  <span className="market-text">{result.marketContext}</span>
                  {analysedAt && (
                    <span className="analysis-time">
                      Analysed {analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              )}
              {result.trades?.map((trade, i) => (
                <ErrorBoundary key={i}>
                  <TradeCard trade={trade} index={i} analysedAt={analysedAt} marketContext={result.marketContext} />
                </ErrorBoundary>
              ))}
              {result.disclaimer && <p className="disclaimer">{result.disclaimer}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
