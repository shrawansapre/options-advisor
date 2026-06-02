import { callAPI } from "../lib/claude.js";
import { STRATEGY_SYSTEM_PROMPT, STRATEGY_SYSTEM_PROMPT_LIVE } from "../prompts/strategy.js";

export async function runStrategist({ tier, resolvedTicker, researchJSON, hasLiveData, greeksNote, timeContext, critique = null, signal }) {
  const tierConstraint = tier === 'moderate'
    ? ' CONSTRAINT: your maxLoss MUST be strictly less than research.strategies.aggressive.approxMaxLoss — if the recommended structure would violate this, tighten the spread width, use a lower-cost structure, or choose a slightly more OTM strike.'
    : tier === 'aggressive'
    ? ' CONSTRAINT: your maxLoss MUST be strictly greater than research.strategies.moderate.approxMaxLoss — if the recommended structure would violate this, widen the spread, use a further OTM strike, or increase contracts.'
    : '';

  let userMsg = `${timeContext} Generate the ${tier.toUpperCase()} tier trade for ${resolvedTicker}.${tierConstraint} The strategy structure is pre-decided in research.strategies.${tier} — ${greeksNote} and fill in the complete trade schema.\n\nResearch data:\n${researchJSON}`;

  if (critique?.length) {
    userMsg += `\n\n[CRITIC FEEDBACK — address each issue in your response]\n${critique.map(c => `- ${c.type} (${c.severity}): ${c.detail}`).join("\n")}`;
  }

  return callAPI({
    systemPrompt: hasLiveData ? STRATEGY_SYSTEM_PROMPT_LIVE : STRATEGY_SYSTEM_PROMPT,
    userMessage: userMsg,
    useWebSearch: !hasLiveData,
    maxTokens: 5000,
    model: "claude-sonnet-4-6",
    onProgress: null,
    signal,
  });
}
