import { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Globe, Moon, Sun, LogOut, X } from "lucide-react";
import { fetchRecommendation } from "./api";
import { useSearchHistory, SearchHistory } from "./components/SearchHistory";
import LoadingMessages from "./components/LoadingMessages";
import TradeCard from "./components/TradeCard";
import ErrorBoundary from "./components/ErrorBoundary";
import AnalysisTabs from "./components/AnalysisTabs";
import AuthModal from "./components/AuthModal";
import LearnPage from "./components/LearnPage";
import { useAuth } from "./components/AuthContext";
import "./styles.css";

const MAX_TABS = 6;

function makeAnalysis(ticker) {
  return {
    id: Date.now().toString(),
    ticker: ticker || "",
    status: "loading",
    result: null,
    progress: null,
    error: null,
    analysedAt: null,
    strategyType: "neutral",
  };
}

export default function App() {
  const [ticker, setTicker] = useState("");
  const [analyses, setAnalyses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const { history, addEntry, clearHistory } = useSearchHistory();
  const { user, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const showLearn = pathname === "/learn";
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const avatarRef = useRef(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const close = () => setShowUserMenu(false);
    const t = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", close); };
  }, [showUserMenu]);

  function openUserMenu() {
    if (avatarRef.current) {
      const r = avatarRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setShowUserMenu(m => !m);
  }

  const update = (id, patch) =>
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));

  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("oa-theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("oa-theme", dark ? "dark" : "light");
  }, [dark]);

  function openTab(analysis) {
    setAnalyses(prev => {
      let next = [analysis, ...prev];
      if (next.length > MAX_TABS) {
        // drop oldest non-active tab
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

  async function handleAnalyze(explicitTicker) {
    const t = (explicitTicker !== undefined ? explicitTicker : ticker).trim();
    if (explicitTicker !== undefined) setTicker(explicitTicker);

    if (t && !/^[A-Z]{1,5}([.\-][A-Z]{0,2})?$/.test(t)) {
      const errAnalysis = {
        ...makeAnalysis(t),
        status: "error",
        error: `"${t}" doesn't look like a valid US ticker. Try NVDA, SPY, or BRK.B.`,
      };
      openTab(errAnalysis);
      return;
    }

    const a = makeAnalysis(t);
    openTab(a);

    try {
      const data = await fetchRecommendation(t, progress => update(a.id, { progress }));
      update(a.id, {
        status: "done",
        result: data,
        analysedAt: new Date(),
        strategyType: data.trades?.[0]?.strategyType ?? "neutral",
      });
      if (data.trades?.[0]) addEntry(t, data.trades[0], data);
    } catch (e) {
      update(a.id, { status: "error", error: e.message || "Could not generate a recommendation. Please try again." });
      console.error(e);
    }
  }

  const active = analyses.find(a => a.id === activeId) ?? null;
  const [nudgeDismissed, setNudgeDismissed] = useState(
    () => localStorage.getItem("oa-nudge-dismissed") === "1"
  );
  const showNudge = !user && !nudgeDismissed && analyses.length >= 3;

  function dismissNudge() {
    setNudgeDismissed(true);
    localStorage.setItem("oa-nudge-dismissed", "1");
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
          <div className="header-actions">
            <button
              className={`learn-btn${showLearn ? " learn-btn--active" : ""}`}
              onClick={() => navigate(showLearn ? "/" : "/learn")}
            >
              Learn
            </button>
            <button className="theme-toggle" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            {user ? (
              <button className="avatar-btn" ref={avatarRef} onClick={openUserMenu}>
                {user.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="" className="avatar-img" />
                  : <span className="avatar-initials">{(user.email?.[0] ?? "?").toUpperCase()}</span>
                }
              </button>
            ) : (
              <button className="signin-btn" onClick={() => setShowAuth(true)}>Sign in</button>
            )}
          </div>
        </div>
      </header>

      <main className={`app-main${!showLearn && analyses.length === 0 ? " app-main--landing" : ""}`}>
        <Routes>
          <Route path="/learn" element={<LearnPage />} />
        </Routes>

        <div className="search-wrap" style={{ display: showLearn ? "none" : undefined }}>
          <div className="search-bar">
            <input
              id="ticker-input"
              name="ticker"
              className="search-input"
              type="text"
              placeholder="Enter a ticker — NVDA, SPY, TSLA — or leave blank to scan the market"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10))}
              onKeyDown={e => e.key === "Enter" && handleAnalyze()}
              autoComplete="off"
              spellCheck="false"
            />
            <button className="search-btn" onClick={() => handleAnalyze()}>
              Analyze
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

        {!showLearn && showNudge && (
          <div className="signin-nudge">
            <span>Sign in to save your analyses across devices</span>
            <button className="signin-nudge-btn" onClick={() => setShowAuth(true)}>Sign in</button>
            <button className="signin-nudge-close" onClick={dismissNudge}><X size={11} /></button>
          </div>
        )}

        {!showLearn && (
          <AnalysisTabs
            analyses={analyses}
            activeId={activeId}
            onSelect={setActiveId}
            onClose={closeTab}
          />
        )}

        {!showLearn && <AnimatePresence mode="wait">
          {!active && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="landing">
                <p className="landing-label">Popular tickers</p>
                <div className="landing-chips">
                  {["NVDA", "AAPL", "TSLA", "SPY", "AMZN", "META"].map(t => (
                    <button key={t} className="landing-chip" onClick={() => handleAnalyze(t)}>{t}</button>
                  ))}
                </div>
                <button className="landing-scan" onClick={() => handleAnalyze("")}>
                  Scan market for best opportunity →
                </button>
                <button className="landing-learn-link" onClick={() => navigate("/learn")}>
                  New to options? Learn the basics →
                </button>
              </div>
            </motion.div>
          )}

          {active?.status === "loading" && (
            <motion.div key={`loading-${active.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingMessages ticker={active.ticker} progress={active.progress} />
            </motion.div>
          )}

          {active?.status === "error" && (
            <motion.div key={`error-${active.id}`} className="error-bar"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AlertTriangle size={15} />
              <span>{active.error}</span>
            </motion.div>
          )}

          {active?.status === "done" && active.result && (
            <motion.div key={`done-${active.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {active.result.marketContext && (
                <div className="market-banner">
                  <Globe size={13} className="market-icon" />
                  <span className="market-label">Market</span>
                  <span className="market-text">{active.result.marketContext}</span>
                  {active.analysedAt && (
                    <span className="analysis-time">
                      Analysed {active.analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {active.analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              )}
              {active.result.trades?.map((trade, i) => (
                <ErrorBoundary key={i}>
                  <TradeCard trade={trade} index={i} analysedAt={active.analysedAt} marketContext={active.result.marketContext} />
                </ErrorBoundary>
              ))}
              {active.result.disclaimer && <p className="disclaimer">{active.result.disclaimer}</p>}
            </motion.div>
          )}
        </AnimatePresence>}
      </main>
      {showUserMenu && (
        <div className="user-menu" style={{ top: menuPos.top, right: menuPos.right }} onClick={() => setShowUserMenu(false)}>
          <div className="user-menu-email">{user?.email}</div>
          <button className="user-menu-item" onClick={signOut}>
            <LogOut size={12} /> Sign out
          </button>
        </div>
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
