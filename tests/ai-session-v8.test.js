// Plain Node test script — no framework, matching this project's
// zero-dependency rule. Run: node tests/ai-session-v8.test.js
//
// These exercise js/ai-session-v8.js against the REAL question bank
// (buildBankV4 from js/questions-v4.js, CONSISTENCY_PAIRS from
// js/questions-v3.js) rather than synthetic fixtures, so a change to the
// real bank that breaks an assumption here fails loudly instead of the two
// silently drifting apart. Not part of the shipped app or the
// build-single.js bundle — dev-only.
"use strict";
const assert = require("node:assert/strict");

async function main() {
  const { buildBankV4 } = await import("../js/questions-v4.js");
  const {
    computeUnresolvedPairs,
    computeCategoryCoverage,
    buildRoutingPacket,
    applyDirective,
  } = await import("../js/ai-session-v8.js");

  let passed = 0;
  const results = [];
  function test(name, fn) {
    try {
      fn();
      results.push(`ok   - ${name}`);
      passed++;
    } catch (e) {
      results.push(`FAIL - ${name}\n       ${e.message}`);
    }
  }

  const bank = buildBankV4({ gender: "m", stage: "pre", intimacy: false });
  const idxOf = id => bank.findIndex(q => q.id === id);

  // A neutral, fully-answered prefix so buildRoutingPacket has real data to
  // work with. likert -> 4 (scale midpoint), mcq -> its first option's value.
  function neutralAnswerFor(q) {
    if (q.type === "likert") return 4;
    if (q.type === "mcq") return "v" in q.opts[0] ? q.opts[0].v : q.opts[0].k;
    return "";
  }

  // ---------------------------------------------------------------- pairs --

  test("a real consistency pair with a big gap is detected as unresolved", () => {
    const iAn3 = idxOf("an3"), iAn6 = idxOf("an6");
    assert.ok(iAn3 >= 0 && iAn6 >= 0, "an3/an6 should exist in the v4 bank (gender:m, stage:pre)");
    const iLast = Math.max(iAn3, iAn6);

    const answers = {};
    for (const q of bank.slice(0, iLast + 1)) answers[q.id] = neutralAnswerFor(q);
    // an6 is rv:true (reverse-scored) and pairs with an3. Same raw value on
    // both -> after normalization they're maximally apart, well past the
    // gap>=3 contradiction threshold scoring-v3.js itself uses.
    answers["an3"] = 6;
    answers["an6"] = 6;

    const pairs = computeUnresolvedPairs(bank, answers);
    const found = pairs.find(p => (p.aId === "an3" && p.bId === "an6") || (p.aId === "an6" && p.bId === "an3"));
    assert.ok(found, `expected an3/an6 to show up as unresolved, got ${JSON.stringify(pairs)}`);
    assert.ok(found.gap >= 3, `gap should be >= 3, got ${found.gap}`);
  });

  test("a pair with only one side answered is not reported (need both)", () => {
    const answers = { an3: 6 }; // an6 deliberately missing
    const pairs = computeUnresolvedPairs(bank, answers);
    assert.equal(pairs.some(p => p.aId === "an3" || p.bId === "an3"), false);
  });

  test("a pair with matching (non-contradictory) normalized answers is not reported", () => {
    const iAn3 = idxOf("an3"), iAn6 = idxOf("an6");
    const answers = {};
    for (const q of bank.slice(0, Math.max(iAn3, iAn6) + 1)) answers[q.id] = neutralAnswerFor(q);
    // an6 is reverse-scored, so a "consistent" pair has DIFFERENT raw values
    // that normalize to the same thing: an3=6 direct, an6 reverse of 6 is
    // 8-6=2, so an6's raw answer should be 2 to normalize back to 6 too.
    answers["an3"] = 6;
    answers["an6"] = 2;
    const pairs = computeUnresolvedPairs(bank, answers);
    assert.equal(pairs.some(p => p.aId === "an3" || p.bId === "an3"), false);
  });

  // ------------------------------------------------------------ coverage --

  test("category coverage totals match a manual count over the same bank", () => {
    const answers = {};
    // Answer every 3rd item so coverage is partial and checkable.
    bank.forEach((q, idx) => { if (idx % 3 === 0) answers[q.id] = neutralAnswerFor(q); });

    const coverage = computeCategoryCoverage(bank, answers);
    const manual = new Map();
    bank.forEach((q, idx) => {
      const e = manual.get(q.cat) || { total: 0, answered: 0 };
      e.total++;
      if (idx % 3 === 0) e.answered++;
      manual.set(q.cat, e);
    });

    assert.equal(coverage.length, manual.size);
    for (const row of coverage) {
      const expected = manual.get(row.cat);
      assert.equal(row.total, expected.total, `cat ${row.cat} total`);
      assert.equal(row.answered, expected.answered, `cat ${row.cat} answered`);
    }
  });

  // --------------------------------------------------- privacy allow-list --

  test("packet never contains name/code/id/date even if the caller's answers object is poisoned with them", () => {
    const i = 10;
    const answers = {};
    for (const q of bank.slice(0, i + 1)) answers[q.id] = neutralAnswerFor(q);
    // Simulate a careless caller accidentally handing over profile fields
    // alongside real answers. buildRoutingPacket must ignore all of these
    // because it only ever reads answers[q.id] for ids present in `bank` —
    // none of these keys are real question ids.
    answers.name = "Should Never Leak";
    answers.code = "ABCD-EFGH";
    answers.id = "p_1234567890";
    answers.date = "2026-08-24T00:00:00.000Z";
    answers.__g = "m"; // the real GENDER_KEY app.js seeds into quiz.answers
    answers.__s = "pre"; // the real STAGE_KEY

    const packet = buildRoutingPacket({
      sessionId: "test-session", lang: "en", bank, i, answers,
      probeBudgetLeft: 8, checkpointIndex: 0,
    });

    const serialized = JSON.stringify(packet);
    for (const forbidden of ["Should Never Leak", "ABCD-EFGH", "p_1234567890", "2026-08-24T00:00:00"]) {
      assert.equal(serialized.includes(forbidden), false, `packet leaked "${forbidden}"`);
    }
    // __g/__s aren't real bank ids, so they must not appear as answered items either.
    assert.equal(packet.answered.some(a => a.id === "__g" || a.id === "__s"), false);
  });

  test("open-text answers are routed to openText, not answered, and truncated at 500 chars", () => {
    const fakeTextQ = { id: "ot_test", cat: "conflict", type: "text" };
    const b = [...bank.slice(0, 3), fakeTextQ];
    const answers = {};
    for (const q of bank.slice(0, 3)) answers[q.id] = neutralAnswerFor(q);
    answers.ot_test = "x".repeat(600);

    const packet = buildRoutingPacket({
      sessionId: "s", lang: "en", bank: b, i: 3, answers, probeBudgetLeft: 8, checkpointIndex: 0,
    });
    assert.equal(packet.answered.some(a => a.id === "ot_test"), false);
    const ot = packet.openText.find(o => o.id === "ot_test");
    assert.ok(ot, "expected ot_test in openText");
    assert.equal(ot.text.length, 500);
  });

  // ------------------------------------------------- injection boundary --

  test("reorder moves named tail items to the front, in order, never touches index <= i", () => {
    const i = 5;
    const tailIds = bank.slice(i + 1, i + 4).map(q => q.id); // just 3 of the many remaining ids
    const before = bank.slice(0, i + 1).map(q => q.id);
    const fullTailBefore = bank.slice(i + 1).map(q => q.id);

    const testBank = bank.slice(); // shallow copy, applyDirective mutates via splice
    const wanted = [...tailIds].reverse(); // "show these 3 next, in this order" — not the whole tail
    const directive = { injectItems: [], reorder: wanted, pairResolutions: [], probesUsed: 0 };
    applyDirective(directive, { bank: testBank, i, sentUnresolvedPairs: [], injectedSoFar: 0, itemsById: {} });

    assert.deepEqual(testBank.slice(0, i + 1).map(q => q.id), before, "answered/onscreen prefix must be untouched");
    assert.deepEqual(testBank.slice(i + 1, i + 4).map(q => q.id), wanted, "the 3 named ids should now lead the tail, in the requested order");
    // Everything else keeps its original relative order behind them.
    const restAfter = testBank.slice(i + 4).map(q => q.id);
    const restBefore = fullTailBefore.filter(id => !wanted.includes(id));
    assert.deepEqual(restAfter, restBefore, "unnamed items must keep their original relative order");
  });

  test("a reorder that references an already-answered id is rejected outright (not partially applied)", () => {
    const i = 5;
    const before = bank.slice();
    const maliciousReorder = [bank[2].id, ...bank.slice(i + 1, i + 4).map(q => q.id)]; // includes an answered id

    const testBank = bank.slice();
    const directive = { injectItems: [], reorder: maliciousReorder, pairResolutions: [], probesUsed: 0 };
    applyDirective(directive, { bank: testBank, i, sentUnresolvedPairs: [], injectedSoFar: 0, itemsById: {} });

    assert.deepEqual(testBank.map(q => q.id), before.map(q => q.id), "bank must be unchanged when reorder is invalid");
  });

  test("injectItems: unknown ids are dropped, known ids are spliced right after i, budget is enforced", () => {
    const i = 4;
    const fakeItems = {
      p_a: { id: "p_a", cat: "conflict", type: "likert" },
      p_b: { id: "p_b", cat: "conflict", type: "likert" },
      p_c: { id: "p_c", cat: "conflict", type: "likert" },
    };
    const testBank = bank.slice();
    const directive = {
      injectItems: ["p_a", "p_nonexistent", "p_b", "p_c"],
      reorder: [], pairResolutions: [], probesUsed: 0,
    };
    const { injectedCount } = applyDirective(directive, {
      bank: testBank, i, sentUnresolvedPairs: [], injectedSoFar: 6, // only 2 slots left of an 8 budget
      itemsById: fakeItems,
    });

    assert.equal(injectedCount, 2, "budget should cap injection at 2 (8 - 6 already used)");
    assert.equal(testBank[i + 1].id, "p_a");
    assert.equal(testBank[i + 2].id, "p_b");
    assert.notEqual(testBank[i + 3] && testBank[i + 3].id, "p_c", "third item should NOT be injected — budget exhausted");
  });

  test("pairResolutions: only forwarded when the pair was really sent AND the resolver id was really injected this round", () => {
    const i = 4;
    const fakeItems = { p_real: { id: "p_real", cat: "attachment", type: "likert" } };
    const testBank = bank.slice();
    const sentUnresolvedPairs = [{ aId: "an3", bId: "an6", gap: 4 }];
    const directive = {
      injectItems: ["p_real"],
      reorder: [], probesUsed: 1,
      pairResolutions: [
        { aId: "an3", bId: "an6", resolvedBy: "p_real" },       // valid
        { aId: "x1", bId: "x2", resolvedBy: "p_real" },          // pair never sent -> reject
        { aId: "an3", bId: "an6", resolvedBy: "p_ghost" },       // resolver never injected -> reject
      ],
    };
    const { confirmedResolutionCandidates } = applyDirective(directive, {
      bank: testBank, i, sentUnresolvedPairs, injectedSoFar: 0, itemsById: fakeItems,
    });
    assert.equal(confirmedResolutionCandidates.length, 1);
    assert.equal(confirmedResolutionCandidates[0].resolvedBy, "p_real");
  });

  console.log(results.join("\n"));
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exit(1);
}

main().catch(e => { console.error("TEST SCRIPT THREW:", e); process.exit(1); });
