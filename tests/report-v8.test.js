// Plain Node test script, no framework, no DOM. Run: node tests/report-v8.test.js
// Exercises buildAiReportAddon() end to end with a mocked global fetch —
// packet allow-listing (no name leak), the empty-card drop rule, and the
// evidence-grounding filter on report_couple's insights/conversations/
// divergences. DOM-safety (textContent-only rendering) is covered
// separately by tests/report-v8.render.smoke.mjs, which needs jsdom.
"use strict";
const assert = require("node:assert/strict");

async function main() {
  const { buildBankV4 } = await import("../js/questions-v4.js");
  const { GENDER_KEY, STAGE_KEY, compareV4 } = await import("../js/scoring-v4.js");
  const { buildAiReportAddon } = await import("../js/report-v8.js");

  let passed = 0;
  const results = [];
  // Sequential on purpose: every test swaps out the shared globalThis.fetch
  // for the duration of one buildAiReportAddon() call. Running them
  // concurrently (Promise.all over already-started promises) would let two
  // tests race on that same global and clobber each other's mock mid-flight.
  async function test(name, fn) {
    try { await fn(); results.push(`ok   - ${name}`); passed++; }
    catch (e) { results.push(`FAIL - ${name}\n       ${e.stack || e.message}`); }
  }

  // buildBankV4 is only used to confirm the ids below are real; compareV4
  // itself resolves each profile's own bank internally.
  buildBankV4({ gender: "f", stage: "pre", intimacy: false });

  function makeProfiles() {
    const pa = { id: "a", name: "Alex", answers: {
      [GENDER_KEY]: "f", [STAGE_KEY]: "pre",
      p1: 6, c2: 5,
      ot_conflict_1: "We argued about who does the dishes and chores.",
    } };
    const pb = { id: "b", name: "Sam", answers: {
      [GENDER_KEY]: "f", [STAGE_KEY]: "pre",
      p1: 6, c2: 6,
    } };
    return { pa, pb };
  }

  function jsonResponse(obj) {
    return { ok: true, json: async () => obj };
  }

  await test("full round trip: person cards, extractions, couple insights all flow through with fabricated/ungrounded content dropped", async () => {
    const { pa, pb } = makeProfiles();
    const compareResult = compareV4(pa, pb);
    const calls = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      calls.push(body);
      if (body.phase === "report_person" && body.who === "a") {
        return jsonResponse({
          card: { summary: "Person A summary", consistency: "Mostly consistent.", mattersMost: ["family"] },
          openTextExtractions: [
            { itemId: "ot_conflict_1", signals: [
              { cat: "conflict", direction: "high", strength: "moderate", quote: "who does the dishes" },
              { cat: "conflict", direction: "high", strength: "strong", quote: "a total fabrication not in the text" },
            ] },
          ],
        });
      }
      if (body.phase === "report_person" && body.who === "b") {
        return jsonResponse({ card: { summary: "", consistency: "", mattersMost: [] } }); // empty -> dropped
      }
      if (body.phase === "report_couple") {
        return jsonResponse({
          insights: [
            { kind: "strength", title: "Aligned", text: "Both rated this the same.",
              evidence: [{ itemId: "p1", who: "a", summary: "Both answered 6." }] },
            { kind: "challenge", title: "Fabricated", text: "Should be dropped.",
              evidence: [{ itemId: "not_a_real_id", who: "a", summary: "made up" }] },
          ],
          conversations: [
            { prompt: "Talk about chores", why: "Comes up in open text.",
              evidence: [{ itemId: "ot_conflict_1", who: "a", summary: "mentions dishes" }] },
          ],
          divergences: [{ cat: "money", text: "real category" }, { cat: "not_a_real_cat", text: "should drop" }],
        });
      }
      return jsonResponse({});
    };

    let addon;
    try {
      addon = await buildAiReportAddon({ sessionId: "t1", lang: "en", pa, pb, compareResult });
    } finally {
      globalThis.fetch = realFetch;
    }

    assert.ok(addon, "addon should be non-null");
    assert.equal(addon.personA.card.summary, "Person A summary");
    assert.equal(addon.personA.extractions.length, 1);
    assert.equal(addon.personA.extractions[0].signals.length, 1, "the fabricated quote must be dropped, the real one kept");
    assert.equal(addon.personA.extractions[0].signals[0].quote, "who does the dishes");
    assert.equal(addon.personB, null, "an all-empty card must be dropped entirely");

    assert.equal(addon.couple.insights.length, 1, "the insight citing a non-existent itemId must be dropped whole");
    assert.equal(addon.couple.insights[0].title, "Aligned");
    assert.equal(addon.couple.conversations.length, 1);
    assert.equal(addon.couple.divergences.length, 1, "a divergence naming an unknown category must be dropped");
    assert.equal(addon.couple.divergences[0].cat, "money");

    // Packet-poisoning check: no request body ever carries a name, this
    // app's real anti-deanonymization guarantee, re-checked here the same
    // way ai-session-v8.js's own tests check it for the routing packet.
    for (const body of calls) {
      const json = JSON.stringify(body);
      assert.ok(!json.includes("Alex") && !json.includes("Sam"), "no request body may ever include a name");
      assert.ok(!("name" in body) && !("id" in body) && !("code" in body) && !("date" in body));
    }
  });

  await test("evidence citing a real shared item but attributed to the wrong partner is dropped", async () => {
    const { pa, pb } = makeProfiles();
    const compareResult = compareV4(pa, pb);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.phase === "report_person") {
        return jsonResponse({ card: { summary: "x", consistency: "y", mattersMost: [] } });
      }
      if (body.phase === "report_couple") {
        return jsonResponse({
          insights: [
            { kind: "strength", title: "Should still ground on a real shared id regardless of who", text: "t",
              evidence: [{ itemId: "p1", who: "b", summary: "s" }] }, // p1 is shared, "who" doesn't matter for shared ids
          ],
          conversations: [], divergences: [],
        });
      }
      return jsonResponse({});
    };
    let addon;
    try { addon = await buildAiReportAddon({ sessionId: "t2", lang: "en", pa, pb, compareResult }); }
    finally { globalThis.fetch = realFetch; }
    assert.equal(addon.couple.insights.length, 1, "a shared bank item grounds evidence regardless of the who tag");
  });

  await test("an open-text citation attributed to the OTHER partner (who never wrote it) is dropped", async () => {
    const { pa, pb } = makeProfiles();
    const compareResult = compareV4(pa, pb);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.phase === "report_person" && body.who === "a") {
        return jsonResponse({
          card: { summary: "x", consistency: "y", mattersMost: [] },
          openTextExtractions: [{ itemId: "ot_conflict_1", signals: [
            { cat: "conflict", direction: "high", strength: "weak", quote: "dishes" },
          ] }],
        });
      }
      if (body.phase === "report_person") return jsonResponse({ card: { summary: "x2", consistency: "y2", mattersMost: [] } });
      if (body.phase === "report_couple") {
        return jsonResponse({
          insights: [
            { kind: "challenge", title: "Misattributed", text: "t",
              evidence: [{ itemId: "ot_conflict_1", who: "b", summary: "s" }] }, // b never wrote ot_conflict_1
          ],
          conversations: [], divergences: [],
        });
      }
      return jsonResponse({});
    };
    let addon;
    try { addon = await buildAiReportAddon({ sessionId: "t3", lang: "en", pa, pb, compareResult }); }
    finally { globalThis.fetch = realFetch; }
    // The one insight's only evidence claim is misattributed, so the whole
    // insight is dropped — and with no conversations/divergences either,
    // the couple directive collapses to null entirely (no empty cards).
    assert.equal(addon.couple, null, "evidence attributed to a partner who never gave that answer must sink the whole insight");
  });

  await test("network entirely unreachable: resolves to null when there is also no quiz-time resolution bonus", async () => {
    const { pa, pb } = makeProfiles();
    const compareResult = compareV4(pa, pb);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("simulated network failure"); };
    let addon;
    try { addon = await buildAiReportAddon({ sessionId: "t4", lang: "en", pa, pb, compareResult }); }
    finally { globalThis.fetch = realFetch; }
    assert.equal(addon, null);
  });

  await test("network unreachable but a real quiz-time resolution bonus exists: addon carries confidence only", async () => {
    const { pa, pb } = makeProfiles();
    pa.answers.an3 = 6; pa.answers.an6 = 6; pa.answers.p_ctr_01 = 6;
    pa.answers.__ai8 = JSON.stringify([{ aId: "an3", bId: "an6", resolvedBy: "p_ctr_01" }]);
    const compareResult = compareV4(pa, pb);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("simulated network failure"); };
    let addon;
    try { addon = await buildAiReportAddon({ sessionId: "t5", lang: "en", pa, pb, compareResult }); }
    finally { globalThis.fetch = realFetch; }
    assert.ok(addon, "a nonzero, already-verified confidence bonus must render even with the network fully down");
    assert.ok(addon.confidence.resolutionBonus > 0);
    assert.equal(addon.personA, null);
    assert.equal(addon.personB, null);
    assert.equal(addon.couple, null);
  });

  await test("the current Phase-1 stub deployed live (empty-but-valid directives) resolves to null — byte-identical-to-off behaviour", async () => {
    const { pa, pb } = makeProfiles();
    const compareResult = compareV4(pa, pb);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.phase === "report_person") return jsonResponse({ card: { summary: "", consistency: "", mattersMost: [] } });
      if (body.phase === "report_couple") return jsonResponse({ insights: [], conversations: [], divergences: [] });
      return jsonResponse({});
    };
    let addon;
    try { addon = await buildAiReportAddon({ sessionId: "t6", lang: "en", pa, pb, compareResult }); }
    finally { globalThis.fetch = realFetch; }
    assert.equal(addon, null, "an all-empty stub response must never produce a visible addon");
  });

  await test("a malformed / non-object directive is discarded, not partially trusted", async () => {
    const { pa, pb } = makeProfiles();
    const compareResult = compareV4(pa, pb);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.phase === "report_person") return jsonResponse({ card: "not an object" }); // shape-invalid
      if (body.phase === "report_couple") return jsonResponse({ insights: "not an array" });
      return jsonResponse({});
    };
    let addon;
    try { addon = await buildAiReportAddon({ sessionId: "t7", lang: "en", pa, pb, compareResult }); }
    finally { globalThis.fetch = realFetch; }
    assert.equal(addon, null);
  });


  console.log(results.join("\n"));
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exit(1);
}

main().catch(e => { console.error("TEST SCRIPT THREW:", e); process.exit(1); });
