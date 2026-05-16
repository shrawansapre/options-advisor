import { callAPI } from "../lib/claude.js";
import { buildLiveDataBlock } from "../orchestrator.js";
import { CHECKLIST_AUDITOR_SYSTEM_PROMPT } from "../prompts/checklist.js";

export async function checklistAuditor({ trade, chainData }) {
  const chainText = chainData ? buildLiveDataBlock(chainData) : null;

  const userMsg = `Audit this ${trade.riskTier} options trade against the discipline checklist.

TRADE DATA:
${JSON.stringify(trade, null, 2)}

${chainText
  ? `LIVE MARKET DATA:\n${chainText}`
  : "No live market data available. Mark all data-dependent checks as needs_input."}`;

  return callAPI({
    systemPrompt: CHECKLIST_AUDITOR_SYSTEM_PROMPT,
    userMessage: userMsg,
    useWebSearch: false,
    maxTokens: 2000,
    model: "claude-haiku-4-5-20251001",
    onProgress: null,
    timeoutMs: 45000,
  });
}
