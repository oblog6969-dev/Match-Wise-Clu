// Validates js/questions-v8.js content against the real v4 bank. Run:
// node tests/questions-v8.test.js
"use strict";
const assert = require("node:assert/strict");

async function main() {
  const { buildBankV4 } = await import("../js/questions-v4.js");
  const { CONSISTENCY_PAIRS } = await import("../js/questions-v3.js");
  const { PROBE_ITEMS, OPEN_TEXT_ITEMS, AI_ITEMS_BY_ID } = await import("../js/questions-v8.js");

  let passed = 0;
  const results = [];
  function test(name, fn) {
    try { fn(); results.push(`ok   - ${name}`); passed++; }
    catch (e) { results.push(`FAIL - ${name}\n       ${e.message}`); }
  }

  const realBank = buildBankV4({ gender: "m", stage: "mar", intimacy: true });
  const realIds = new Set(realBank.map(q => q.id));
  const allV8Items = [...PROBE_ITEMS, ...OPEN_TEXT_ITEMS];

  test("expected counts: 40 probes (12 contradiction + 17 vague + 11 dealbreaker), 4 open-text", () => {
    const byKind = { contradiction: 0, vague: 0, dealbreaker: 0 };
    for (const p of PROBE_ITEMS) byKind[p.kind] = (byKind[p.kind] || 0) + 1;
    assert.equal(byKind.contradiction, 12);
    assert.equal(byKind.vague, 17);
    assert.equal(byKind.dealbreaker, 11);
    assert.equal(PROBE_ITEMS.length, 40);
    assert.equal(OPEN_TEXT_ITEMS.length, 4);
  });

  test("no id collides with a real QUESTIONS_V4 id — this is what structurally keeps them invisible to compareV4()", () => {
    const collisions = allV8Items.filter(q => realIds.has(q.id)).map(q => q.id);
    assert.deepEqual(collisions, []);
  });

  test("every v8 item id is unique within questions-v8.js", () => {
    const ids = allV8Items.map(q => q.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids found: ${JSON.stringify(ids.filter((id, i) => ids.indexOf(id) !== i))}`);
  });

  test("AI_ITEMS_BY_ID has exactly one entry per item, no drift from the source arrays", () => {
    assert.equal(Object.keys(AI_ITEMS_BY_ID).length, allV8Items.length);
    for (const q of allV8Items) assert.equal(AI_ITEMS_BY_ID[q.id], q);
  });

  test("every 'contradiction' probe's resolvesPair is a REAL entry in CONSISTENCY_PAIRS, in either order", () => {
    const pairKeys = new Set(CONSISTENCY_PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
    const contradictionProbes = PROBE_ITEMS.filter(p => p.kind === "contradiction");
    assert.equal(contradictionProbes.length, 12);
    for (const p of contradictionProbes) {
      assert.ok(Array.isArray(p.resolvesPair) && p.resolvesPair.length === 2, `${p.id} missing resolvesPair`);
      const [a, b] = p.resolvesPair;
      assert.ok(pairKeys.has(`${a}|${b}`), `${p.id}'s resolvesPair [${a},${b}] is not a real CONSISTENCY_PAIRS entry`);
      assert.ok(p.sameDirectionAs === a || p.sameDirectionAs === b, `${p.id}'s sameDirectionAs must be one of its own resolvesPair ids`);
    }
  });

  test("every 'vague' probe's cat is a real, user-facing category (never 'quality')", () => {
    const realCats = new Set(realBank.map(q => q.cat));
    const vagueProbes = PROBE_ITEMS.filter(p => p.kind === "vague");
    assert.equal(vagueProbes.length, 17);
    for (const p of vagueProbes) {
      assert.notEqual(p.cat, "quality", `${p.id} must not target the response-quality category`);
      assert.ok(realCats.has(p.cat), `${p.id}'s cat "${p.cat}" isn't a real category in the v4 bank`);
    }
  });

  test("every 'dealbreaker' probe targets one of the app's 3 REAL db:true topics (family/values/growth only)", () => {
    const dealbreakerProbes = PROBE_ITEMS.filter(p => p.kind === "dealbreaker");
    assert.equal(dealbreakerProbes.length, 11);
    const allowedCats = new Set(["family", "values", "growth"]);
    for (const p of dealbreakerProbes) assert.ok(allowedCats.has(p.cat), `${p.id} has unexpected cat "${p.cat}"`);
  });

  test("every item has non-empty en/ar text (or, for mcq, non-empty en/ar on every option)", () => {
    for (const q of allV8Items) {
      if (q.type === "mcq") {
        assert.ok(Array.isArray(q.opts) && q.opts.length >= 2, `${q.id} mcq needs >=2 opts`);
        for (const o of q.opts) {
          assert.equal(typeof o.v, "number", `${q.id} option missing numeric v`);
          assert.ok(o.en && o.ar, `${q.id} has an option missing en/ar text`);
        }
      } else {
        assert.ok(q.en && q.ar, `${q.id} missing en/ar text`);
      }
    }
  });

  test("open-text items all cap at 500 chars and cover the 4 spec'd topics", () => {
    for (const q of OPEN_TEXT_ITEMS) assert.equal(q.maxLen, 500);
    const cats = OPEN_TEXT_ITEMS.map(q => q.cat).sort();
    assert.deepEqual(cats, ["conflict", "emotional", "family", "money"]);
  });

  console.log(results.join("\n"));
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exit(1);
}

main().catch(e => { console.error("TEST SCRIPT THREW:", e); process.exit(1); });
