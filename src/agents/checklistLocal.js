import { tallyItems } from "../utils.jsx";

function isCreditStrategy(strategy) {
  return /credit|iron condor|covered call|cash.secured|bull put|bear call/i.test(strategy || "");
}

function checkDTE(trade) {
  const dte = parseInt(trade.daysToExpiry) || 0;
  const isCredit = isCreditStrategy(trade.strategy);
  const criticalFlags = [];
  let status, note, threshold;

  if (isCredit) {
    threshold = ">=21 PASS | 14–21 WARNING | <14 FAIL | <7 CRITICAL";
    if (dte < 7) {
      status = "fail";
      criticalFlags.push(`DTE ${dte} on short premium — critical gamma risk`);
      note = "Close or roll immediately. DTE <7 on short premium is a hard stop.";
    } else if (dte < 14) {
      status = "fail";
      note = "DTE <14 on short premium. Exit or roll to a further expiry.";
    } else if (dte < 21) {
      status = "warning";
      note = "Approaching expiry — monitor daily for gamma acceleration.";
    } else {
      status = "pass";
      note = "";
    }
  } else {
    threshold = ">=30 PASS | 21–30 WARNING | <21 FAIL | <14 CRITICAL";
    if (dte < 14) {
      status = "fail";
      criticalFlags.push(`DTE ${dte} on debit position — too close to expiry`);
      note = "Exit position. DTE <14 on a debit strategy is a hard stop.";
    } else if (dte < 21) {
      status = "fail";
      note = "DTE too low for a debit spread. Exit or roll out.";
    } else if (dte < 30) {
      status = "warning";
      note = "DTE borderline for debit — acceptable but watch theta erosion.";
    } else {
      status = "pass";
      note = "";
    }
  }

  return {
    section: {
      name: "DTE Rules",
      items: [{ label: isCredit ? "DTE (credit)" : "DTE (debit)", status, value: `${dte} DTE`, threshold, note }],
    },
    criticalFlags,
  };
}

function checkIVEnvironment(trade) {
  const iv = parseInt(trade.ivRank) || 50;
  const isCredit = isCreditStrategy(trade.strategy);
  const hasCatalyst = /earnings|fda|merger|acquisition|announcement|event|catalyst/i.test(trade.rationale || "");

  let status, note;

  if (iv >= 70) {
    if (!isCredit && !hasCatalyst) {
      status = "fail";
      note = "IV rank >=70 with a debit strategy and no catalyst. Buying expensive premium without a catalyst is a losing edge — switch to a credit spread.";
    } else if (!isCredit) {
      status = "warning";
      note = "IV rank >=70 — premium is expensive. Catalyst present; size down and use a spread to cap cost.";
    } else {
      status = "pass";
      note = "High IV environment favors short premium. Good alignment.";
    }
  } else if (iv >= 50) {
    status = isCredit ? "pass" : "warning";
    note = isCredit ? "" : "IV rank 50–70 — buying premium is elevated. Confirm a strong catalyst before entering.";
  } else if (iv >= 30) {
    status = "pass";
    note = "";
  } else {
    status = isCredit ? "warning" : "pass";
    note = isCredit ? "IV rank <30 — selling cheap premium. Consider a debit spread; credit received is thin." : "";
  }

  return {
    section: {
      name: "IV Environment vs Strategy",
      items: [{
        label: "IV rank vs strategy type",
        status,
        value: `IV rank ${iv}`,
        threshold: "<30: debit=PASS credit=WARN | 30–50: PASS | 50–70: credit=PASS debit=WARN | >=70: credit=PASS debit=FAIL (no catalyst)",
        note,
      }],
    },
    criticalFlags: [],
  };
}

function checkProfitTargetAndStop(trade) {
  const ex = trade.exitStrategy;
  const isCredit = isCreditStrategy(trade.strategy);

  if (!ex?.profitTarget && !ex?.stopLoss) {
    return {
      section: {
        name: "Profit Target & Stop Loss",
        items: [{
          label: "Exit rules",
          status: "fail",
          value: "None defined",
          threshold: "Profit target + stop loss required",
          note: "No exit plan defined. Set a profit target and stop loss before entering.",
        }],
      },
      criticalFlags: [],
    };
  }

  const items = [];

  if (ex.profitTarget?.returnPct != null) {
    const pct = parseFloat(ex.profitTarget.returnPct);
    let status, note;
    if (isCredit) {
      if (pct > 80) { status = "warning"; note = "Target >80% of max profit is too aggressive. Exit at 50% to avoid gamma risk near expiry."; }
      else if (pct >= 40) { status = "pass"; note = ""; }
      else { status = "warning"; note = "Target <40% — leaving too much on the table for the risk taken."; }
    } else {
      status = pct >= 50 ? "pass" : "warning";
      note = pct < 50 ? "Debit target <50% return. Consider raising the target given the premium paid." : "";
    }
    items.push({ label: "Profit target", status, value: `+${pct}%`, threshold: isCredit ? "40–80% of max (ideal 50%)" : "50–100% gain on debit", note });
  }

  if (ex.stopLoss?.lossPct != null) {
    const pct = parseFloat(ex.stopLoss.lossPct);
    let status = "pass", note = "";
    if (isCredit && pct > 200) { status = "warning"; note = "Stop wider than 2× credit — risk of giving back most gains."; }
    else if (!isCredit && pct > 100) { status = "warning"; note = "Stop exceeds 100% of debit paid — consider tightening."; }
    items.push({ label: "Stop loss", status, value: `-${pct}%`, threshold: isCredit ? "≤200% of credit (2× received)" : "≤100% of debit paid", note });
  }

  return { section: { name: "Profit Target & Stop Loss", items }, criticalFlags: [] };
}

function checkPositionSizing(trade) {
  const maxLoss = parseFloat((trade.maxLoss || "").replace(/[^0-9.]/g, "")) || 0;
  const tier = trade.riskTier;
  const riskPct = tier === "conservative" ? 1 : tier === "moderate" ? 1.5 : 2;
  const minAccount = maxLoss > 0 ? Math.round(maxLoss / (riskPct / 100)) : 0;

  return {
    section: {
      name: "Position Sizing",
      items: [{
        label: "Account size requirement",
        status: "needs_input",
        value: maxLoss > 0 ? `Max loss $${maxLoss}` : "—",
        threshold: `${riskPct}% risk rule (${tier})`,
        note: maxLoss > 0
          ? `Max loss is $${maxLoss}. Fits ${riskPct}% risk on a $${minAccount.toLocaleString()}+ account. Verify against your account size before entering.`
          : "Max loss undefined — cannot compute position sizing.",
      }],
    },
    criticalFlags: [],
  };
}

export function runLocalChecks(trade) {
  const results = [
    checkDTE(trade),
    checkIVEnvironment(trade),
    checkProfitTargetAndStop(trade),
    checkPositionSizing(trade),
  ];

  const sections = results.map(r => r.section);
  const criticalFlags = results.flatMap(r => r.criticalFlags);

  return { sections, criticalFlags, overallScore: tallyItems(sections) };
}
