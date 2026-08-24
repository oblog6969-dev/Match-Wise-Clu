// Integration test — exercises createAiSession() end to end against the
// REAL deployed edge function (supabase project xtrtilekegrzatnmgyul).
// Needs network access; not run as part of any build step. The pure-logic
// unit tests in ai-session-v8.test.js are what CI-type checks should rely
// on — this one is for confirming the actual wiring once, by hand.
// Run: node tests/ai-session-v8.integration.test.js
"use strict";
const assert = require("node:assert/strict");

async function main() {
  const { buildBankV4 } = await import("../js/questions-v4.js");
  const { createAiSession } = await import("../js/ai-session-v8.js");

  const bank = buildBankV4({ gender: "f", stage: "mar", intimacy: false });
  const session = createAiSession({ lang: "en", sessionId: "integration-test-" + Date.now(), enabled: true });

  const answers = {};
  let checkpointsFiredSoFar = () => session.getSessionSummary().checkpointsUsed;

  // Walk the first 20 questions, answering each and calling onAnswer/drainPending
  // exactly like js/app.js's answer()/renderQuestion() would.
  for (let i = 0; i < 20 && i < bank.length; i++) {
    const q = bank[i];
    const v = q.type === "likert" ? 4 : ("v" in q.opts[0] ? q.opts[0].v : q.opts[0].k);
    answers[q.id] = v;
    session.onAnswer(q, v, bank, i, answers);

    // Give any in-flight checkpoint call a moment to land before the next
    // renderQuestion() would run, same as real navigation timing (220ms tap
    // guard in app.js) — generous here since we're not simulating clicks.
    await new Promise(r => setTimeout(r, 700));
    session.drainPending(bank, i + 1);
  }

  const summary = session.getSessionSummary();
  console.log("session summary:", JSON.stringify(summary));

  assert.ok(summary.checkpointsUsed >= 1, "expected at least one checkpoint to have fired over 20 answers");
  assert.equal(summary.disabled, false, "session should not be disabled — the real function should have answered every checkpoint");
  assert.equal(summary.abandons, 0, "no abandons expected against a healthy, warm edge function");

  console.log("ok   - full session against the live edge function: checkpoints fired, no abandons, session stayed enabled");
}

main().catch(e => { console.error("INTEGRATION TEST FAILED:", e); process.exit(1); });
