// End-to-end render smoke test: real index.html + real app.js in jsdom,
// with global fetch mocked so the Insight Engine "injects" real probes from
// js/questions-v8.js — proving the actual rendering path (likert probe, mcq
// probe, and the new text-type UI added in Phase 3) all work, not just the
// pure logic tested elsewhere.
//
// Needs jsdom, which is NOT a project dependency (this app ships zero
// dependencies on purpose). Install it somewhere scratch and point this
// script's import at it, e.g.:
//   mkdir /tmp/mw-smoke && cd /tmp/mw-smoke && npm init -y && npm install jsdom
//   node --conditions=node /path/to/this/file.mjs   (run from a dir where `jsdom` resolves)
// Not run automatically by anything — a manual verification tool, same
// spirit as ai-session-v8.integration.test.js.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const REPO = new URL("../", import.meta.url).pathname;

const html = readFileSync(REPO + "index.html", "utf8");
const dom = new JSDOM(html, { url: "https://example.com/", pretendToBeVisual: true, runScripts: "outside-only" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;

// ---- mock fetch: every "routing" call injects one real probe of each
// ---- interesting type, once, then goes quiet (empty directive) so the
// ---- test has a stable end state to assert against.
let injected = false;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (typeof url === "string" && url.includes("/functions/v1/assess")) {
    const body = JSON.parse(opts.body);
    // Skip the fire-and-forget warm-up call (sessionId "warmup", fired once
    // at app load, result always discarded by ai-client-v8.js) — otherwise
    // it eats the one-shot injection below before any real quiz answer
    // has even happened.
    if (body.phase === "routing" && body.sessionId !== "warmup" && !injected) {
      injected = true;
      return new Response(JSON.stringify({
        injectItems: ["p_ctr_01", "p_vg_03", "ot_conflict_1"], // likert, mcq, text
        reorder: [], pairResolutions: [], probesUsed: 3,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ injectItems: [], reorder: [], pairResolutions: [], probesUsed: 0 }),
      { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(url, opts);
};

await import(new URL("../js/app.js", import.meta.url).href);

document.querySelector("#nameInput").value = "Render Smoke";
const genderRadio = document.querySelector('input[name="gender"][value="f"]');
if (genderRadio) genderRadio.checked = true;
document.querySelector('[data-action="begin-quiz"]').click();
await new Promise(r => setTimeout(r, 50));

function clickFirstAvailable() {
  const likert = document.querySelector(".likert-dot");
  const opt = document.querySelector(".opt:not([data-text-action])");
  const textContinue = document.querySelector('[data-text-action="continue"]');
  if (likert) { likert.click(); return "likert"; }
  if (opt) { opt.click(); return "mcq"; }
  if (textContinue) {
    const ta = document.querySelector("#textAnswer");
    if (ta) ta.value = "A quick test answer for the open-text smoke check.";
    textContinue.click();
    return "text";
  }
  return null;
}

const seen = { likertProbe: false, mcqProbe: false, textProbe: false };
for (let n = 0; n < 40; n++) {
  const cardText = document.querySelector("#questionCard")?.innerHTML || "";
  if (cardText.includes("imagining the worst")) seen.likertProbe = true;       // p_ctr_01
  if (cardText.includes("moving away from family")) seen.mcqProbe = true;      // p_vg_03
  if (cardText.includes("Think about the last real disagreement")) seen.textProbe = true; // ot_conflict_1

  const kind = clickFirstAvailable();
  if (!kind) break; // quiz finished
  await new Promise(r => setTimeout(r, 260));
}

console.log("seen during the run:", JSON.stringify(seen));
const missing = Object.entries(seen).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error("FAILED — never rendered:", missing.join(", "));
  process.exit(1);
}
console.log("PASSED — likert probe, mcq probe, and open-text item all rendered and were answerable end-to-end.");
