// MatchWise v4 scoring engine — additive layer over v3.
// -----------------------------------------------------------------------------
// Does NOT modify js/scoring.js or js/scoring-v3.js.
//
// What v4 adds:
//   1. The bank is gender-resolved before scoring, so each person is scored
//      against the exact item text they saw. Because gender variants are
//      required to expose the same option values (enforced in
//      questions-v4.js), a male and a female profile remain directly
//      comparable item-for-item. Nothing about the engine changes.
//   2. Four worldview axes, computed from `ax` loads carried on ordinary
//      options. Axes are reported per person and compared per couple, but
//      they NEVER enter the alignment index — see the guardrail below.
//   3. Four new items (n1..n4) join the normal pair-matching engine.
//
// What v4 deliberately does not change: the alignment index formula,
// deal-breaker capping, confidence, Big Five, attachment, love language and
// response quality all come through v3 untouched. Personality, attachment
// and quality items are byte-identical in v4, so v3's functions are correct
// for them as-is and are reused rather than reimplemented.
//
// GUARDRAIL: worldview axes must not silently move the headline number.
// A large gap on a critical axis raises a topic and a warning line. It does
// not cap the index the way a deal-breaker does. Anything stronger would be
// asserting that a values gap predicts relationship failure, which the
// evidence in the README does not support.
// -----------------------------------------------------------------------------

// Every import below MUST stay on ONE line. build-single.js flattens the
// modules into a single offline script by deleting whole lines that begin
// with `import`; a multi-line import leaves its continuation lines and the
// closing `} from "…";` behind, which is a syntax error in the bundle.
import { questionScore, loveLanguage } from "./scoring.js";
import { CONSISTENCY_PAIRS } from "./questions-v3.js";
import { bigFiveV3, attachmentV3, impressionManagement, attentionCheck, profileConfidenceV3, profileHasIntimacy, CONFIDENCE_FLOOR } from "./scoring-v3.js";
import { QUESTIONS_V4, buildBankV4, isV4Answers, AXES, AXES_CRITICAL, AXIS_MIN_ITEMS, V4_ONLY_IDS, STAGES } from "./questions-v4.js";

const PAIRS = CONSISTENCY_PAIRS;
const byIdV4 = Object.fromEntries(QUESTIONS_V4.map(q => [q.id, q]));

// NOTE: no `export { ... }` re-export block here. build-single.js flattens
// every module into one script by stripping `^import` and `^export ` at
// column 0; a bare re-export block would survive as a stray statement in the
// bundle. Anything that needs these imports them from their own module.

/** Gap on an axis (0..200) at or above which the two are called far apart. */
export const AXIS_GAP_WIDE = 70;
/** Gap below which the two are called close. */
export const AXIS_GAP_CLOSE = 30;

// Reverse-scored normalisation, identical to scoring.js's internal norm().
// Duplicated rather than exported from there so scoring.js stays untouched.
function normV4(q, v) {
  if (v == null || typeof v !== "number") return null;
  return q.rv ? 8 - v : v;
}

/**
 * Gender a profile was taken under. Anything unrecognised means neutral.
 *
 * It is stored twice on purpose. `p.g` is the convenient field on the local
 * profile object; `answers.__g` is the copy that actually travels, because
 * share codes, the Supabase row and the .json backup all carry the answers
 * map and nothing else. Reading it out of the answers map means a partner
 * who imports by code still sees the profile scored the way it was taken,
 * with no database schema change and no migration. `__g` is not a question
 * id, so every loop in every scoring file ignores it.
 */
export const GENDER_KEY = "__g";
export function genderOf(p) {
  const g = (p && p.g) || (p && p.answers && p.answers[GENDER_KEY]);
  return (g === "m" || g === "f") ? g : null;
}

/**
 * Relationship stage, stored and read the same way as gender.
 *
 * Returning null for an unrecorded stage is deliberate: every profile made
 * before this shipped saw the present-tense wording, and null resolves to
 * exactly that. Nothing is re-worded retroactively, and nothing is scored
 * differently — stage changes presentation only, so a "pre" profile and a
 * "mar" profile compare item for item with no adjustment and no penalty.
 */
export const STAGE_KEY = "__s";
export function stageOf(p) {
  const st = (p && p.s) || (p && p.answers && p.answers[STAGE_KEY]);
  return STAGES.includes(st) ? st : null;
}

/** True when this person answered about a marriage they are not yet in. */
export function answeredProspectively(p) {
  const st = stageOf(p);
  return st === "pre" || st === "was";
}

/** The item list this profile was actually shown, in order. */
export function bankFor(p) {
  return buildBankV4({
    gender: genderOf(p),
    stage: stageOf(p),
    intimacy: profileHasIntimacy(p.answers || {}),
  });
}

// The pool used as the skip-penalty denominator: content items only, and
// only the ones this person could actually have been asked. Same principle
// v3 established — nobody is penalised for questions that did not exist for
// them or that they opted out of.
function itemPoolV4(p) {
  return bankFor(p).filter(q => q.cat !== "quality" && q.mt !== "info" && q.w);
}

