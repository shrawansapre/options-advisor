import { describe, it, expect } from "vitest";
import { findUnusualContracts } from "./unusualSignals.js";

const base = {
  side: "call", strike: 100, bid: 1, ask: 1.2, delta: 0.3,
  volume: 1000, openInterest: 100, iv: 0.4, dte: 30, expiration: "2026-06-19",
};

describe("findUnusualContracts", () => {
  it("keeps a contract passing all gates", () => {
    expect(findUnusualContracts([base])).toHaveLength(1);
  });
  it("drops volume at/below the floor (>500 required)", () => {
    expect(findUnusualContracts([{ ...base, volume: 500 }])).toHaveLength(0);
  });
  it("drops vol/OI at/below 2.0 (>2.0 required)", () => {
    expect(findUnusualContracts([{ ...base, volume: 600, openInterest: 300 }])).toHaveLength(0);
  });
  it("drops DTE outside [7,120]", () => {
    expect(findUnusualContracts([{ ...base, dte: 6 }])).toHaveLength(0);
    expect(findUnusualContracts([{ ...base, dte: 121 }])).toHaveLength(0);
  });
  it("drops |delta| outside [0.10,0.50]", () => {
    expect(findUnusualContracts([{ ...base, delta: 0.05 }])).toHaveLength(0);
    expect(findUnusualContracts([{ ...base, delta: 0.6 }])).toHaveLength(0);
  });
  it("treats missing OI as 1 (no divide-by-zero)", () => {
    expect(findUnusualContracts([{ ...base, openInterest: null }])).toHaveLength(1);
  });
  it("filters by side", () => {
    expect(findUnusualContracts([base], { side: "put" })).toHaveLength(0);
  });
});
