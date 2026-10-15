import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { handleAuthRequest, handleHistoryRequest, resetLoginAttempts } from "./accountStore.js";
import { signSession } from "./sessionToken.js";

const env = {
  AUTH_SECRET: "auth-secret",
  OWNER_EMAIL: "owner@example.com",
  OWNER_PASSWORD: "correct-horse",
  INTERNAL_TOKEN: "internal",
};

function json(data, _origin, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function text(body, _origin, status = 200) {
  return new Response(body, { status });
}
const helpers = { json, text };

function createMemoryDb() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      let binds = [];
      return {
        bind(...args) { binds = args; return this; },
        async run() {
          if (sql.startsWith("INSERT")) {
            rows.push({
              id: binds[0], user_id: binds[1], ticker: binds[2], strategy: binds[3],
              strategy_type: binds[4], result_json: binds[5], created_at: binds[6],
            });
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("UPDATE")) {
            const row = rows.find(r => r.id === binds[1] && r.user_id === binds[2]);
            if (!row) return { meta: { changes: 0 } };
            row.result_json = binds[0];
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("DELETE")) {
            const before = rows.length;
            for (let i = rows.length - 1; i >= 0; i--) {
              if (rows[i].user_id === binds[0]) rows.splice(i, 1);
            }
            return { meta: { changes: before - rows.length } };
          }
          return { meta: { changes: 0 } };
        },
        async all() {
          const results = rows
            .filter(r => r.user_id === binds[0])
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .slice(0, 20);
          return { results };
        },
      };
    },
  };
}

function loginRequest(body, ip = "1.1.1.1") {
  return new Request("https://api.test/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": "internal",
      "CF-Connecting-IP": ip,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => resetLoginAttempts());

describe("owner login", () => {
  it("issues a session for the owner and rejects everyone else", async () => {
    const ok = await handleAuthRequest(loginRequest({ email: "Owner@Example.com", password: "correct-horse" }), env, helpers);
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.deepEqual(body.user, { id: "owner@example.com", email: "owner@example.com" });

    const bad = await handleAuthRequest(loginRequest({ email: "owner@example.com", password: "nope" }, "2.2.2.2"), env, helpers);
    assert.equal(bad.status, 401);
  });

  it("locks an address after repeated failures", async () => {
    for (let i = 0; i < 8; i++) {
      await handleAuthRequest(loginRequest({ email: "owner@example.com", password: "nope" }, "9.9.9.9"), env, helpers);
    }
    const locked = await handleAuthRequest(loginRequest({ email: "owner@example.com", password: "correct-horse" }, "9.9.9.9"), env, helpers);
    assert.equal(locked.status, 429);
  });
});

describe("history", () => {
  it("stores and lists only the signed-in owner's rows", async () => {
    const db = createMemoryDb();
    const historyEnv = { ...env, HISTORY_DB: db };
    const login = await handleAuthRequest(loginRequest({ email: "owner@example.com", password: "correct-horse" }, "3.3.3.3"), env, helpers);
    const { token } = await login.json();

    const saved = await handleHistoryRequest(new Request("https://api.test/history", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Internal-Token": "internal" },
      body: JSON.stringify({ ticker: "NVDA", strategy: "Call debit", strategyType: "bullish", result: { trades: [{ summary: { confidenceScore: 7 } }] }, ts: "2026-05-01T00:00:00.000Z" }),
    }), historyEnv, helpers);
    assert.equal(saved.status, 200);
    const { entry } = await saved.json();

    const listed = await handleHistoryRequest(new Request("https://api.test/history", {
      headers: { Authorization: `Bearer ${token}`, "X-Internal-Token": "internal" },
    }), historyEnv, helpers);
    const listBody = await listed.json();
    assert.equal(listBody.entries.length, 1);
    assert.equal(listBody.entries[0].ticker, "NVDA");
    assert.equal(listBody.entries[0].confidenceScore, 7);

    const other = await signSession(env.AUTH_SECRET, "other@example.com", Date.now());
    const denied = await handleHistoryRequest(new Request(`https://api.test/history/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${other}`, "X-Internal-Token": "internal" },
      body: JSON.stringify({ result: { trades: [] } }),
    }), historyEnv, helpers);
    assert.equal(denied.status, 404);
    assert.equal(JSON.parse(db.rows[0].result_json).trades[0].summary.confidenceScore, 7);
  });
});
