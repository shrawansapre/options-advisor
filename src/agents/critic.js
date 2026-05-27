import { callAPI } from "../lib/claude.js";
import { buildLiveDataBlock } from "../utils.jsx";
import { CRITIC_SYSTEM_PROMPT } from "../prompts/critic.js";

export async function runCritic({ trades, marketData, signal }) {
  const chainText = marketData
    ? buildLiveDataBlock(marketData)
    : "No live chain data available. Skip checks 1-4 (strike, price, delta, spread).";

  const userMsg = `Validate these 3 options trade recommendations against the live market data.

${chainText}
Trades to validate:
${JSON.stringify(trades, null, 2)}`;

  return callAPI({
    systemPrompt: CRITIC_SYSTEM_PROMPT,
    userMessage: userMsg,
    useWebSearch: false,
    maxTokens: 1500,
    model: "claude-haiku-4-5-20251001",
    onProgress: null,
    timeoutMs: 30000,
    signal,
  });
}
