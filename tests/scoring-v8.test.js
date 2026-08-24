// Plain Node test script, no framework. Run: node tests/scoring-v8.test.js
"use strict";
const assert = require("node:assert/strict");

async function main() {
  const { buildBankV4 } = await import("../js/questions-v4.js");
  const { GENDER_KEY, STAGE_KEY } = await import("../js/scoring-v4.js");
  const {
    parseResolutionLog,
    validateNumericResolution,
    computeResolutionBonus,
    computeDisplayConfidence,
    filterValidOpenTextSignals,
  } = await import("../js/scoring-v8.js");

  let passed = 0;
  const results = [];
  function test(name, fn) {
    try { fn(); results.push(`ok   - ${name}`); passed++; }
    catch (e) { results.push(`FAIL - ${name}\n       ${e.message}`); }
  }

  const bank = buildBankV4({ gender: "f", stage: "pre", intimacy: false });

  function profileWith(extraAnswers, resolutionLog) {
    const answers = { [GENDER_KEY]: "f", [STAGE_KEY]: "pre", ...extraAnswers };
    if (resolutionLog) answers.__ai8 = JSON.stringify(resolutionLog);
    return { answers };
  }

  // ------------------------------------------------ parseResolutionLog --

  test("parseResolutionLog: missing key returns []", () => {
    assert.deepEqual(parseResolutionLog({ answers: {} }), []);
  });
  test("parseResolutionLog: malformed JSON returns [] rather than throwing", () => {
    assert.deepEqual(parseResolutionLog({ answers: { __ai8: "{not json" } }), []);
  });
  test("parseResolutionLog: a valid array round-trips", () => {
    const log = [{ aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" }];
    assert.deepEqual(parseResolutionLog({ answers: { __ai8: JSON.stringify(log) } }), log);
  });
  test("parseResolutionLog: non-array JSON (object, string, number) returns []", () => {
    assert.deepEqual(parseResolutionLog({ answers: { __ai8: JSON.stringify({ not: "an array" }) } }), []);
  });

  // ------------------------------------------------ validateNumericResolution --
  // Real pair: an3 (primary, rv absent) / an6 (rv:true, pair:"an3").
  // p_ctr_01 resolves this pair, sameDirectionAs "an3", no rv (matches an3's polarity).

  test("a probe answer that clearly sides with the primary item validates", () => {
    // an3=6 (raw, norm=6), an6=6 raw -> norm = 8-6=2 (rv:true) -> gap |6-2|=4, contradiction.
    // probe answers 6 too (norm=6, no rv) -> distance to na(6)=0, to nb(2)=4 -> min=0 <= tolerance(1) -> valid.
    const answers = { an3: 6, an6: 6, p_ctr_01: 6 };
    const candidate = { aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" };
    assert.equal(validateNumericResolution(candidate, bank, answers), true);
  });

  test("a probe answer that lands ambiguously between the two originals does NOT validate", () => {
    // na=6, nb=2 (as above). Probe answers 4 (norm=4) -> distance to na=2, to nb=2 -> min=2 > tolerance(1) -> invalid.
    const answers = { an3: 6, an6: 6, p_ctr_01: 4 };
    const candidate = { aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" };
    assert.equal(validateNumericResolution(candidate, bank, answers), false);
  });

  test("a probe that was never actually answered does NOT validate", () => {
    const answers = { an3: 6, an6: 6 }; // p_ctr_01 missing
    const candidate = { aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" };
    assert.equal(validateNumericResolution(candidate, bank, answers), false);
  });

  test("an unknown resolvedBy id does NOT validate (defensive — ai-session-v8 should already prevent this)", () => {
    const answers = { an3: 6, an6: 6, p_ctr_01: 6 };
    const candidate = { aId: "an3", bId: "an6", resolvedBy: "p_totally_made_up" };
    assert.equal(validateNumericResolution(candidate, bank, answers), false);
  });

  // ------------------------------------------------ computeResolutionBonus --

  test("computeResolutionBonus: two distinct validated pairs sum to 10 (2 x 5), uncapped at this stage", () => {
    const answers = {
      an3: 6, an6: 6, p_ctr_01: 6,              // pair 1, valid
      p1: 7, p7: 7, p_ctr_04: 7,                 // pair 2 (E extraversion), valid — p1 primary, no rv
    };
    const log = [
      { aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" },
      { aId: "p1", bId: "p7", resolvedBy: "p_ctr_04" },
    ];
    assert.equal(computeResolutionBonus(log, bank, answers), 10);
  });

  test("computeResolutionBonus: the same pair claimed twice only counts once", () => {
    const answers = { an3: 6, an6: 6, p_ctr_01: 6 };
    const log = [
      { aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" },
      { aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" },
    ];
    assert.equal(computeResolutionBonus(log, bank, answers), 5);
  });

  test("computeResolutionBonus: an invalid candidate contributes nothing", () => {
    const answers = { an3: 6, an6: 6 }; // p_ctr_01 never answered
    const log = [{ aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" }];
    assert.equal(computeResolutionBonus(log, bank, answers), 0);
  });

  // ------------------------------------------------ computeDisplayConfidence --

  test("computeDisplayConfidence: combines both partners' bonuses, capped at +10 total, ceiling 95", () => {
    const logA = [
      { aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" },
      { aId: "p1", bId: "p7", resolvedBy: "p_ctr_04" },
    ];
    const logB = [{ aId: "c2", bId: "c4", resolvedBy: "p_ctr_09" }];
    const pa = profileWith({ an3: 6, an6: 6, p_ctr_01: 6, p1: 7, p7: 7, p_ctr_04: 7 }, logA);
    const pb = profileWith({ c2: 6, c4: 6, p_ctr_09: 6 }, logB);

    const compareResult = { confidence: 90 }; // baseConfidence high on purpose to exercise the ceiling
    const result = computeDisplayConfidence(pa, pb, compareResult);
    assert.equal(result.baseConfidence, 90);
    assert.equal(result.bonusA, 10); // 2 pairs
    assert.equal(result.bonusB, 5);  // 1 pair
    assert.equal(result.resolutionBonus, 10, "combined bonus (15) must be capped at 10");
    assert.equal(result.displayConfidence, 95, "90 + 10 capped at the 95 ceiling -> 95, not 100");
  });

  test("computeDisplayConfidence: with no resolutions at all, displayConfidence equals baseConfidence exactly", () => {
    const pa = profileWith({}, []);
    const pb = profileWith({}, []);
    const result = computeDisplayConfidence(pa, pb, { confidence: 62 });
    assert.equal(result.resolutionBonus, 0);
    assert.equal(result.displayConfidence, 62);
  });

  test("computeDisplayConfidence: never exceeds the 95 ceiling even with a very high base + bonus", () => {
    const logA = [{ aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" }];
    const pa = profileWith({ an3: 6, an6: 6, p_ctr_01: 6 }, logA);
    const pb = profileWith({}, []);
    const result = computeDisplayConfidence(pa, pb, { confidence: 93 });
    assert.ok(result.displayConfidence <= 95);
    assert.equal(result.displayConfidence, 95);
  });

  // ------------------------------------------------ filterValidOpenTextSignals --

  test("a signal whose quote is a real substring of what was written passes", () => {
    const openTextAnswers = { ot_conflict_1: "We argued about visiting my parents every single weekend." };
    const extraction = {
      itemId: "ot_conflict_1",
      signals: [{ cat: "family", direction: "high", strength: "moderate", quote: "visiting my parents every single weekend" }],
    };
    const kept = filterValidOpenTextSignals(extraction, openTextAnswers);
    assert.equal(kept.length, 1);
  });

  test("a fabricated quote (not present in the original text) is dropped", () => {
    const openTextAnswers = { ot_conflict_1: "We argued about visiting my parents every single weekend." };
    const extraction = {
      itemId: "ot_conflict_1",
      signals: [{ cat: "family", direction: "high", strength: "strong", quote: "I want to leave this relationship" }],
    };
    assert.deepEqual(filterValidOpenTextSignals(extraction, openTextAnswers), []);
  });

  test("a quote that's real but for a DIFFERENT item's text is dropped (itemId must match)", () => {
    const openTextAnswers = {
      ot_conflict_1: "We argued about visiting my parents.",
      ot_money_1: "We fought about a car loan.",
    };
    const extraction = {
      itemId: "ot_conflict_1", // claims this item...
      signals: [{ cat: "money", direction: "high", strength: "weak", quote: "a car loan" }], // ...but quotes the OTHER item's text
    };
    assert.deepEqual(filterValidOpenTextSignals(extraction, openTextAnswers), []);
  });

  test("a malformed signal (missing required fields) is dropped even with a real quote", () => {
    const openTextAnswers = { ot_conflict_1: "We argued about money." };
    const extraction = { itemId: "ot_conflict_1", signals: [{ quote: "money" }] }; // missing cat/direction/strength
    assert.deepEqual(filterValidOpenTextSignals(extraction, openTextAnswers), []);
  });

  test("a mixed batch keeps only the valid signals, not all-or-nothing", () => {
    const openTextAnswers = { ot_conflict_1: "We argued about money and about my mother." };
    const extraction = {
      itemId: "ot_conflict_1",
      signals: [
        { cat: "money", direction: "high", strength: "moderate", quote: "money" },              // valid
        { cat: "family", direction: "high", strength: "strong", quote: "a total fabrication" },  // invalid
      ],
    };
    const kept = filterValidOpenTextSignals(extraction, openTextAnswers);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].quote, "money");
  });

  console.log(results.join("\n"));
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exit(1);
}

main().catch(e => { console.error("TEST SCRIPT THREW:", e); process.exit(1); });
