import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOptionsChain } from '../../hooks/useOptionsChain';
import { findUnusualContracts, callPutRatio, flowSentiment, unusualTilt } from '../../utils/unusualSignals';
import ScannerInput from './ScannerInput';
import ScannerSummary from './ScannerSummary';
import UnusualTable from './UnusualTable';

const DEFAULT_FILTERS = {
  side: 'both',
  minVolume: 500,
  minVolOiRatio: 2.0,
  minDte: 7,
  maxDte: 120,
  deltaMin: 0.10,
  deltaMax: 0.50,
};

export default function Scanner() {
  const { ticker, data, loading, error, scan } = useOptionsChain();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const tableRef = useRef(null);

  const { unusual, cpRatio, sentiment, tilt } = useMemo(() => {
    if (!data?.contracts) return { unusual: [], cpRatio: null, sentiment: null, tilt: null };
    const unusual = findUnusualContracts(data.contracts, filters);
    const cp = callPutRatio(data.contracts);
    const sentiment = flowSentiment(cp.ratio);
    const tilt = unusualTilt(unusual);
    return { unusual, cpRatio: cp, sentiment, tilt };
  }, [data, filters]);

  function handleLowerThresholds() {
    setFilters(f => ({
      ...f,
      minVolOiRatio: Math.max(0.5, parseFloat((f.minVolOiRatio - 0.5).toFixed(1))),
      minVolume: Math.max(100, f.minVolume - 100),
    }));
  }

  return (
    <div className="scanner-page">
      <ScannerInput
        onScan={scan}
        loading={loading}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      <AnimatePresence mode="wait">
        {error && !loading && (
          <motion.div key="error" className="scanner-error"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p>{error}</p>
            <button className="scanner-retry-btn" onClick={() => scan(ticker)}>Retry</button>
          </motion.div>
        )}

        {loading && (
          <motion.div key="loading" className="scanner-loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="scanner-loading-dot" />
            <span>Fetching chain for {ticker || '…'}</span>
          </motion.div>
        )}

        {!loading && data && !error && (
          <motion.div key="results"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <ScannerSummary
              quote={data.quote}
              ticker={ticker}
              ivCurrent={data.ivCurrent}
              cpRatio={cpRatio}
              sentiment={sentiment}
              unusualCount={unusual.length}
              onScrollToTable={() => tableRef.current?.scrollIntoView({ behavior: 'smooth' })}
            />
            <div ref={tableRef}>
              <UnusualTable
                contracts={unusual}
                tilt={tilt}
                onLowerThresholds={handleLowerThresholds}
                ticker={ticker}
              />
            </div>
          </motion.div>
        )}

        {!loading && !data && !error && (
          <motion.div key="empty" className="scanner-empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="scanner-explainer">
              <p className="scanner-explainer__heading">How it works</p>
              <div className="scanner-explainer__item">
                <div className="scanner-explainer__body">
                  <span className="scanner-explainer__label">What is Vol/OI?</span>
                  <span className="scanner-explainer__text">Volume is contracts traded today. Open interest is contracts currently held. A Vol/OI ratio above 2× means today's activity is twice the standing position — that's unusual.</span>
                </div>
              </div>
              <div className="scanner-explainer__item">
                <div className="scanner-explainer__body">
                  <span className="scanner-explainer__label">What does it mean?</span>
                  <span className="scanner-explainer__text">High vol/OI can signal an earnings play, a hedge, or a sweep — most are institutional hedges or spread legs, not directional bets. Use it as a starting point for research, not a signal to trade.</span>
                </div>
              </div>
              <div className="scanner-explainer__item">
                <div className="scanner-explainer__body">
                  <span className="scanner-explainer__label">How to use</span>
                  <span className="scanner-explainer__text">Enter a ticker, review the contracts table, tap a row for full Greeks. Adjust filters if nothing shows — liquid tickers like NVDA, SPY, or AAPL tend to have the most activity.</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="scanner-disclaimer">
        Unusual options activity reflects observable market data, not insider knowledge. Most "unusual" prints are hedging or spread legs, not directional bets. This is educational analysis, not financial advice.
      </p>
    </div>
  );
}
