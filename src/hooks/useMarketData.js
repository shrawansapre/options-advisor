import { useState, useCallback, useRef } from "react";

function authHeaders() {
  const h = {};
  if (import.meta.env.VITE_INTERNAL_TOKEN) h["X-Internal-Token"] = import.meta.env.VITE_INTERNAL_TOKEN;
  return h;
}

export function useMarketData() {
  const [discover, setDiscover] = useState(null);   // { prints, flow, sweptAt, stale, universeSize }
  const [search, setSearch] = useState(null);        // { ticker, contracts, quote, ivCurrent }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const loadDiscover = useCallback(async (force = false) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE ?? ""}/discover${force ? "?refresh=1" : ""}`,
        { signal: controller.signal, headers: authHeaders() }
      );
      if (!res.ok) throw new Error(`Discover unavailable (${res.status})`);
      setDiscover(await res.json());
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchTicker = useCallback(async (sym) => {
    if (!sym) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearch({ ticker: sym.toUpperCase(), contracts: null });
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE ?? ""}/market?ticker=${sym}&chain=full`,
        { signal: controller.signal, headers: authHeaders() }
      );
      if (!res.ok) throw new Error(`Market data unavailable (${res.status})`);
      const json = await res.json();
      if (json.error) throw new Error(`Options data unavailable for ${sym.toUpperCase()}`);
      const contracts = (json.chains ?? []).flatMap((chain) =>
        (chain.options ?? []).map((opt) => ({
          ...opt,
          side: opt.type,
          expiration: chain.expiry,
          dte: chain.daysToExpiry,
          ticker: sym.toUpperCase(),
        }))
      );
      setSearch({ ticker: sym.toUpperCase(), contracts, quote: json.quote, ivCurrent: json.ivCurrent });
    } catch (e) {
      if (e.name !== "AbortError") { setError(e.message); setSearch(null); }
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    discover,
    search,
    loading,
    error,
    loadDiscover,
    searchTicker,
    clearSearch: () => setSearch(null),
  };
}
