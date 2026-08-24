// Plain Node test script, no framework. Run: node tests/ai-client-v8.test.js
// ai-client-v8.js had no dedicated unit tests before Phase 7 — only the live
// integration test (ai-session-v8.integration.test.js) exercised it, against
// the real deployed function. These mock global fetch instead, so they run
// offline and fast, and specifically target the QA gate's transport-layer
// items: a non-2xx status (rate limit / server error), a malformed body, a
// hang past the timeout budget (the client-side half of "cold start /
// timeout never visibly stalls the app"), and the one-retry-on-genuine-
// network-error rule.
"use strict";
const assert = require("node:assert/strict");

async function main() {
  const { postPacket, warmUp } = await import("../js/ai-client-v8.js");

  let passed = 0;
  const results = [];
  async function test(name, fn) {
    try { await fn(); results.push(`ok   - ${name}`); passed++; }
    catch (e) { results.push(`FAIL - ${name}\n       ${e.stack || e.message}`); }
  }

  const packet = { sessionId: "s1", lang: "en", phase: "routing" };

  await test("a non-2xx response (e.g. a 429 rate-limit) resolves to null, not thrown", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
    try {
      const result = await postPacket(packet);
      assert.equal(result, null);
    } finally { globalThis.fetch = realFetch; }
  });

  await test("a non-2xx response is never retried (retry is for network errors only)", async () => {
    let calls = 0;
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => { calls++; return { ok: false, status: 500, json: async () => ({}) }; };
    try {
      await postPacket(packet);
      assert.equal(calls, 1, "a 4xx/5xx must cost exactly one call, never a retry");
    } finally { globalThis.fetch = realFetch; }
  });

  await test("a response body that isn't valid JSON resolves to null, not thrown", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, json: async () => { throw new SyntaxError("Unexpected token"); } });
    try {
      const result = await postPacket(packet);
      assert.equal(result, null);
    } finally { globalThis.fetch = realFetch; }
  });

  await test("a response body that parses but isn't an object (e.g. a bare number or null) resolves to null", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, json: async () => 42 });
    try { assert.equal(await postPacket(packet), null); } finally { globalThis.fetch = realFetch; }
  });

  await test("a server that hangs past the timeout budget is aborted and resolves to null promptly (client-side half of the cold-start guarantee — the real ~30-60s cold start is the same mechanism at the production 4000ms budget, just slower to demonstrate in a test)", async () => {
    const realFetch = globalThis.fetch;
    let sawAbort = false;
    globalThis.fetch = (url, opts) => new Promise((resolve, reject) => {
      const t = setTimeout(() => resolve({ ok: true, json: async () => ({ injectItems: [], reorder: [], pairResolutions: [], probesUsed: 0 }) }), 5000);
      opts.signal.addEventListener("abort", () => { sawAbort = true; clearTimeout(t); reject(Object.assign(new Error("aborted"), { name: "AbortError" })); });
    });
    const startedAt = Date.now();
    try {
      const result = await postPacket(packet, { timeoutMs: 80 });
      const elapsed = Date.now() - startedAt;
      assert.equal(result, null);
      assert.ok(sawAbort, "the client must actually abort the hung request, not just stop waiting on it");
      assert.ok(elapsed < 1000, `must resolve close to the 80ms budget, not wait for the 5000ms hang (took ${elapsed}ms)`);
    } finally { globalThis.fetch = realFetch; }
  });

  await test("a genuine network error (not a timeout) is retried exactly once, and a second failure still resolves to null", async () => {
    let calls = 0;
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => { calls++; throw new TypeError("Failed to fetch"); };
    try {
      const result = await postPacket(packet, { timeoutMs: 4000 });
      assert.equal(result, null);
      assert.equal(calls, 2, "exactly one retry after a genuine network error");
    } finally { globalThis.fetch = realFetch; }
  });

  await test("a genuine network error that then SUCCEEDS on retry returns the real directive", async () => {
    let calls = 0;
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      calls++;
      if (calls === 1) throw new TypeError("Failed to fetch");
      return { ok: true, json: async () => ({ injectItems: ["x"], reorder: [], pairResolutions: [], probesUsed: 1 }) };
    };
    try {
      const result = await postPacket(packet, { timeoutMs: 4000 });
      assert.deepEqual(result, { injectItems: ["x"], reorder: [], pairResolutions: [], probesUsed: 1 });
      assert.equal(calls, 2);
    } finally { globalThis.fetch = realFetch; }
  });

  await test("warmUp() never throws even when fetch itself throws synchronously", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error("synchronous fetch failure"); };
    try { assert.doesNotThrow(() => warmUp()); } finally { globalThis.fetch = realFetch; }
  });

  await test("warmUp() never throws (and never rejects unhandled) when fetch rejects", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error("async fetch failure"));
    try { assert.doesNotThrow(() => warmUp()); } finally {
      await new Promise(r => setTimeout(r, 10)); // let the internal .catch(()=>{}) settle before restoring
      globalThis.fetch = realFetch;
    }
  });

  console.log(results.join("\n"));
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exit(1);
}

main().catch(e => { console.error("TEST SCRIPT THREW:", e); process.exit(1); });
