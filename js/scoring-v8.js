// MatchWise v8 — confidence adjustment.
// -----------------------------------------------------------------------------
// Wraps compareV4() (scoring-v4.js) — READ-ONLY. Nothing in this file ever
// writes to a profile, a catScore, the Alignment Index, or the base
// confidence value compareV4() returns. It computes one new, separate,
// capped number — displayConfidence — for report-v8.js (Phase 5) to show
// alongside (not instead of) the real index. See "MatchWise Vault/
// v8 - AI Assessor Spec.md" §5 and the credibility guardrail in §2.
//
// Two independent jobs live here, matching Build Plan Phase 4:
//   1. Numerically verify a claimed consistency-pair "resolution" (js/
//      ai-session-v8.js already checked this structurally — was the pair
//      really unresolved, was the resolver really injected — but could not
//      check whether the probe's own answer actually means anything,
//      because that needs the SAME normalization scoring-v3.js's own
//      profileConfidenceV3() uses, applied to a real answer that only
//      exists once the quiz is finished).
//   2. Verify an open-text "signal" quote is a literal substring of what
//      the person actually wrote — the real backstop against fabricated
//      evidence, enforced in code rather than by asking the model nicely.
// -----------------------------------------------------------------------------

import { bankFor } from "./scoring-v4.js";
import { AI_ITEMS_BY_ID } from "./questions-v8.js";
import { normLikert } from "./ai-session-v8.js";
import { isValidOpenTextSignal } from "./ai-schema-v8.js";

const RESOLUTION_BONUS_PER_PAIR = 5;
const RESOLUTION_BONUS_CAP = 10;      // couple-level cap, combined across both partners — see computeDisplayConfidence()
const DISPLAY_CONFIDENCE_CEILING = 95; // never claim certainty, matching CONFIDENCE_FLOOR's spirit in scoring-v3.js
// How close the probe's own normalized answer must land to one of the two
// original (contradicting) normalized answers to count as "siding with"
// it — on the same 1..7 normalized scale profileConfidenceV3() itself uses
// a gap of >=3 to flag as a contradiction in the first place. A tolerance
// of 1 is deliberately strict: an ambiguous probe answer sitting between
// the two originals proves nothing and must not earn anything back.
const NARROW_TOLERANCE = 1;

// ------------------------------------------------------- pair resolutions --

/**
 * Reads the reserved __ai8 key app.js's finishQuiz() seeds into a finished
 * profile's answers (see that function's comment for why it lives there).
 * Tolerant of anything malformed, missing, or from a pre-v8 profile —
 * always returns an array, never throws.
 */
