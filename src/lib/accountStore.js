import { signSession, verifySession } from "./sessionToken.js";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 8;
const MAX_RESULT_CHARS = 262144;
const attempts = new Map();

const INSERT_SQL = `INSERT INTO analyses (id, user_id, ticker, strategy, strategy_type, result_json, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)`;
const LIST_SQL = `SELECT id, ticker, strategy, strategy_type, result_json, created_at
  FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`;
const UPDATE_SQL = `UPDATE analyses SET result_json = ? WHERE id = ? AND user_id = ?`;
const DELETE_SQL = `DELETE FROM analyses WHERE user_id = ?`;

function authorized(req, env) {
  if (!env.INTERNAL_TOKEN) return true;
  return req.headers.get("X-Internal-Token") === env.INTERNAL_TOKEN;
}

async function sha256(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(buf);
}

async function sameSecret(input, expected) {
  const [a, b] = await Promise.all([sha256(String(input)), sha256(String(expected))]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function rateLimited(ip, now) {
  const rec = attempts.get(ip);
  if (!rec || now > rec.reset) return false;
  return rec.n >= MAX_FAILS;
}

function recordFailure(ip, now) {
  const rec = attempts.get(ip);
  if (!rec || now > rec.reset) {
    attempts.set(ip, { n: 1, reset: now + WINDOW_MS });
    return;
  }
  rec.n += 1;
}

export function resetLoginAttempts() {
  attempts.clear();
}

function clientIp(req) {
  return req.headers.get("CF-Connecting-IP") || "local";
}

export async function readUser(req, env, now = Date.now()) {
  if (!env.AUTH_SECRET) return null;
  const header = req.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return verifySession(env.AUTH_SECRET, header.slice(7).trim(), now);
}

function clip(value, max) {
  return String(value ?? "").slice(0, max);
}

function resultJson(result) {
  if (result == null) return { json: null };
  let raw;
  try { raw = JSON.stringify(result); } catch { return { error: "Invalid result" }; }
  if (raw.length > MAX_RESULT_CHARS) return { error: "Payload too large" };
  return { json: raw };
}

function toEntry(row) {
  let result = null;
  if (row.result_json) {
    try { result = JSON.parse(row.result_json); } catch { result = null; }
  }
  return {
    id: row.id,
    ticker: row.ticker || "",
    ts: row.created_at,
    strategy: row.strategy || "",
    strategyType: row.strategy_type || "neutral",
    confidenceScore: result?.trades?.[0]?.summary?.confidenceScore ?? 0,
    result,
  };
}

function entryBinds(userId, input, id = crypto.randomUUID()) {
  const packed = resultJson(input?.result ?? null);
  if (packed.error) return packed;
  const created = new Date(input?.ts ?? input?.created_at);
  return {
    binds: [
      id,
      userId,
      clip(input?.ticker, 12),
      clip(input?.strategy, 160),
      clip(input?.strategyType ?? input?.strategy_type, 32) || "neutral",
      packed.json,
      Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString(),
    ],
  };
}

async function insertEntry(db, userId, input) {
  const prepared = entryBinds(userId, input);
  if (prepared.error) return prepared;
  await db.prepare(INSERT_SQL).bind(...prepared.binds).run();
  const row = {
    id: prepared.binds[0],
    user_id: prepared.binds[1],
    ticker: prepared.binds[2],
    strategy: prepared.binds[3],
    strategy_type: prepared.binds[4],
    result_json: prepared.binds[5],
    created_at: prepared.binds[6],
  };
  return { entry: toEntry(row) };
}

export async function handleAuthRequest(req, env, { json, text }) {
  const origin = req.headers.get("Origin") || "";
  if (!authorized(req, env)) return text("Forbidden", origin, 403);

  const { pathname } = new URL(req.url);
  if (pathname === "/auth/session" && req.method === "GET") {
    const user = await readUser(req, env);
    return json({ user }, origin);
  }
  if (pathname === "/auth/logout" && req.method === "POST") {
    return json({ ok: true }, origin);
  }
  if (pathname !== "/auth/login" || req.method !== "POST") {
    return text("Method not allowed", origin, 405);
  }
  if (!env.AUTH_SECRET || !env.OWNER_EMAIL || !env.OWNER_PASSWORD) {
    return json({ error: "Sign-in is not configured" }, origin, 503);
  }

  const ip = clientIp(req);
  const now = Date.now();
  if (rateLimited(ip, now)) {
    return json({ error: "Too many attempts. Try again later." }, origin, 429);
  }

  let body;
  try { body = await req.json(); } catch { return text("Invalid JSON", origin, 400); }
  const email = clip(body?.email, 320).trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password || password.length > 200) {
    recordFailure(ip, now);
    return json({ error: "Email and password are required" }, origin, 400);
  }

  const emailOk = await sameSecret(email, String(env.OWNER_EMAIL).trim().toLowerCase());
  const passwordOk = await sameSecret(password, String(env.OWNER_PASSWORD));
  if (!emailOk || !passwordOk) {
    recordFailure(ip, now);
    return json({ error: "Email and password do not match" }, origin, 401);
  }

  const user = { id: email, email };
  const token = await signSession(env.AUTH_SECRET, email, now);
  return json({ token, user }, origin);
}

export async function handleHistoryRequest(req, env, { json, text }) {
  const origin = req.headers.get("Origin") || "";
  if (!authorized(req, env)) return text("Forbidden", origin, 403);
  const user = await readUser(req, env);
  if (!user) return json({ error: "Sign in required" }, origin, 401);
  if (!env.HISTORY_DB) return json({ error: "History is not configured" }, origin, 503);

  const url = new URL(req.url);
  const db = env.HISTORY_DB;

  if (url.pathname === "/history" && req.method === "GET") {
    const { results } = await db.prepare(LIST_SQL).bind(user.id).all();
    return json({ entries: (results || []).map(toEntry) }, origin);
  }

  if (url.pathname === "/history" && req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return text("Invalid JSON", origin, 400); }
    const saved = await insertEntry(db, user.id, body);
    if (saved.error) return text(saved.error, origin, saved.error === "Payload too large" ? 413 : 400);
    return json(saved, origin);
  }

  if (url.pathname === "/history/import" && req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return text("Invalid JSON", origin, 400); }
    const entries = Array.isArray(body?.entries) ? body.entries.slice(0, 20) : null;
    if (!entries) return text("Invalid JSON", origin, 400);
    for (const entry of entries) {
      const saved = await insertEntry(db, user.id, entry);
      if (saved.error) return text(saved.error, origin, saved.error === "Payload too large" ? 413 : 400);
    }
    const { results } = await db.prepare(LIST_SQL).bind(user.id).all();
    return json({ entries: (results || []).map(toEntry) }, origin);
  }

  const match = url.pathname.match(/^\/history\/([0-9a-f-]{36})$/i);
  if (match && req.method === "PATCH") {
    let body;
    try { body = await req.json(); } catch { return text("Invalid JSON", origin, 400); }
    const packed = resultJson(body?.result ?? null);
    if (packed.error) return text(packed.error, origin, packed.error === "Payload too large" ? 413 : 400);
    const result = await db.prepare(UPDATE_SQL).bind(packed.json, match[1], user.id).run();
    if (!result?.meta?.changes) return text("Not found", origin, 404);
    return json({ ok: true }, origin);
  }

  if (url.pathname === "/history" && req.method === "DELETE") {
    await db.prepare(DELETE_SQL).bind(user.id).run();
    return json({ ok: true }, origin);
  }

  return text("Method not allowed", origin, 405);
}
