// MatchWise v3 scoring engine — additive layer over v2.
// -----------------------------------------------------------------------------
// Does NOT modify js/scoring.js. Reuses its generic, bank-agnostic exports
// (questionScore, loveLanguage) and reimplements the bank-bound ones
// (bigFive, profileConfidence, soloSummary, compare) against the v3 bank,
// because those v2 functions close over the v2 QUESTIONS array internally
// and cannot be pointed at a different bank without editing scoring.js.
//
// Per the build plan (Part 2.5), a v2-only profile compared against another
// v2-only profile is never routed through this file — app.js sends that pair
// to scoring.js and the v2 report, unchanged. This file is reached for (a)
// any profile containing a genuine v3 answer, solo or compared, and (b) a
// v2 profile being COMPARED against a v3 partner, where scoring.js's
// compare() cannot be used because it can't see the v3-only items.
//
// Version and intimacy-module participation are both auto-detected from the
// answers themselves (isV3Answers / profileHasIntimacy below) — nothing is
// stamped onto the profile object and nothing needs to be threaded through
// from app.js. A v2-origin profile's skip-penalty denominator is likewise
// auto-derived as the 47 items it actually had, never the full v3 bank —
// otherwise it would be unfairly penalized for "skipping" 28 questions that
// did not exist when it was taken. Verified by regression test:
// index/catScores/alerts/topics/strengths/challenges match scoring.js's
// compare() exactly when both profiles only answer v2 items.
//
// ── Correction to the original build plan (Build-MatchWise-v3.md, §2.3.1) ──
// The plan called for computing "McDonald's ω per multi-item subscale from
// the user's own responses". That is not statistically meaningful: ω and α
// are sample-level reliability coefficients computed from the covariance of
// item scores ACROSS MANY RESPONDENTS. A single person answering each item
// once produces no covariance to estimate — there is nothing to compute.
// This file does NOT compute a live reliability figure per profile.
// Instead it ships REFERENCE_RELIABILITY: the published reliability of the
// validated instrument each subscale is *modeled after* (ECR-S, BFI-2-XS),
// clearly labeled `measured:false` because MatchWise's own item wording is
// adapted, not identical, and has not been separately validated. Real
// per-item reliability requires the calibration phase in the plan's Part 3
// (n≈300 profiles) — until that lands, this is the honest thing to show.
// -----------------------------------------------------------------------------

import { questionScore, loveLanguage } from "./scoring.js";
import { QUESTIONS_V3, CONSISTENCY_PAIRS, QUALITY_ITEMS } from "./questions-v3.js";

const byIdV3 = Object.fromEntries(QUESTIONS_V3.map(q => [q.id, q]));

// Minimum answered items before a Big Five domain or attachment subscale is
// reported as a number. Below this, the UI must show "not enough data".
export const SUBSCALE_MIN = 3;

// Impression-management (BIDR-style) scoring.
export const IM_AGREE_THRESHOLD = 6;  // a 6 or 7 on an "I have never..." item counts as extreme
export const IM_DEDUCTION_PER_ITEM = 5;
export const IM_DEDUCTION_CAP = 15;   // total confidence points an IM pattern can cost

export const CONFIDENCE_FLOOR = 35;   // matches scoring.js

// Published reliability of the instruments MatchWise's items are modeled
// after. NOT measured on MatchWise's own items. Show alongside a visible
// "reference only" label — never presented as this app's own reliability.
export const REFERENCE_RELIABILITY = {
  attachment: {
    anx: { alpha: [0.77, 0.86], retest1mo: 0.80, source: "Wei et al., 2007 (ECR-S)" },
    avo: { alpha: [0.78, 0.88], retest1mo: 0.83, source: "Wei et al., 2007 (ECR-S)" },
    measured: false,
  },
  personality: {
    // BFI-2-XS domain alphas averaged .61–.63 (range .51–.72) across samples.
    O: { alpha: [0.51, 0.72], source: "Soto & John, 2017 (BFI-2-XS)" },
    C: { alpha: [0.51, 0.72], source: "Soto & John, 2017 (BFI-2-XS)" },
    E: { alpha: [0.51, 0.72], source: "Soto & John, 2017 (BFI-2-XS)" },
    A: { alpha: [0.51, 0.72], source: "Soto & John, 2017 (BFI-2-XS)" },
    N: { alpha: [0.51, 0.72], source: "Soto & John, 2017 (BFI-2-XS)" },
    measured: false,
  },
  note: "These figures describe the validated instruments MatchWise's items are modeled after, measured across large published samples. They are not a measurement of MatchWise's own item wording, which has not yet been independently validated.",
};

