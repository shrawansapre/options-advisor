import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { signSession, verifySession } from "./sessionToken.js";

const SECRET = "test-secret";

describe("session tokens", () => {
  it("round-trips an email", async () => {
    const token = await signSession(SECRET, "owner@example.com", 1_000);
    const user = await verifySession(SECRET, token, 1_000);
    assert.deepEqual(user, { id: "owner@example.com", email: "owner@example.com" });
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(SECRET, "owner@example.com", 1_000);
    const [body, sig] = token.split(".");
    const flipped = `${body}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`;
    assert.equal(await verifySession(SECRET, flipped, 1_000), null);
  });

  it("rejects the wrong secret and an expired token", async () => {
    const token = await signSession(SECRET, "owner@example.com", 1_000, 500);
    assert.equal(await verifySession("other-secret", token, 1_000), null);
    assert.equal(await verifySession(SECRET, token, 1_600), null);
  });
});
