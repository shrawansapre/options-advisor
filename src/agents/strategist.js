import { callAPI } from "../lib/claude.js";
import { STRATEGY_SYSTEM_PROMPT, STRATEGY_SYSTEM_PROMPT_LIVE } from "../prompts/strategy.js";

export async function runStrategist({ tier, resolvedTicker, researchJSON, hasLiveData, timeContext, critique = null, signal }) {
  const tierGuide = tier === 'conservative'
    ? 'Prefer defined-risk structures with high probability of profit: tight credit spread (width ≤$5), cash-secured put, or covered call. Smallest max loss of the three tiers.'
    : tier === 'moderate'
    ? 'Prefer a balanced structure: ATM or near-the-money long option, or a moderate-width debit spread. Max loss must be greater than conservative and less than aggressive.'
    : 'Prefer a high risk/reward structure: OTM long option or wide spread. Largest max loss of the three tiers — prioritise leverage over defined risk.';

  let userMsg = `${timeContext} Design and build the best ${tier.toUpperCase()} tier options trade for ${resolvedTicker}.\n\nTier guidance: ${tierGuide}\n\nResearch data:\n${researchJSON}`;

  if (critique?.length) {
    userMsg += `\n\n[CRITIC FEEDBACK — address each issue in your revised trade]\n${critique.map(c => `- ${c.type} (${c.severity}): ${c.detail}`).join("\n")}`;
  }

  return callAPI({
    systemPrompt: hasLiveData ? STRATEGY_SYSTEM_PROMPT_LIVE : STRATEGY_SYSTEM_PROMPT,
    userMessage: userMsg,
    useWebSearch: !hasLiveData,
    maxTokens: 6000,
    model: "claude-sonnet-4-6",
    onProgress: null,
    signal,
    thinkingBudget: hasLiveData ? 1500 : undefined, // extended thinking only when no web search
  });
}
