import { orchestrate } from "./orchestrator.js";

export async function fetchRecommendation(ticker, onProgress, signal) {
  return orchestrate({ ticker, onProgress, signal });
}
