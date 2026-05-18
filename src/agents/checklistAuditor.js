import { callAPI } from "../lib/claude.js";
import { buildLiveDataBlock } from "../orchestrator.js";
import { CHECKLIST_AUDITOR_SYSTEM_PROMPT } from "../prompts/checklist.js";
import { runLocalChecks } from "./checklistLocal.js";
import { tallyItems } from "../utils.jsx";

function mergeLocalAndAI(trade, localResult, aiAudit) {
  const allSections = [...localResult.sections, ...(aiAudit?.sections || [])];
  const allCriticalFlags = [...localResult.criticalFlags, ...(aiAudit?.criticalFlags || [])];
  return {
    riskTier: trade.riskTier,
    sections: allSections,
    criticalFlags: allCriticalFlags,
    overallScore: tallyItems(allSections),
    summary: aiAudit?.summary || "",
  };
}

export async function checklistAuditorBatch({ trades, chainData }) {
  const results = await Promise.allSettled(
    trades.map(trade => checklistAuditor({ trade, chainData }))
  );
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return mergeLocalAndAI(trades[i], runLocalChecks(trades[i]), null);
  });
}

export async function checklistAuditor({ trade, chainData }) {
  const localResult = runLocalChecks(trade);

  const chainText = chainData ? buildLiveDataBlock(chainData) : null;

  const userMsg = `Audit this ${trade.riskTier} options trade.

ALREADY COMPUTED LOCALLY — DO NOT RE-AUDIT: DTE Rules, IV Environment vs Strategy, Profit Target & Stop Loss, Position Sizing.

Audit ONLY: Liquidity, Delta Checks (Short Strikes Only), Greeks Alignment, Strategy Match, Retail Trap Scan, Final Gate.

TRADE DATA:
${JSON.stringify(trade, null, 2)}

${chainText
    ? `LIVE MARKET DATA:\n${chainText}`
    : "No live market data available. Mark all data-dependent checks as needs_input."}`;

  let aiResult = { sections: [], criticalFlags: [], summary: "" };
  try {
    aiResult = await callAPI({
      systemPrompt: CHECKLIST_AUDITOR_SYSTEM_PROMPT,
      userMessage: userMsg,
      useWebSearch: false,
      maxTokens: 1200,
      model: "claude-haiku-4-5-20251001",
      onProgress: null,
      timeoutMs: 45000,
    });
  } catch (_) {}

  return mergeLocalAndAI(trade, localResult, aiResult);
}