function normV3(q, v) {
  if (v == null || typeof v !== "number") return null;
  return q.rv ? 8 - v : v;
}

// ── Version / module auto-detection ───────────────────────────────────────
// A profile carries no explicit "I took v3" flag — the app.js quiz writes a
// plain {id: value} answers bag exactly like v2 always has. Version and
// module participation are both inferred from WHICH ids are present, which
// is self-describing and needs zero schema/storage changes anywhere
// (local storage, the downloadable .json, the share code, or Supabase).
export function isV3Answers(answers) {
  return QUESTIONS_V3.some(q => q.v3 && answers[q.id] != null);
}
export function profileHasIntimacy(answers) {
  return QUESTIONS_V3.some(q => q.mod === "intimacy" && answers[q.id] != null);
}
// The items this profile's owner actually had in front of them: the plain
// 47-item v2 bank if no v3-only item was ever answered, otherwise the v3
// content bank (quality items excluded — those are a response-quality
// check, not something the person "skipped"), with the intimacy module
// included only if they engaged with it. Used as the skip-penalty
// denominator so nobody is penalized for "missing" questions that either
// didn't exist yet for them, or that they legitimately opted out of.
function itemPoolFor(answers) {
  if (!isV3Answers(answers)) return QUESTIONS_V3.filter(q => !q.v3);
  const hasIntimacy = profileHasIntimacy(answers);
  return QUESTIONS_V3.filter(q => q.cat !== "quality" && (!q.mod || (q.mod === "intimacy" && hasIntimacy)));
}

// ── Big Five, suppressed below SUBSCALE_MIN ──────────────────────────────
// Mirrors scoring.js bigFive() math exactly (raw value + trait-sign flip,
// NOT the rv-based normV3()) so v2-only answers reproduce v2 numbers, then
// adds the suppression rule for domains with too little data.
export function bigFiveV3(answers) {
  const acc = {}; // domain -> [sum, n]
  for (const q of QUESTIONS_V3) {
    if (!q.trait) continue;
    const v = answers[q.id];
    if (v == null) continue;
    const key = q.trait[0];
    const val = q.trait[1] === "-" ? 8 - v : v;
    (acc[key] ||= [0, 0]); acc[key][0] += val; acc[key][1]++;
  }
  const out = {};
  for (const k of ["O", "C", "E", "A", "N"]) {
    const [sum, n] = acc[k] || [0, 0];
    if (n >= SUBSCALE_MIN) {
      out[k] = { value: Math.round(((sum / n) - 1) / 6 * 100), n, sufficient: true };
    } else {
      out[k] = { value: null, n, sufficient: false, needed: SUBSCALE_MIN - n };
    }
  }
  return out;
}

// ── Attachment (anxiety / avoidance), suppressed below SUBSCALE_MIN ──────
// Uses normV3() (rv-aware) since attachment items carry no trait sign — the
// only reversal signal on these items is rv.
export function attachmentV3(answers) {
  const acc = { anx: [0, 0], avo: [0, 0] };
  for (const q of QUESTIONS_V3) {
    if (!q.sub) continue;
    const v = normV3(q, answers[q.id]);
    if (v == null) continue;
    acc[q.sub][0] += v; acc[q.sub][1]++;
  }
  const out = {};
  for (const k of ["anx", "avo"]) {
    const [sum, n] = acc[k];
    if (n >= SUBSCALE_MIN) {
      out[k] = { value: Math.round(((sum / n) - 1) / 6 * 100), n, sufficient: true };
    } else {
      out[k] = { value: null, n, sufficient: false, needed: SUBSCALE_MIN - n };
    }
  }
  return out;
}

