# Vercel Timeout Issue — Web Search Latency

## Symptom

On the deployed Vercel app, certain tickers (e.g. INTC) never reach the
"writing research" loading phase. The app cycles through initial loading
messages indefinitely, then shows a timeout error. Works fine on local dev.

## Why Local Dev Doesn't Hit This

`src/api.js` checks for `VITE_ANTHROPIC_API_KEY` in the build environment:

```js
const USE_PROXY = !import.meta.env.VITE_ANTHROPIC_API_KEY;
```

Local `.env.local` has the key → browser calls Anthropic directly → no proxy,
no Vercel function, no time cap.

Deployed build has no `VITE_ANTHROPIC_API_KEY` → goes through `api/analyze.js`
(Vercel Edge Function) → subject to Vercel Hobby plan's **60s hard maxDuration**.

## Root Cause

`web_search_20250305` is a server-side tool that runs on Anthropic's
infrastructure. Each search invocation takes **5–25s** (unpredictable, depends
on Anthropic's search infra load and query complexity).

Phase 1 had 2 sequential searches. In the worst case:
- Search 1: 25s
- Search 2: 25s
- Model starts generating: already at 50s+
- AbortController fires at 55s before any text is produced

Because the "writing research" loading phase only appears when the model emits
its first `type: "text"` SSE event, users never saw it — the abort fired first.

## Potential Contributing Factors

1. **Two searches in Phase 1**: Each search blocks the connection. The model
   cannot start generating text until all tool calls complete.

2. **Vercel Hobby plan 60s cap**: Pro plan raises this to 300s. Hobby is fixed
   at 60s and cannot be extended per-function beyond that.

3. **Unpredictable search latency**: Anthropic's web search is not guaranteed
   SLA. Tickers with more ambiguous queries (e.g. INTC — both the chip company
   and other results) may trigger slower or more complex searches.

4. **No streaming bypass**: The Vercel function must stay connected for the
   entire duration of the upstream Anthropic stream. It can't hand off mid-stream.

5. **AbortController at 55s**: Intentional fail-fast to avoid 3-minute hangs,
   but it fires before the model generates text when searches are slow.

## Fix Applied (2026-05-13)

Reduced Phase 1 from 2 searches to 1. Combined price, news, IV rank, and
options chain into a single broad search query:

```
"[TICKER] stock price news IV rank options chain strikes expiry"
```

Expected Phase 1 time: 5–20s search + model generation = fits in 55s.

## If the Issue Recurs

Options to consider (in order of effort):

1. **Upgrade to Vercel Pro** — raises maxDuration to 300s. Eliminates the
   problem entirely. No code changes needed.

2. **Split Phase 1 into a separate fast endpoint** — one endpoint just for
   the web search (returns raw research JSON), another for JSON generation
   (no search). Reduces each invocation's exposure to search latency.

3. **Cache research data** — store Phase 1 results in Supabase for N minutes.
   Repeat requests for the same ticker within the window skip the search.

4. **Upgrade search tool** — `web_search_20260209` (newer version) has dynamic
   filtering and may be faster. Not yet tested.

5. **Reduce Phase 2 search scope** — Phase 2 runs 3 parallel Vercel invocations,
   each with `useWebSearch: true`. If any of those searches are slow, individual
   tier cards time out. Could fetch Greeks via a cheaper method.
