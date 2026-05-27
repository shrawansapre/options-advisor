import { jsonrepair } from "jsonrepair";

const USE_PROXY = !import.meta.env.VITE_ANTHROPIC_API_KEY;

function fixUnescapedQuotes(str) {
  let result = "";
  let inStr = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "\\" && inStr) {
      result += ch + (str[i + 1] ?? "");
      i++;
      continue;
    }
    if (ch === '"') {
      if (!inStr) {
        inStr = true;
        result += ch;
        continue;
      }
      let j = i + 1;
      while (j < str.length && " \t\r\n".includes(str[j])) j++;
      const peek = str[j];
      if (!peek || ":,}]".includes(peek)) {
        inStr = false;
        result += ch;
      } else {
        result += "'";
      }
      continue;
    }
    result += ch;
  }
  return result;
}

function extractReadableStrings(text) {
  const matches = [...text.matchAll(/:\s*"((?:[^"\\]|\\.){40,})"/g)];
  return matches
    .map(m => m[1].replace(/\\n/g, " ").replace(/\\"/g, '"').replace(/\s+/g, " ").trim())
    .filter(v => !v.includes("http") && !/^\d/.test(v) && !v.startsWith("$"));
}

function extractJSON(accumulated) {
  let start = accumulated.indexOf('{"trades"');
  if (start === -1) start = accumulated.indexOf('{"error"');
  if (start === -1) start = accumulated.indexOf('{"ticker"');
  if (start === -1) start = accumulated.indexOf("{");
  if (start === -1) throw new Error("No JSON found in response — the model may not have finished. Please try again.");

  let slice = "";
  {
    let depth = 0, inStr = false, i = start;
    while (i < accumulated.length) {
      const ch = accumulated[i];
      if (ch === "\\" && inStr) { i += 2; continue; }
      if (ch === '"') inStr = !inStr;
      else if (!inStr) {
        if (ch === "{" || ch === "[") depth++;
        else if (ch === "}" || ch === "]") {
          depth--;
          if (depth === 0) { slice = accumulated.slice(start, i + 1); break; }
        }
      }
      i++;
    }
    if (!slice) slice = accumulated.slice(start);
  }

  let parsed;
  const scrubbed = () => slice.replace(/[\x00-\x1F\x7F]/g, " ");
  const attempts = [
    () => JSON.parse(slice),
    () => JSON.parse(jsonrepair(slice)),
    () => JSON.parse(jsonrepair(scrubbed())),
    () => JSON.parse(jsonrepair(fixUnescapedQuotes(scrubbed()))),
  ];
  for (const attempt of attempts) {
    try { parsed = attempt(); break; } catch (_) {}
  }
  if (!parsed) throw new Error("The AI returned malformed data. Please try again — this usually resolves on retry.");
  return parsed;
}

export async function callAPI({ systemPrompt, userMessage, useWebSearch, maxTokens, model = "claude-sonnet-4-6", onProgress, timeoutMs = 120000, signal: externalSignal }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let signal = controller.signal;
  if (externalSignal) {
    if (typeof AbortSignal.any === "function") {
      signal = AbortSignal.any([controller.signal, externalSignal]);
    } else {
      const combined = new AbortController();
      controller.signal.addEventListener("abort", () => combined.abort(), { once: true });
      externalSignal.addEventListener("abort", () => combined.abort(), { once: true });
      signal = combined.signal;
    }
  }

  const headers = { "Content-Type": "application/json" };
  if (!USE_PROXY) {
    headers["x-api-key"] = import.meta.env.VITE_ANTHROPIC_API_KEY;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-beta"] = "prompt-caching-2024-07-31";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const body = {
    model,
    max_tokens: maxTokens,
    stream: true,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  };
  if (useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  let response;
  try {
    response = await fetch(
      USE_PROXY ? `${import.meta.env.VITE_API_BASE ?? ''}/analyze` : "https://api.anthropic.com/v1/messages",
      { method: "POST", headers, body: JSON.stringify(body), signal }
    );
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      if (externalSignal?.aborted) throw new Error("__BACKGROUNDED__");
      throw new Error("Analysis timed out — the web search took too long. Please try again.");
    }
    throw err;
  }

  if (!response.ok) {
    clearTimeout(timer);
    const b = await response.json().catch(() => ({}));
    throw new Error(`API ${response.status}: ${b?.error?.message ?? "unknown error"}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let lineBuffer = "";
  let searchCount = 0;
  let lastStringCount = 0;

  const processLine = (line) => {
    if (!line.startsWith("data: ")) return;
    const raw = line.slice(6).trim();
    if (!raw || raw === "[DONE]") return;
    try {
      const evt = JSON.parse(raw);
      if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
        accumulated += evt.delta.text;
        const strings = extractReadableStrings(accumulated);
        if (strings.length !== lastStringCount) {
          lastStringCount = strings.length;
          onProgress?.({ type: "text", strings });
        }
      } else if (evt.type === "content_block_start") {
        if (evt.content_block?.type === "tool_use") {
          searchCount++;
          onProgress?.({ type: "search", count: searchCount });
        } else if (evt.content_block?.type === "text") {
          accumulated = "";
          lastStringCount = 0;
        }
      }
    } catch (_) {}
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        lineBuffer += decoder.decode();
        if (lineBuffer.trim()) processLine(lineBuffer.trim());
        break;
      }
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop();
      for (const line of lines) processLine(line);
    }
  } catch (err) {
    if (err.name === "AbortError") {
      if (externalSignal?.aborted) throw new Error("__BACKGROUNDED__");
      throw new Error("Analysis timed out — the web search took too long. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  return extractJSON(accumulated);
}