// ── Response-quality checks ───────────────────────────────────────────────
// Impression management: never touches the compatibility score. Confidence
// only, capped so one bad-faith burst can't tank an otherwise honest profile.
export function impressionManagement(answers) {
  const items = QUALITY_ITEMS.filter(q => q.qc === "im");
  const answered = items.filter(q => answers[q.id] != null);
  const extreme = answered.filter(q => answers[q.id] >= IM_AGREE_THRESHOLD);
  const deduction = Math.min(IM_DEDUCTION_CAP, extreme.length * IM_DEDUCTION_PER_ITEM);
  return { answered: answered.length, extreme: extreme.length, deduction, flagged: deduction > 0 };
}

// Attention check: flags the profile for the report banner. Does not affect
// the score or confidence — a single missed check is not proof of bad faith.
export function attentionCheck(answers) {
  const q = QUALITY_ITEMS.find(x => x.qc === "attn");
  const v = answers[q.id];
  if (v == null) return { tested: false, passed: null };
  return { tested: true, passed: v === q.exp };
}

// ── Confidence ─────────────────────────────────────────────────────────────
// Same shape as scoring.js profileConfidence(): base 90, −10 per contradicted
// consistency pair (now 12 pairs, not 4), skip penalty over content items,
// then the IM deduction. crossVersion knocks off an extra 10 and is set by
// the caller when comparing a v2 profile against a v3 profile (app.js, step 3).
// itemPool: override for the skip-penalty denominator. Auto-derived from the
// answers themselves via itemPoolFor() when omitted — see above. Exposed as
// an explicit param only for tests and edge cases; callers should not
// normally need to pass it.
export function profileConfidenceV3(answers, { crossVersion = false, itemPool = null } = {}) {
  let conf = 90;
  const contradictions = [];
  for (const [id, targetId] of CONSISTENCY_PAIRS) {
    const q = byIdV3[id], twin = byIdV3[targetId];
    const v1 = normV3(q, answers[q.id]), v2 = normV3(twin, answers[twin.id]);
    if (v1 != null && v2 != null && Math.abs(v1 - v2) >= 3) { conf -= 10; contradictions.push([id, targetId]); }
  }

  const contentItems = itemPool || itemPoolFor(answers);
  const answered = contentItems.filter(q => answers[q.id] != null).length;
  const skipPenalty = Math.round((1 - answered / contentItems.length) * 30);
  conf -= skipPenalty;

  const im = impressionManagement(answers);
  conf -= im.deduction;

  if (crossVersion) conf -= 10;

  return {
    value: Math.max(CONFIDENCE_FLOOR, conf),
    contradictions,
    skipPenalty,
    imDeduction: im.deduction,
    imFlagged: im.flagged,
    crossVersion,
    answered,
    total: contentItems.length,
  };
}

