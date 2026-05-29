import { useState, useCallback, useRef } from 'react';

export function useOptionsChain() {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const scan = useCallback(async (sym) => {
    if (!sym) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/market?ticker=${sym}&chain=full`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`Market data unavailable (${res.status})`);
      const json = await res.json();
      if (json.error) throw new Error(`Options data unavailable for ${sym.toUpperCase()}`);

      // Flatten nested chains into a flat contract array
      const contracts = (json.chains ?? []).flatMap(chain =>
        (chain.options ?? []).map(opt => ({
          ...opt,
          side: opt.type,             // 'call' | 'put'
          expiration: chain.expiry,   // 'YYYY-MM-DD'
          dte: chain.daysToExpiry,    // integer, pre-computed by Worker
        }))
      );

      setData({ ...json, contracts });
      setTicker(sym.toUpperCase());
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { ticker, data, loading, error, scan };
}