export function parseResolutionLog(profile) {
  try {
    const raw = profile && profile.answers && profile.answers.__ai8;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * The numeric check ai-session-v8.js's applyDirective() explicitly deferred
 * (see its own comment). `candidate` is one {aId, bId, resolvedBy} entry
 * that already passed the structural checks (pair really unresolved,
 * resolver really injected) at checkpoint time. This asks: once actually
 * answered, does the probe's own value genuinely side with one of the two
 * original answers, rather than sitting ambiguously between them?
 *
 * `bank` must be this same person's own resolved bank (js/scoring-v4.js's
 * bankFor(profile)) — gender/stage resolution can change item text, so
 * looking ids up in the wrong person's bank would be wrong, even though in
 * practice rv/pair metadata has not been observed to vary by resolution.
 */
export function validateNumericResolution(candidate, bank, answers) {
  const probe = AI_ITEMS_BY_ID[candidate.resolvedBy];
  if (!probe) return false; // shouldn't happen — ai-session-v8.js already checked this id was injected

  const probeVal = answers[candidate.resolvedBy];
  if (probeVal == null || typeof probeVal !== "number") return false; // skipped, or not actually answered

  const byId = Object.fromEntries(bank.map(q => [q.id, q]));
  const qa = byId[candidate.aId], qb = byId[candidate.bId];
  if (!qa || !qb) return false;

  const na = normLikert(qa, answers[candidate.aId]);
  const nb = normLikert(qb, answers[candidate.bId]);
  if (na == null || nb == null) return false;

  // Normalize the probe's own answer with the same helper — respects a
  // probe's own `rv` flag if it has one (none of the current 40 do; see
  // questions-v8.js's header comment on `sameDirectionAs`), so this stays
  // correct if a future reverse-worded probe is ever added.
  const np = normLikert(probe, probeVal);
  if (np == null) return false;

  const dA = Math.abs(np - na), dB = Math.abs(np - nb);
  return Math.min(dA, dB) <= NARROW_TOLERANCE;
}

/**
 * One person's own raw, UNCAPPED resolution points (count of distinct
 * validated pairs × 5). Deliberately uncapped here — the couple-level cap
 * is applied once, after combining both partners, in
 * computeDisplayConfidence(). A pair is only ever counted once per person
 * even if somehow claimed twice.
 */
export function computeResolutionBonus(resolutionLog, bank, answers) {
  const seenPairs = new Set();
  let count = 0;
  for (const candidate of resolutionLog) {
    if (!candidate || typeof candidate.aId !== "string" || typeof candidate.bId !== "string") continue;
    const key = [candidate.aId, candidate.bId].sort().join("|");
    if (seenPairs.has(key)) continue;
    if (!validateNumericResolution(candidate, bank, answers)) continue;
    seenPairs.add(key);
    count += 1;
  }
  return count * RESOLUTION_BONUS_PER_PAIR;
}

/**
 * The one function report-v8.js (Phase 5) actually calls. `compareResult`
 * is compareV4(pa, pb)'s own return value — passed in rather than
 * recomputed, since compareV4() only exposes a single couple-level
 * confidence (Math.min of both partners), not each partner's individually,
 * and itemPoolV4() (needed to recompute either separately) is a private
 * helper in scoring-v4.js this file deliberately does not reach into.
 *
 * Both partners' validated resolutions are summed BEFORE the couple-level
 * cap is applied (rather than capping each at +10 separately, which could
 * imply up to +20 combined) — a couple's displayed confidence rises by at
 * most 10 points total, however that credit was earned between the two of
 * them. This is an editorial choice, same as every other weight in this
 * app — see README / Known Limitations — not something derived from data.
 */
export function computeDisplayConfidence(pa, pb, compareResult) {
  const bankA = bankFor(pa), bankB = bankFor(pb);
  const bonusA = computeResolutionBonus(parseResolutionLog(pa), bankA, pa.answers || {});
  const bonusB = computeResolutionBonus(parseResolutionLog(pb), bankB, pb.answers || {});
  const resolutionBonus = Math.min(bonusA + bonusB, RESOLUTION_BONUS_CAP);
  const baseConfidence = compareResult.confidence;
  const displayConfidence = Math.min(baseConfidence + resolutionBonus, DISPLAY_CONFIDENCE_CEILING);
  return { displayConfidence, baseConfidence, resolutionBonus, bonusA, bonusB };
}

// -------------------------------------------------------- open-text quotes --

/**
 * `extraction` is one { itemId, signals: [...] } response for one open-text
 * answer (spec §5). `openTextAnswers` is a plain { itemId: rawText } map —
 * report-v8.js builds this from pa.answers / pb.answers filtered to the
 * ot_* ids, per person, and calls this once per person's extraction.
 *
 * Returns only the signals that (a) match the shape schema
 * (isValidOpenTextSignal, ai-schema-v8.js) AND (b) quote a literal
 * substring of what this person actually wrote. Anything failing either
 * check is dropped silently — never partially trusted, never "cleaned up"
 * to make it fit. This is the real backstop against a fabricated quote,
 * enforced in code, not a prompt instruction asking the model to behave.
 */
export function filterValidOpenTextSignals(extraction, openTextAnswers) {
  if (!extraction || typeof extraction.itemId !== "string" || !Array.isArray(extraction.signals)) return [];
  const original = openTextAnswers[extraction.itemId];
  if (typeof original !== "string" || original.length === 0) return [];
  return extraction.signals.filter(s => isValidOpenTextSignal(s) && original.includes(s.quote));
}
