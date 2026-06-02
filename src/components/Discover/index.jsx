import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useMarketData } from "../../hooks/useMarketData";
import Leaderboard from "./Leaderboard.jsx";

function freshness(sweptAt) {
  if (!sweptAt) return "";
  const d = new Date(sweptAt);
  return `as of ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export default function Discover({ onAnalyze }) {
  const { discover, search, loading, error, loadDiscover, searchTicker, clearSearch } = useMarketData();
  const [input, setInput] = useState("");

  useEffect(() => { loadDiscover(false); }, [loadDiscover]);

  const prints = search?.contracts ?? discover?.prints ?? [];

  return (
    <div className="disc-page">
      <div className="disc-header">
        <h1 className="disc-title">What's unusual today</h1>
        <div className="disc-header-meta">
          {discover?.sweptAt && <span className="disc-ts">{freshness(discover.sweptAt)}{discover.stale ? " · stale" : ""}</span>}
          <button className="disc-refresh" disabled={loading} onClick={() => { clearSearch(); loadDiscover(true); }}>
            <RefreshCw size={12} /> {loading && !search ? "Sweeping…" : "Refresh"}
          </button>
        </div>
      </div>

      <form className="disc-search" onSubmit={(e) => { e.preventDefault(); const s = input.trim().toUpperCase(); if (s) searchTicker(s); }}>
        <input
          className="disc-search-input"
          placeholder="Search any ticker"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10))}
          autoComplete="off" spellCheck="false"
        />
        <button className="disc-search-btn" type="submit" disabled={loading || !input.trim()}>Scan</button>
        {search && <button type="button" className="disc-clear-btn" onClick={() => { setInput(""); clearSearch(); }}>Clear</button>}
      </form>

      {error && <div className="disc-error">{error}</div>}
      {loading && !prints.length ? (
        <div className="disc-loading"><span className="disc-dot" /> {search ? `Loading ${search.ticker}…` : "Sweeping the market…"}</div>
      ) : (
        <Leaderboard prints={prints} onAnalyze={onAnalyze} />
      )}

      <p className="disc-disclaimer">
        Unusual options activity reflects observable market data, not insider knowledge. Most "unusual" prints are hedges or multi-leg strategies, not directional bets. Educational analysis, not financial advice.
      </p>
    </div>
  );
}
