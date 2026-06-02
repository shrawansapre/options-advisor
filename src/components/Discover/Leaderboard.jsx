import LeaderboardRow from "./LeaderboardRow.jsx";
import PrintCard from "./PrintCard.jsx";

const COLS = ["Ticker", "Contract", "$ Vol", "Vol/OI", "Dir", "Prob", "IV", ""];

export default function Leaderboard({ prints, onAnalyze }) {
  if (!prints?.length) {
    return <div className="disc-empty">Nothing unusual across the watch list right now. Try a ticker search above.</div>;
  }
  return (
    <>
      <div className="disc-desktop">
        <table className="disc-table">
          <thead><tr>{COLS.map((c, i) => <th key={i} className="disc-th">{c}</th>)}</tr></thead>
          <tbody>
            {prints.map((p, i) => <LeaderboardRow key={`${p.ticker}-${p.strike}-${p.side}-${i}`} print={p} onAnalyze={onAnalyze} />)}
          </tbody>
        </table>
      </div>
      <div className="disc-mobile">
        {prints.map((p, i) => <PrintCard key={`${p.ticker}-${p.strike}-${p.side}-${i}`} print={p} onAnalyze={onAnalyze} />)}
      </div>
    </>
  );
}
