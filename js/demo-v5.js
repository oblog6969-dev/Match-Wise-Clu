// MatchWise v5 demo profiles — additive layer over v4.
// -----------------------------------------------------------------------------
// Does NOT modify js/questions-v4.js or js/scoring-v4.js.
//
// Two illustrative profiles, generated LIVE from the current v4 question
// bank rather than hand-authored — so they can never drift out of sync with
// the bank (a hand-authored demo referencing an old question id would break
// silently), and they exercise the exact buildBankV4 / compareV4 path a
// real assessment does.
//
// A seeded PRNG makes the two profiles reproducible: the same names always
// get the same answers, so "Load demo profiles" shows a stable report a
// user can screenshot or come back to — this is not meant to look different
// on every click.
//
// GUARDRAIL: every profile this module returns carries `demo: true`. The UI
// (app.js) must never let a demo profile publish a share code, upload to
// Supabase, or be exported as if it were a real person's data — see the
// checks in app.js around DEMO ids.
// -----------------------------------------------------------------------------

import { buildBankV4 } from "./questions-v4.js";
import { GENDER_KEY, STAGE_KEY } from "./scoring-v4.js";

export const DEMO_IDS = ["demo_a", "demo_b"];

// mulberry32 — tiny, dependency-free seeded PRNG. Good enough for "stable
// demo answers", not intended for anything cryptographic.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Answer every item in `bank` for one persona.
 * `lean` in [-1, 1] biases which end of a likert (1-7) or mcq option list
 * the persona tends toward; jitter keeps answers from looking mechanically
 * identical question to question, the way a real person's would not be.
 */
function genAnswers(bank, gender, stage, lean, seed) {
  const rand = mulberry32(seed);
  const answers = {};
  if (gender) answers[GENDER_KEY] = gender;
  if (stage) answers[STAGE_KEY] = stage;

  for (const q of bank) {
    if (q.type === "likert") {
      const center = 4 + lean * 2.2;
      const jitter = (rand() - 0.5) * 2.4;
      answers[q.id] = Math.max(1, Math.min(7, Math.round(center + jitter)));
    } else if (q.type === "mcq" && q.opts && q.opts.length) {
      const n = q.opts.length;
      const target = ((lean + 1) / 2) * (n - 1);
      const idx = Math.max(0, Math.min(n - 1, Math.round(target + (rand() - 0.5) * (n - 1))));
      const o = q.opts[idx];
      answers[q.id] = "v" in o ? o.v : o.k;
    }
  }
  return answers;
}

/**
 * Two profiles, kept close but not identical (lean 0.3 vs -0.1) so the demo
 * report shows real texture — some strengths, a couple of areas worth
 * discussing — rather than either a suspiciously perfect match or a
 * discouraging mismatch on first look.
 */
export function buildDemoProfiles() {
  const now = new Date().toISOString();
  const bankA = buildBankV4({ gender: "f", stage: "pre", intimacy: true });
  const bankB = buildBankV4({ gender: "m", stage: "pre", intimacy: true });
  return [
    {
      id: "demo_a", demo: true, name: "Sarah", date: now,
      g: "f", s: "pre",
      answers: genAnswers(bankA, "f", "pre", 0.3, 10301),
    },
    {
      id: "demo_b", demo: true, name: "Ahmad", date: now,
      g: "m", s: "pre",
      answers: genAnswers(bankB, "m", "pre", -0.1, 20602),
    },
  ];
}
