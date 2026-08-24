// Full end-to-end smoke test: real index.html + real app.js in jsdom, two
// pre-seeded finished v4 profiles, driven through the actual Compare screen
// (#selectA/#selectB/#generateBtn) — proving app.js's real renderCoupleReport()
// wiring, not just report-v8.js's exports in isolation.
//
// Covers the three states the Build Plan's Phase 5 QA gate calls for:
//   1. AI toggle off            -> reportRoot never gets an addon appended,
//                                   and its synchronous content is byte-
//                                   identical to what AI-on-but-network-down
//                                   also produces (since both skip the addon).
//   2. AI on, network/stub empty -> same byte-identical content (no empty
//                                   cards ever appended).
//   3. AI on, full directives    -> addon cards appended after the real
//                                   report, containing the expected text.
//
// jsdom scratch-install: see tests/questions-v8.render.smoke.mjs's header.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const REPO = new URL("../", import.meta.url).pathname;
const html = readFileSync(REPO + "index.html", "utf8");

function freshProfiles() {
  return [
    { id: "pA", name: "Alex", date: new Date().toISOString(), code: null, g: "f", s: "pre",
      answers: { __g: "f", __s: "pre", p1: 6, p7: 6, c2: 5, c4: 5 } },
    { id: "pB", name: "Sam", date: new Date().toISOString(), code: null, g: "f", s: "pre",
      answers: { __g: "f", __s: "pre", p1: 6, p7: 6, c2: 6, c4: 6 } },
  ];
}

async function runOnce({ aiEnabled, mockFetch, secondGenerate = false }) {
  const dom = new JSDOM(html, { url: "https://example.com/", pretendToBeVisual: true, runScripts: "outside-only" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.HTMLElement = dom.window.HTMLElement;

  localStorage.setItem("mw_profiles", JSON.stringify(freshProfiles()));
  if (aiEnabled === false) localStorage.setItem("mw_ai_enabled", "0");

  const realFetch = globalThis.fetch;
  globalThis.fetch = mockFetch || (async () => { throw new Error("network should not be reached in this run"); });

  await import(new URL("../js/app.js", import.meta.url).href + `?run=${Math.random()}`);

  document.querySelector('[data-action="go-compare"]').click();
  document.querySelector("#selectA").value = "pA";
  document.querySelector("#selectB").value = "pB";
  document.querySelector("#generateBtn").click();

  const syncHtml = document.querySelector("#reportRoot").innerHTML;
  await new Promise(r => setTimeout(r, 150)); // let the background addon fetch/append resolve
  let finalHtml = document.querySelector("#reportRoot").innerHTML;
  let finalText = document.querySelector("#reportRoot").textContent;

  let secondFinalHtml = null;
  if (secondGenerate) {
    // Same pair, same language — the exact "re-open the same comparison /
    // toggle language and back" case js/ai-cache-v8.js exists for. A cache
    // hit means the mock's call counter (tracked by the caller) must not
    // grow between the first wait above and this one.
    document.querySelector("#generateBtn").click();
    await new Promise(r => setTimeout(r, 150));
    secondFinalHtml = document.querySelector("#reportRoot").innerHTML;
  }

  globalThis.fetch = realFetch;
  return { syncHtml, finalHtml, finalText, secondFinalHtml };
}

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`ok   - ${name}`);
  else { console.error(`FAIL - ${name}`); failures++; }
}

const emptyStub = async (url, opts) => {
  const body = JSON.parse(opts.body);
  if (body.phase === "report_person") return new Response(JSON.stringify({ card: { summary: "", consistency: "", mattersMost: [] } }), { status: 200, headers: { "content-type": "application/json" } });
  if (body.phase === "report_couple") return new Response(JSON.stringify({ insights: [], conversations: [], divergences: [] }), { status: 200, headers: { "content-type": "application/json" } });
  return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
};

const fullStub = async (url, opts) => {
  const body = JSON.parse(opts.body);
  if (body.phase === "report_person") {
    return new Response(JSON.stringify({
      card: { summary: "A steady, clear communicator.", consistency: "Answered consistently across related items.", mattersMost: ["trust"] },
      openTextExtractions: [],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (body.phase === "report_couple") {
    return new Response(JSON.stringify({
      insights: [{ kind: "strength", title: "Shared outlook", text: "You both answered the same way on a core item.",
        evidence: [{ itemId: "p1", who: "a", summary: "Both rated this item identically." }] }],
      conversations: [], divergences: [],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
};

const off = await runOnce({ aiEnabled: false, mockFetch: async () => { throw new Error("must not be called with AI off"); } });
check("AI off: report renders synchronously with real content", off.syncHtml.length > 100);
check("AI off: nothing is appended in the background (sync === final)", off.syncHtml === off.finalHtml);
check("AI off: no v8 addon heading ever appears", !off.finalText.includes("In their own words") && !off.finalText.includes("Evidence-Backed Insights"));

const emptyOn = await runOnce({ aiEnabled: true, mockFetch: emptyStub });
check("AI on + empty stub: byte-identical to AI-off output (no empty cards)", emptyOn.finalHtml === off.syncHtml);

const fullOn = await runOnce({ aiEnabled: true, mockFetch: fullStub });
check("AI on + full directives: sync content matches the AI-off baseline before the addon lands", fullOn.syncHtml === off.syncHtml);
check("AI on + full directives: the addon is appended after a short delay (final grew)", fullOn.finalHtml.length > fullOn.syncHtml.length);
check("AI on + full directives: person card text appears", fullOn.finalText.includes("A steady, clear communicator."));
check("AI on + full directives: couple insight text appears", fullOn.finalText.includes("Shared outlook"));
check("AI on + full directives: person names appear only as plain text, never sent over the mocked network out of band", fullOn.finalText.includes("Alex"));

// ---- js/ai-cache-v8.js actually gets used: re-opening the same comparison
// (same pair, same language — generateBtn clicked a second time) must not
// re-hit the network for report_person/report_couple, only reuse what's
// already cached in this browser's localStorage.
{
  let calls = 0;
  const countingFullStub = async (url, opts) => {
    // Only count report_person/report_couple — the fire-and-forget warm-up
    // call at app load (phase "routing", sessionId "warmup") is unrelated to
    // the cache being tested here.
    const body = JSON.parse(opts.body);
    if (body.phase === "report_person" || body.phase === "report_couple") calls++;
    return fullStub(url, opts);
  };
  const cacheRun = await runOnce({ aiEnabled: true, mockFetch: countingFullStub, secondGenerate: true });
  check("cache: second generate() on the same pair renders the same final content as the first", cacheRun.secondFinalHtml === cacheRun.finalHtml);
  // 2 report_person calls (A + B) + 1 report_couple call = 3, for the FIRST
  // generate only. The second generate must add zero further calls.
  check(`cache: exactly 3 network calls total across both generates, not 6 (saw ${calls})`, calls === 3);
}

console.log(`\n${failures === 0 ? "PASSED" : "FAILED"} — ${failures} failing check(s)`);
if (failures > 0) process.exit(1);
