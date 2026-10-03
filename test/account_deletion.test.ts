import assert from "node:assert/strict";
import { deleteAccount, InfraiClient } from "../src/account_deletion_service.js";

const calls: Array<{ method: string; path: string }> = [];
const fakeFetch: typeof fetch = async (url, init) => {
  const parsed = new URL(String(url));
  calls.push({ method: String(init?.method), path: parsed.pathname });
  const data = parsed.pathname.includes("list_for_user") ? { items: [{ id: "s1" }, { id: "s2" }] } : {};
  return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
};

const result = await deleteAccount({ user_id: "u1", account_key_id: "k1" }, new InfraiClient("test-key", fakeFetch));
assert.deepEqual(result, { user_id: "u1", revoked_sessions: 2, revoked_account_key: "k1" });
assert.deepEqual(calls.map(call => `${call.method} ${call.path}`), [
  "GET /v1/auth/session/list_for_user/u1",
  "POST /v1/auth/session/revoke/s1",
  "POST /v1/auth/session/revoke/s2",
  "DELETE /v1/account/keys/revoke/k1"
]);
console.log("account deletion decision test passed");
