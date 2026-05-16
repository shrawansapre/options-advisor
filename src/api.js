import { orchestrate } from "./orchestrator.js";

export async function fetchRecommendation(ticker, onProgress) {
  return orchestrate({ ticker, onProgress });
}
