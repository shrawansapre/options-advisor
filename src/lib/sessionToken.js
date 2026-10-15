const textEncoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, textEncoder.encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
}

function fixedEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function signSession(secret, email, now = Date.now(), ttlMs = SESSION_TTL_MS) {
  const body = bytesToBase64Url(textEncoder.encode(JSON.stringify({
    sub: email,
    exp: now + ttlMs,
  })));
  return `${body}.${await hmac(secret, body)}`;
}

export async function verifySession(secret, token, now = Date.now()) {
  if (!secret || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, body);
  if (!fixedEqual(expected, sig)) return null;
  let payload;
  try {
    const pad = body.length % 4 === 0 ? "" : "=".repeat(4 - (body.length % 4));
    const bin = atob(body.replaceAll("-", "+").replaceAll("_", "/") + pad);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (!payload || typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
  if (payload.exp <= now) return null;
  const email = payload.sub.trim().toLowerCase();
  if (!email) return null;
  return { id: email, email };
}
