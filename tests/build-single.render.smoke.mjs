// Executes the actual built MatchWise-preview.html (not the module source)
// in jsdom with runScripts: "dangerously" — proves the single-file offline
// build genuinely boots, not just that build-single.js's own string-based
// sanity checks passed. Run `node build-single.js` first.
//
// jsdom scratch-install: see tests/questions-v8.render.smoke.mjs's header.
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";

const REPO = new URL("../", import.meta.url).pathname;
const path = REPO + "MatchWise-preview.html";
if (!existsSync(path)) {
  console.error("MatchWise-preview.html not found — run `node build-single.js` first");
  process.exit(1);
}
const html = readFileSync(path, "utf8");

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`ok   - ${name}`);
  else { console.error(`FAIL - ${name}`); failures++; }
}

const errors = [];
const dom = new JSDOM(html, {
  url: "https://example.com/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  resources: "usable",
});
dom.window.fetch = async () => { throw new Error("no network in this smoke test"); };
dom.window.addEventListener("error", e => errors.push(e.error || e.message));

// Let the inline script's top-level synchronous work (including the
// fire-and-forget warmUp() call, which will reject harmlessly against the
// stubbed fetch above) settle.
await new Promise(r => setTimeout(r, 100));

check("no uncaught runtime errors while the bundle loaded", errors.length === 0);
if (errors.length) console.error(errors);

const doc = dom.window.document;
check("the home screen actually rendered", !!doc.querySelector("#screen-home"));
check("the Insight Engine toggle is present and checked (default ON)", doc.querySelector("#aiEnabledCheck")?.checked === true);
check("the toggle's label text is the real i18n string, not a raw key", doc.querySelector("#aiEnabledCheck")?.closest("label")?.textContent.includes("Enhanced online analysis"));

// Toggle it off and confirm the click handler actually ran (localStorage
// write), proving the bundled app.js wiring — not just markup — is intact.
const check1 = doc.querySelector("#aiEnabledCheck");
check1.checked = false;
check1.dispatchEvent(new dom.window.Event("change"));
check("unchecking the toggle persists to localStorage", dom.window.localStorage.getItem("mw_ai_enabled") === "0");

console.log(`\n${failures === 0 ? "PASSED" : "FAILED"} — ${failures} failing check(s)`);
if (failures > 0) process.exit(1);
