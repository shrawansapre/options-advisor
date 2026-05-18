import { callAPI } from "../lib/claude.js";
import { buildLiveDataBlock } from "../orchestrator.js";
import { CHECKLIST_AUDITOR_SYSTEM_PROMPT, CHECKLIST_AUDITOR_BATCH_PROMPT } from "../prompts/checklist.js";
import { runLocalChecks } from "./checklistLocal.js";

function mergeLocalAndAI(trade, localResult, aiAudit) {
  const allSections = [...localResult.sections, ...(aiAudit?.sections || [])];
  const allCriticalFlags = [...localResult.criticalFlags, ...(aiAudit?.criticalFlags || [])];
  let passed = 0, failed = 0, warnings = 0, needsInput = 0;
  for (const s of allSections) {
    for (const item of s.items || []) {
      if (item.status === "pass") passed++;
      else if (item.status === "fail") failed++;
      else if (item.status === "warning") warnings++;
      else needsInput++;
    }
  }
  return {
    riskTier: trade.riskTier,
    sections: allSections,
    criticalFlags: allCriticalFlags,
    overallScore: { passed, failed, warnings, needsInput, total: passed + failed + warnings + needsInput },
    summary: aiAudit?.summary || "",
  };
}

export async function checklistAuditorBatch({ trades, chainData }) {
  const localResults = trades.map(trade => runLocalChecks(trade));
  const chainText = chainData ? buildLiveDataBlock(chainData) : null;

  const userMsg = `Audit these 3 options trades. ALREADY COMPUTED LOCALLY — DO NOT RE-AUDIT: DTE Rules, IV Environment vs Strategy, Profit Target & Stop Loss, Position Sizing.
Audit ONLY: Liquidity, Delta Checks, Greeks Alignment, Strategy Match, Retail Trap Scan, Final Gate.

${trades.map((t, i) => `TRADE ${i + 1} (${t.riskTier}):\n${JSON.stringify(t, null, 2)}`).join("\n\n")}

${chainText ? `LIVE MARKET DATA:\n${chainText}` : "No live market data. Mark all data-dependent checks as needs_input."}`;

  let aiResult = { audits: [] };
  try {
    aiResult = await callAPI({
      systemPrompt: CHECKLIST_AUDITOR_BATCH_PROMPT,
      userMessage: userMsg,
      useWebSearch: false,
      maxTokens: 3500,
      model: "claude-haiku-4-5-20251001",
      onProgress: null,
      timeoutMs: 60000,
    });
  } catch (_) {}

  return trades.map((trade, i) =>
    mergeLocalAndAI(trade, localResults[i], aiResult.audits?.[i])
  );
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
