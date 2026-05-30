import { describe, it, expect } from "vitest";
import {
  mid, dollarVolume, probITM, expectedMove, spreadCost, netPremium, rankLeaderboard,
} from "./signals.js";

const call = (o = {}) => ({ side: "call", bid: 1.0, ask: 1.2, delta: 0.45, volume: 1000, ...o });
const put  = (o = {}) => ({ side: "put",  bid: 2.0, ask: 2.4, delta: -0.30, volume: 500, ...o });

describe("mid", () => {
  it("averages bid and ask", () => expect(mid(call())).toBeCloseTo(1.1));
  it("returns null when bid or ask missing", () => {
    expect(mid({ bid: null, ask: 1.2 })).toBe(null);
    expect(mid({ bid: 1.0, ask: undefined })).toBe(null);
  });
});

describe("dollarVolume", () => {
  it("is volume * mid * 100", () => expect(dollarVolume(call())).toBeCloseTo(1000 * 1.1 * 100));
  it("is 0 when mid is null", () => expect(dollarVolume({ bid: null, ask: 1, volume: 10 })).toBe(0));
  it("is 0 when volume missing", () => expect(dollarVolume(call({ volume: 0 }))).toBe(0));
});

describe("probITM", () => {
  it("is absolute delta", () => {
    expect(probITM(call())).toBeCloseTo(0.45);
    expect(probITM(put())).toBeCloseTo(0.30);
  });
  it("is 0 when delta missing", () => expect(probITM({})).toBe(0));
});

describe("expectedMove", () => {
  it("is price * iv * sqrt(dte/365)", () => {
    expect(expectedMove(100, 0.40, 365)).toBeCloseTo(40);
    expect(expectedMove(100, 0.40, 0)).toBeCloseTo(0);
  });
  it("is 0 on invalid inputs", () => expect(expectedMove(0, 0.4, 30)).toBe(0));
});

describe("spreadCost", () => {
  it("is (ask-bid)/mid", () => expect(spreadCost(call())).toBeCloseTo(0.2 / 1.1));
  it("is null when mid null", () => expect(spreadCost({ bid: null, ask: 1 })).toBe(null));
});

describe("netPremium", () => {
  it("nets call dollars minus put dollars and tones bullish", () => {
    const r = netPremium([call({ volume: 1000 }), put({ volume: 100 })]);
    expect(r.callDollars).toBeGreaterThan(r.putDollars);
    expect(r.net).toBeCloseTo(r.callDollars - r.putDollars);
    expect(r.tone).toBe("bullish");
  });
  it("tones bearish when puts dominate", () => {
    expect(netPremium([call({ volume: 1 }), put({ volume: 5000 })]).tone).toBe("bearish");
  });
  it("tones neutral on empty", () => expect(netPremium([]).tone).toBe("neutral"));
});

describe("rankLeaderboard", () => {
  it("sorts by dollar volume desc and attaches _dollarVol", () => {
    const ranked = rankLeaderboard([call({ volume: 100 }), call({ volume: 5000 })]);
    expect(ranked[0]._dollarVol).toBeGreaterThan(ranked[1]._dollarVol);
    expect(ranked[0].volume).toBe(5000);
  });
});