// ── Worldview axes ─────────────────────────────────────────────────────────
// Each answered option may carry loads like { role:+2, econ:-1 }. An axis
// score is the mean load across the loaded items this person answered,
// scaled to -100..+100 (a load of ±2 is the maximum any single option
// carries, so ±2 maps to ±100).
//
// Reported only at AXIS_MIN_ITEMS or more. Below that the honest output is
// "not enough data", never a number — the same rule v3 applies to Big Five
// domains and attachment subscales.
const AXIS_MAX_LOAD = 2;

export function worldviewAxes(p) {
  const bank = bankFor(p);
  const acc = Object.fromEntries(AXES.map(a => [a, { sum: 0, n: 0 }]));

  for (const q of bank) {
    const raw = p.answers?.[q.id];
    if (raw == null || !q.opts) continue;
    const opt = q.opts.find(o => ("v" in o ? o.v : o.k) === raw);
    if (!opt || !opt.ax) continue;
    for (const [axis, load] of Object.entries(opt.ax)) {
      if (!acc[axis]) continue;
      acc[axis].sum += load;
      acc[axis].n += 1;
    }
  }

  const out = {};
  for (const a of AXES) {
    const { sum, n } = acc[a];
    // Denominator is the number of LOADED items answered on this axis. An
    // unloaded option on a loaded item counts as a genuine zero, so it is
    // counted below via loadedAnswered.
    const loadedAnswered = bank.filter(q => {
      const raw = p.answers?.[q.id];
      if (raw == null || !q.opts) return false;
      return q.opts.some(o => o.ax && a in o.ax);
    }).length;
    out[a] = loadedAnswered >= AXIS_MIN_ITEMS
      ? { value: Math.round(sum / (loadedAnswered * AXIS_MAX_LOAD) * 100), n: loadedAnswered, sufficient: true }
      : { value: null, n: loadedAnswered, sufficient: false };
  }
  return out;
}

/**
 * Couple-level read on each axis.
 * `critical:true` marks the axes where the KSA divorce literature says a gap
 * actually causes trouble — role expectations and who holds decision
 * authority. Those get raised as discussion topics. The other two are
 * reported as difference, not as a problem.
 */
export function compareAxes(axA, axB) {
  const out = {};
  for (const a of AXES) {
    const A = axA[a], B = axB[a];
    if (!A.sufficient || !B.sufficient) { out[a] = { sufficient: false }; continue; }
    const gap = Math.abs(A.value - B.value);
    out[a] = {
      sufficient: true,
      a: A.value, b: B.value, gap,
      critical: AXES_CRITICAL.includes(a),
      band: gap >= AXIS_GAP_WIDE ? "wide" : gap <= AXIS_GAP_CLOSE ? "close" : "some",
      // Only critical axes with a wide gap are flagged for discussion.
      flagged: AXES_CRITICAL.includes(a) && gap >= AXIS_GAP_WIDE,
    };
  }
  return out;
}

/**
 * Where one person leans in each category, 0-100, on their own answers only.
 *
 * This is NOT the couple's agreement score. catScores in compareV4() says how
 * closely the two match in a category; this says where each of them actually
 * sits. The dual radar needs the second thing — a single polygon of agreement
 * cannot show which of the two is pulling it down.
 */
export function categoryLean(p) {
  const cats = {};
  for (const q of bankFor(p)) {
    if (q.mt === "info" || !q.w) continue;
    const v = normV4(q, p.answers[q.id]);
    if (v == null) continue;
    (cats[q.cat] ||= { sum: 0, w: 0 });
    cats[q.cat].sum += ((v - 1) / 6) * q.w;
    cats[q.cat].w += q.w;
  }
  const out = {};
  for (const c in cats) out[c] = Math.round(cats[c].sum / cats[c].w * 100);
  return out;
}

// ── Solo summary ───────────────────────────────────────────────────────────
export function soloSummaryV4(p) {
  const bank = bankFor(p);
  const cats = {};
  const answers = [];

  for (const q of bank) {
    const raw = p.answers[q.id];
    let chosen = null;
    if (raw != null) {
      if (q.type === "likert") chosen = { likert: raw };
      else {
        const o = q.opts.find(o => ("v" in o ? o.v : o.k) === raw);
        // `ax` is stripped here so the worldview loads never reach the DOM.
        // Anyone reading the rendered answer list must not be able to work
        // out which option carried which signal.
        if (o) { const { ax, ...clean } = o; chosen = { opt: clean }; }
      }
    }
    answers.push({ q: stripSignals(q), chosen });

    if (q.mt === "info" || !q.w) continue;
    const v = normV4(q, raw);
    if (v == null) continue;
    (cats[q.cat] ||= { sum: 0, w: 0 });
    cats[q.cat].sum += ((v - 1) / 6) * q.w;
    cats[q.cat].w += q.w;
  }

  const catLean = {};
  for (const c in cats) catLean[c] = Math.round(cats[c].sum / cats[c].w * 100);

  const flags = [];
  for (const [id, targetId] of PAIRS) {
    const q = byIdV4[id], twin = byIdV4[targetId];
    if (!q || !twin) continue;
    const a = normV4(q, p.answers[q.id]), b = normV4(twin, p.answers[twin.id]);
    if (a != null && b != null && Math.abs(a - b) >= 3) flags.push([stripSignals(q), stripSignals(twin)]);
  }

  const confidence = profileConfidenceV3(p.answers, { itemPool: itemPoolV4(p) });

  return {
    catLean, answers, flags,
    bigFive: bigFiveV3(p.answers),
    attachment: attachmentV3(p.answers),
    love: loveLanguage(p.answers),
    worldview: worldviewAxes(p),
    stage: stageOf(p),
    confidence: confidence.value,
    confidenceDetail: confidence,
    quality: {
      im: impressionManagement(p.answers),
      attention: attentionCheck(p.answers),
    },
    answered: confidence.answered,
    total: confidence.total,
  };
}

