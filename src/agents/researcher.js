import { callAPI } from "../lib/claude.js";
import { RESEARCH_SYSTEM_PROMPT, RESEARCH_SYSTEM_PROMPT_LIVE } from "../prompts/research.js";

export async function runResearcher({ researchMsg, hasLiveData, onProgress }) {
  const result = await callAPI({
    systemPrompt: hasLiveData ? RESEARCH_SYSTEM_PROMPT_LIVE : RESEARCH_SYSTEM_PROMPT,
    userMessage: researchMsg,
    useWebSearch: true,
    maxTokens: 4000,
    model: "claude-haiku-4-5-20251001",
    onProgress,
  });
  if (result.error) throw new Error(result.message || "Ticker not found. Please check the symbol and try again.");
  return result;
}
