import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Moon, Sun, LogOut, X } from "lucide-react";
import { fetchRecommendation } from "./api";
import { fmtElapsed } from "./utils";
import { useSearchHistory, SearchHistory } from "./components/SearchHistory";
import LoadingMessages from "./components/LoadingMessages";
import MultiTradeView from "./components/MultiTradeView";
import ErrorBoundary from "./components/ErrorBoundary";
import AnalysisTabs from "./components/AnalysisTabs";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./components/AuthContext";
import { useTheme } from "./hooks/useTheme";
import { useAnalysisState, makeAnalysis } from "./hooks/useAnalysisState";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/trade-card.css";
import "./styles/learn.css";

const LearnPage = lazy(() => import("./components/Learn"));

export default function App() {
  const [ticker, setTicker] = useState("");
  const [dark, toggleDark] = useTheme();
  const { analyses, activeId, active, setActiveId, openTab, closeTab, update, handleSelectCached } = useAnalysisState();
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
        elapsedMs: Date.now() - a.startedAt,
        strategyType: data.trades?.[0]?.strategyType ?? "neutral",
      });
      if (data.trades?.[0]) addEntry(t, data.trades[0], data);
    } catch (e) {
      update(a.id, { status: "error", error: e.message || "Could not generate an analysis. Please try again." });
    }
  }

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
          <button className="header-brand" onClick={() => { navigate("/"); setActiveId(null); }}>
            <span className="brand-mark">◈</span>
            <div className="header-text">
              <div className="header-title">Options Advisor</div>
              <div className="header-sub">AI-powered options analysis</div>
            </div>
          </button>
          <div className="header-actions">
            <button
              className={`learn-btn${showLearn ? " learn-btn--active" : ""}`}
              onClick={() => navigate(showLearn ? "/" : "/learn")}
            >
              Learn
            </button>
            <button className="theme-toggle" onClick={toggleDark} aria-label="Toggle theme">
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
          <Route path="/learn" element={<Suspense fallback={null}><LearnPage /></Suspense>} />
          <Route path="*" element={null} />
        </Routes>


        {!showLearn && !active && (
          <motion.div
            className="landing-hero"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="landing-eyebrow">Research · Strategy · Execution</p>
            <h1 className="landing-headline">
              The analysis desk<br />
              <em>you never had.</em>
            </h1>
          </motion.div>
        )}

        <div className={`search-wrap${!active && !showLearn ? " search-wrap--landing" : ""}`}
          style={{ display: showLearn ? "none" : undefined }}>
          <div className="search-bar">
            <input
              id="ticker-input"
              name="ticker"
              className="search-input"
              type="text"
              placeholder="Enter a ticker"
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
          <p className="search-hint">Educational purposes only</p>
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
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ delay: 0.1 }}>
              <div className="landing">
                <p className="landing-label">Popular</p>
                <div className="landing-chips">
                  {["NVDA", "AAPL", "TSLA", "SPY", "AMZN", "META"].map(t => (
                    <button key={t} className="landing-chip" onClick={() => handleAnalyze(t)}>{t}</button>
                  ))}
                </div>
                <SearchHistory
                  history={history}
                  onSelect={t => handleAnalyze(t)}
                  onSelectCached={handleSelectCached}
                  onClear={clearHistory}
                />
              </div>
            </motion.div>
          )}

          {active?.status === "loading" && (
            <motion.div key={`loading-${active.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingMessages ticker={active.ticker} progress={active.progress} startedAt={active.startedAt} />
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
                  <div className="market-banner-top">
                    <span className="market-label">Market</span>
                    {active.analysedAt && (
                      <span className="analysis-time">
                        Analysed {active.analysedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {active.analysedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="market-text">{active.result.marketContext}</p>
                </div>
              )}
              <MultiTradeView
                trades={active.result.trades}
                analysedAt={active.analysedAt}
                marketContext={active.result.marketContext}
                hasLiveData={active.result.hasLiveData}
                marketSessionLabel={active.result.marketSessionLabel}
              />
              {active.result.disclaimer && <p className="disclaimer">{active.result.disclaimer}</p>}
              {active.elapsedMs != null && (
                <p className="analyzed-in">Analyzed in {fmtElapsed(active.elapsedMs)}</p>
              )}
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