// ── Solo summary ───────────────────────────────────────────────────────────
// Intimacy inclusion is auto-detected from this profile's own answers — see
// profileHasIntimacy() above. No flag to pass or get out of sync.
export function soloSummaryV3(p) {
  const includeIntimacy = profileHasIntimacy(p.answers);
  const cats = {};
  const answers = [];

  for (const q of QUESTIONS_V3) {
    if (q.mod === "intimacy" && !includeIntimacy) continue;
    const raw = p.answers[q.id];
    let chosen = null;
    if (raw != null) {
      if (q.type === "likert") chosen = { likert: raw };
      else {
        const o = q.opts.find(o => ("v" in o ? o.v : o.k) === raw);
        if (o) chosen = { opt: o };
      }
    }
    answers.push({ q, chosen });

    if (q.mt === "info" || !q.w) continue;
    const v = normV3(q, raw);
    if (v == null) continue;
    (cats[q.cat] ||= { sum: 0, w: 0 });
    cats[q.cat].sum += ((v - 1) / 6) * q.w;
    cats[q.cat].w += q.w;
  }

  const catLean = {};
  for (const c in cats) catLean[c] = Math.round(cats[c].sum / cats[c].w * 100);

  const flags = [];
  for (const [id, targetId] of CONSISTENCY_PAIRS) {
    const q = byIdV3[id], twin = byIdV3[targetId];
    const a = normV3(q, p.answers[q.id]), b = normV3(twin, p.answers[twin.id]);
    if (a != null && b != null && Math.abs(a - b) >= 3) flags.push([q, twin]);
  }

  const confidence = profileConfidenceV3(p.answers);

  return {
    catLean, answers, flags,
    bigFive: bigFiveV3(p.answers),
    attachment: attachmentV3(p.answers),
    love: loveLanguage(p.answers),
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
// Mirrors scoring.js compare() exactly, over the v3 bank. If both profiles
// only have v2 item ids answered, the result is numerically identical to
// scoring.js compare() — new items simply score null and are skipped by
// questionScore(), which already treats missing answers as "not scored".
//
// Both intimacy inclusion and crossVersion are auto-detected from the two
// profiles' own answers — nothing for app.js to compute or pass in. Intimacy
// is scored only if BOTH people answered at least one intimacy item; scoring
// it against a partner who was never asked would compare real data to
// silence, which is not a fair comparison.
export function compareV3(pa, pb, opts = {}) {
  const includeIntimacy = opts.includeIntimacy ?? (profileHasIntimacy(pa.answers) && profileHasIntimacy(pb.answers));
  const crossVersion = opts.crossVersion ?? (isV3Answers(pa.answers) !== isV3Answers(pb.answers));
  const cats = {};
  const perQ = [];
  const alerts = [];

  for (const q of QUESTIONS_V3) {
    if (q.mod === "intimacy" && !includeIntimacy) continue;
    const s = questionScore(q, pa.answers[q.id], pb.answers[q.id]);
    if (s == null) continue;
    (cats[q.cat] ||= { sum: 0, w: 0 });
    cats[q.cat].sum += s * q.w;
    cats[q.cat].w += q.w;
    perQ.push({ q, s });
    if (q.db) {
      const d = Math.abs(normV3(q, pa.answers[q.id]) - normV3(q, pb.answers[q.id]));
      if (d >= 3) alerts.push(q);
    }
  }

  const catScores = {};
  let total = 0, totalW = 0;
  for (const c in cats) {
    catScores[c] = Math.round(cats[c].sum / cats[c].w * 100);
    total += cats[c].sum; totalW += cats[c].w;
  }
  let index = Math.round(total / totalW * 100);
  if (alerts.length) index = Math.min(index, 65 - (alerts.length - 1) * 10);

  const confA = profileConfidenceV3(pa.answers, { crossVersion });
  const confB = profileConfidenceV3(pb.answers, { crossVersion });
  const confidence = Math.min(confA.value, confB.value);

  const topics = perQ
    .filter(r => r.s < 0.55 && r.q.w >= 2)
    .sort((x, y) => x.s - y.s)
    .slice(0, 6)
    .map(r => r.q);

  const sorted = Object.entries(catScores).sort((a, b) => b[1] - a[1]);
  return {
    index, confidence, catScores, alerts, topics,
    strengths: sorted.filter(([, v]) => v >= 75).slice(0, 4).map(([c]) => c),
    challenges: sorted.filter(([, v]) => v < 60).map(([c]) => c),
    bigFive: { a: bigFiveV3(pa.answers), b: bigFiveV3(pb.answers) },
    attachment: { a: attachmentV3(pa.answers), b: attachmentV3(pb.answers) },
    love: { a: loveLanguage(pa.answers), b: loveLanguage(pb.answers) },
    quality: {
      a: { im: impressionManagement(pa.answers), attention: attentionCheck(pa.answers) },
      b: { im: impressionManagement(pb.answers), attention: attentionCheck(pb.answers) },
    },
    crossVersion,
  };
}
