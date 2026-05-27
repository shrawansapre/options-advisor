import { callAPI } from "../lib/claude.js";
import { buildLiveDataBlock } from "../utils.jsx";
import { CHECKLIST_AUDITOR_SYSTEM_PROMPT, CHECKLIST_AUDITOR_BATCH_PROMPT } from "../prompts/checklist.js";
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

export async function checklistAuditorBatch({ trades, chainData, signal }) {
  const localResults = trades.map(t => runLocalChecks(t));
  const chainText = chainData ? buildLiveDataBlock(chainData) : null;

  const userMsg = `Audit all 3 options trades below.

ALREADY COMPUTED LOCALLY — DO NOT RE-AUDIT: DTE Rules, IV Environment vs Strategy, Profit Target & Stop Loss, Position Sizing.

Audit ONLY: Liquidity, Delta Checks (Short Strikes Only), Greeks Alignment, Strategy Match, Retail Trap Scan, Final Gate.

TRADES:
${trades.map(t => `[${t.riskTier?.toUpperCase() ?? "UNKNOWN"}]\n${JSON.stringify(t, null, 2)}`).join("\n\n")}

${chainText
    ? `LIVE MARKET DATA:\n${chainText}`
    : "No live market data available. Mark all data-dependent checks as needs_input."}`;

  let batchResult = null;
  try {
    batchResult = await callAPI({
      systemPrompt: CHECKLIST_AUDITOR_BATCH_PROMPT,
      userMessage: userMsg,
      useWebSearch: false,
      maxTokens: 4000,
      model: "claude-haiku-4-5-20251001",
      onProgress: null,
      timeoutMs: 60000,
      signal,
    });
  } catch (_) {}

  return trades.map((trade, i) => {
    const aiAudit = batchResult?.audits?.[i] ?? null;
    return mergeLocalAndAI(trade, localResults[i], aiAudit);
  });
}

export async function checklistAuditor({ trade, chainData, signal }) {
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
      signal,
    });
  } catch (_) {}

  return mergeLocalAndAI(trade, localResult, aiResult);
}
