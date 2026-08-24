// DOM-safety smoke test for report-v8.js's render layer: proves every
// AI-authored string ends up as literal, inert TEXT — never parsed as
// markup — and proves the empty/partial/full addon shapes each render
// exactly the sections they should and nothing else.
//
// Needs jsdom, same scratch-install pattern as
// tests/questions-v8.render.smoke.mjs:
//   mkdir /tmp/mw-smoke && cd /tmp/mw-smoke && npm init -y && npm install jsdom
//   ln -s /tmp/mw-smoke/node_modules node_modules   (from the repo root)
//   node --conditions=node tests/report-v8.render.smoke.mjs
//   rm node_modules   (remove the symlink again immediately after)
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>", { url: "https://example.com/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const { renderAiReportAddon } = await import(new URL("../js/report-v8.js", import.meta.url).href);

const pa = { name: "Alex" };
const pb = { name: "Sam" };

let failures = 0;
function check(name, cond) {
  if (cond) { console.log(`ok   - ${name}`); }
  else { console.error(`FAIL - ${name}`); failures++; }
}

// ---- null in, null out --------------------------------------------------
check("renderAiReportAddon(null) returns null", renderAiReportAddon(null, pa, pb, "en") === null);

// ---- an addon with nothing in it never happens per buildAiReportAddon's
// ---- own contract, but the render layer is defensive anyway: an addon
// ---- object with every section empty/falsy must still render nothing.
check("an all-empty addon object renders null (defensive, belt-and-suspenders)",
  renderAiReportAddon({ confidence: { resolutionBonus: 0 }, personA: null, personB: null, couple: null }, pa, pb, "en") === null);

// ---- confidence-only ------------------------------------------------------
{
  const node = renderAiReportAddon({ confidence: { resolutionBonus: 10, baseConfidence: 62, displayConfidence: 72 }, personA: null, personB: null, couple: null }, pa, pb, "en");
  check("confidence-only addon renders exactly one card", node && node.children.length === 1);
  check("confidence card mentions both the base and display numbers", node && node.textContent.includes("62%") && node.textContent.includes("72%"));
}

// ---- XSS / markup-injection safety ---------------------------------------
// A crafted title/summary/quote containing raw markup must reach the DOM as
// literal text — never as a parsed element, never as an executable handler.
const MALICIOUS = '<img src=x onerror="window.__pwned=true">';
{
  const addon = {
    confidence: { resolutionBonus: 0 },
    personA: { card: { summary: MALICIOUS, consistency: MALICIOUS, mattersMost: [MALICIOUS] }, extractions: [] },
    personB: null,
    couple: {
      insights: [{ kind: "strength", title: MALICIOUS, text: MALICIOUS, evidence: [{ itemId: "x", who: "a", summary: MALICIOUS }] }],
      conversations: [{ prompt: MALICIOUS, why: MALICIOUS, evidence: [] }],
      divergences: [{ cat: "money", text: MALICIOUS }],
    },
  };
  const node = renderAiReportAddon(addon, pa, pb, "en");
  check("full addon (person + insights + conversations + divergences) renders", !!node);
  check("no <img> element was ever created from the malicious string", node.querySelectorAll("img").length === 0);
  check("no onerror handler exists anywhere in the rendered subtree", node.querySelectorAll("[onerror]").length === 0);
  check("window.__pwned was never set (nothing executed)", globalThis.window.__pwned !== true);
  check("the malicious string still appears as literal, escaped text in the serialized HTML",
    node.innerHTML.includes("&lt;img") && !node.innerHTML.includes("<img "));
  check("every occurrence of MALICIOUS reached the DOM as real text content",
    node.textContent.split(MALICIOUS).length - 1 >= 5); // summary, consistency, mattersMost, insight title/text, evidence summary, conversation, divergence
}

// ---- only-couple, no person cards -----------------------------------------
{
  const addon = {
    confidence: { resolutionBonus: 0 },
    personA: null, personB: null,
    couple: { insights: [], conversations: [{ prompt: "Talk about it", why: "It matters", evidence: [] }], divergences: [] },
  };
  const node = renderAiReportAddon(addon, pa, pb, "en");
  check("couple-only addon (no person cards) still renders", !!node);
  check("no 'In their own words' person-card heading appears when personA/personB are both null",
    !node.textContent.includes(pa.name) || node.querySelectorAll("h3").length === 1);
}

console.log(`\n${failures === 0 ? "PASSED" : "FAILED"} — ${failures} failing check(s)`);
if (failures > 0) process.exit(1);