// ── Compare ────────────────────────────────────────────────────────────────
// Mirrors compareV3() over the v4 bank. Each side is scored against its own
// gender-resolved item, which is safe because variants share option values.
export function compareV4(pa, pb, opts = {}) {
  const bankA = bankFor(pa), bankB = bankFor(pb);
  const byB = Object.fromEntries(bankB.map(q => [q.id, q]));
  const crossVersion = opts.crossVersion ?? (isV4Answers(pa.answers) !== isV4Answers(pb.answers));

  const cats = {};
  const perQ = [];
  const alerts = [];

  for (const qa of bankA) {
    const qb = byB[qa.id];
    if (!qb) continue;
    const s = questionScore(qa, pa.answers[qa.id], pb.answers[qa.id]);
    if (s == null) continue;
    (cats[qa.cat] ||= { sum: 0, w: 0 });
    cats[qa.cat].sum += s * qa.w;
    cats[qa.cat].w += qa.w;
    perQ.push({ q: stripSignals(qa), s });
    if (qa.db) {
      const d = Math.abs(normV4(qa, pa.answers[qa.id]) - normV4(qb, pb.answers[qa.id]));
      if (d >= 3) alerts.push(stripSignals(qa));
    }
  }

  const catScores = {};
  let total = 0, totalW = 0;
  for (const c in cats) {
    catScores[c] = Math.round(cats[c].sum / cats[c].w * 100);
    total += cats[c].sum; totalW += cats[c].w;
  }
  let index = totalW ? Math.round(total / totalW * 100) : 0;
  // Deal-breakers cap the index. Worldview gaps deliberately do not.
  if (alerts.length) index = Math.min(index, 65 - (alerts.length - 1) * 10);

  const confA = profileConfidenceV3(pa.answers, { crossVersion, itemPool: itemPoolV4(pa) });
  const confB = profileConfidenceV3(pb.answers, { crossVersion, itemPool: itemPoolV4(pb) });

  const axA = worldviewAxes(pa), axB = worldviewAxes(pb);
  const axes = compareAxes(axA, axB);

  const topics = perQ
    .filter(r => r.s < 0.55 && r.q.w >= 2)
    .sort((x, y) => x.s - y.s)
    .slice(0, 6)
    .map(r => r.q);

  // Same six topics, with the per-item agreement score kept alongside so the
  // report can show HOW far apart each one is. `topics` above keeps its
  // original shape — renderReportV3 still reads it and must not break.
  const topicsDetail = perQ
    .filter(r => r.s < 0.55 && r.q.w >= 2)
    .sort((x, y) => x.s - y.s)
    .slice(0, 6);

  const sorted = Object.entries(catScores).sort((a, b) => b[1] - a[1]);
  return {
    index,
    confidence: Math.min(confA.value, confB.value),
    catScores, alerts, topics, topicsDetail,
    catLean: { a: categoryLean(pa), b: categoryLean(pb) },
    strengths: sorted.filter(([, v]) => v >= 75).slice(0, 4).map(([c]) => c),
    challenges: sorted.filter(([, v]) => v < 60).map(([c]) => c),
    bigFive: { a: bigFiveV3(pa.answers), b: bigFiveV3(pb.answers) },
    attachment: { a: attachmentV3(pa.answers), b: attachmentV3(pb.answers) },
    love: { a: loveLanguage(pa.answers), b: loveLanguage(pb.answers) },
    worldview: { a: axA, b: axB, axes },
    // Reported as context only. No confidence deduction: the premarital
    // evidence (PREPARE, 80-85% prediction over three years) does not support
    // treating an expectation-based answer as worth less than a lived one.
    stage: { a: stageOf(pa), b: stageOf(pb) },
    quality: {
      a: { im: impressionManagement(pa.answers), attention: attentionCheck(pa.answers) },
      b: { im: impressionManagement(pb.answers), attention: attentionCheck(pb.answers) },
    },
    crossVersion,
  };
}

// Remove everything the user must not be able to see: the worldview loads,
// the alternate gender wordings, and the internal notes. Whatever the report
// renders comes through here first.
function stripSignals(q) {
  const { gv, was, ...rest } = q;
  if (rest.opts) rest.opts = rest.opts.map(o => { const { ax, ...clean } = o; return clean; });
  return rest;
}
