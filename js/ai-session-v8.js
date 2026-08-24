// MatchWise v8 — the silent loop.
// -----------------------------------------------------------------------------
// Owns everything about "when do we ask the Insight Engine something, and
// what do we do with the answer" during the quiz. Nothing in here ever
// writes to quiz.answers, catScores, or the Alignment Index — it only ever
// reorders/injects unanswered questions in quiz.bank, strictly after the
// question currently on screen. See "MatchWise Vault/v8 - AI Assessor
// Spec.md" §4 and §0.1 point 5 for why that boundary is non-negotiable.
//
// Two entry points js/app.js calls, per spec §9:
//   session.onAnswer(q, v, bank, i, answers)   — call right after recording
//                                                 an answer, before advancing
//   session.drainPending(bank, i)              — call at the top of
//                                                 renderQuestion(), before
//                                                 reading bank[i]
// Everything else here is either a pure helper (exported individually for
// unit testing) or private state inside createAiSession().
// -----------------------------------------------------------------------------

import { CONSISTENCY_PAIRS } from "./questions-v3.js";
import { AI_ITEMS_BY_ID } from "./questions-v8.js";
import { postPacket } from "./ai-client-v8.js";
import { isValidRoutingDirective } from "./ai-schema-v8.js";

const CHECKPOINT_EVERY_N_ANSWERS = 6;
const MAX_CHECKPOINTS = 8;
const MAX_INJECTED_TOTAL = 8;
const MAX_ABANDONS = 2;
const TIMEOUT_MS = 4000; // must match supabase/functions/assess/index.ts TIMEOUT_BUDGET_MS and js/ai-client-v8.js DEFAULT_TIMEOUT_MS

// ------------------------------------------------------------- pure logic --
// Exported individually so tests can exercise them without a full session
// object or a real fetch.

/**
 * scoring-v3.js's normV3() reverses reverse-scored items but isn't exported
 * (it's a module-private helper there). This is a deliberate, exact copy —
 * three lines, unlikely to drift — kept here rather than exporting the
 * original, so this file never has to reach into scoring-v3.js's internals.
 * If scoring-v3.js's normV3() ever changes, this must change with it.
 * Exported because js/scoring-v8.js (Phase 4) needs the identical
 * normalization to numerically verify a claimed pair resolution — one
 * source of truth for "what does this raw answer actually mean" across the
 * whole v8 layer, rather than a third copy.
 */
export function normLikert(q, v) {
  if (v == null || typeof v !== "number") return null;
  return q.rv ? 8 - v : v;
}

/**
 * Which of the app's real consistency pairs are CURRENTLY contradicted —
 * both sides answered, normalized gap >= 3 — exactly the condition
 * profileConfidenceV3() in scoring-v3.js docks 10 confidence points for.
 * This is the real, existing signal v8 routes probes toward (spec §0.1
 * point 2), not an invented per-trait confidence value.
 */
export function computeUnresolvedPairs(bank, answers) {
  const byId = Object.fromEntries(bank.map(q => [q.id, q]));
  const out = [];
  for (const [aId, bId] of CONSISTENCY_PAIRS) {
    const qa = byId[aId], qb = byId[bId];
    if (!qa || !qb) continue; // pair not present in this person's resolved bank
    const va = answers[aId], vb = answers[bId];
    if (va == null || vb == null) continue; // both sides must be answered to judge
    const na = normLikert(qa, va), nb = normLikert(qb, vb);
    if (na == null || nb == null) continue;
    const gap = Math.abs(na - nb);
    if (gap >= 3) out.push({ aId, bId, gap });
  }
  return out;
}

/** How many of each category's items are answered so far vs. how many exist in this person's resolved bank. */
export function computeCategoryCoverage(bank, answers) {
  const totals = new Map();
  for (const q of bank) {
    const e = totals.get(q.cat) || { total: 0, answered: 0 };
    e.total += 1;
    if (answers[q.id] != null) e.answered += 1;
    totals.set(q.cat, e);
  }
  return [...totals.entries()].map(([cat, e]) => ({ cat, answered: e.answered, total: e.total }));
}

/**
 * The state packet, built field by field from an explicit allow-list —
 * never by spreading `quiz` or a profile object. This is what guarantees
 * name/code/id/date can never reach the network, no matter what fields
 * app.js's quiz/profile objects carry now or later. See spec §4.3 and §8.
 */
export function buildRoutingPacket({ sessionId, lang, bank, i, answers, probeBudgetLeft, checkpointIndex }) {
  const answered = [];
  const openText = [];
  for (const q of bank.slice(0, i + 1)) {
    const v = answers[q.id];
    if (v == null) continue;
    if (q.type === "text") openText.push({ id: q.id, text: String(v).slice(0, 500) });
    else answered.push({ id: q.id, cat: q.cat, type: q.type, value: v });
  }

  return {
    sessionId,
    lang: lang === "ar" ? "ar" : "en",
    phase: "routing",
    answered,
    openText,
    unresolvedPairs: computeUnresolvedPairs(bank, answers),
    categoryCoverage: computeCategoryCoverage(bank, answers),
    remainingItemIds: bank.slice(i + 1).map(q => q.id),
    probeBudgetLeft,
    checkpointIndex,
  };
}

/**
 * Applies a validated directive to `bank` IN PLACE. Every mutation targets
 * index >= i + 1 only — the answered-or-onscreen prefix (indices 0..i) is
 * never touched. Returns how many new items were actually injected (for the
 * caller's silence-budget bookkeeping) and which pair-resolution claims
 * passed the checks that are possible to make right now.
 *
 * What "possible right now" means: we can confirm a claimed resolution
 * references a pair that really was unresolved when this checkpoint's
 * packet was sent, and that the item claimed to resolve it was really
 * injected this same checkpoint. We CANNOT yet confirm the resolution
 * actually narrows anything — that needs the probe's own answer plus the
 * probe item's clarifying-target metadata, neither of which exists until
 * Phase 3 writes real probe items and Phase 4 wires scoring-v8.js. Numeric
 * confirmation is Phase 4's job; this only forwards structurally-sound
 * claims for Phase 4 to finish checking. See spec §5.
 */
export function applyDirective(directive, { bank, i, sentUnresolvedPairs, injectedSoFar, itemsById = AI_ITEMS_BY_ID }) {
  const remainingIds = new Set(bank.slice(i + 1).map(q => q.id));
  const injectedThisRound = [];
  const confirmedResolutionCandidates = [];

  // --- reorder: move a named FEW items to the front of the queue ----------
  // `reorder` is read as "show these next, in this order" — not a full
  // permutation of the entire unanswered tail (asking the model to
  // enumerate every remaining id just to prioritize two of them would be
  // both wasteful and unrealistic to get right). Every id must be a real,
  // currently-unanswered id with no duplicates; anything else and the whole
  // reorder is rejected rather than partially applied. Ids not named in
  // `reorder` keep their existing relative order, appended after the named
  // ones — nothing is ever dropped or silently reshuffled beyond what was
  // asked for.
  const reorderIds = directive.reorder || [];
  const isValidReorder =
    reorderIds.length > 0 &&
    reorderIds.length <= remainingIds.size &&
    reorderIds.every(id => remainingIds.has(id)) &&
    new Set(reorderIds).size === reorderIds.length;

  if (isValidReorder) {
    const tail = bank.slice(i + 1);
    const byId = Object.fromEntries(tail.map(q => [q.id, q]));
    const named = new Set(reorderIds);
    const rest = tail.filter(q => !named.has(q.id));
    const newTail = [...reorderIds.map(id => byId[id]), ...rest];
    bank.splice(i + 1, tail.length, ...newTail);
  }
  // An invalid reorder is silently ignored — the tail keeps its existing
  // order. This is not an error; a failed check just means the directive
  // didn't earn the trust to reorder anything this time.

  // --- inject: unknown ids dropped, budget enforced ------------------------
  const budgetLeft = Math.max(0, MAX_INJECTED_TOTAL - injectedSoFar);
  const toInject = (directive.injectItems || [])
    .filter(id => itemsById[id])                       // must exist in the probe bank
    .filter(id => !remainingIds.has(id))               // not already in the unanswered tail
    .filter((id, idx, arr) => arr.indexOf(id) === idx) // de-dupe
    .slice(0, budgetLeft);

  if (toInject.length > 0) {
    const items = toInject.map(id => itemsById[id]);
    bank.splice(i + 1, 0, ...items);
    injectedThisRound.push(...toInject);
  }

  // --- pair resolutions: forward only the structurally-sound claims -------
  const sentPairKeys = new Set((sentUnresolvedPairs || []).map(p => `${p.aId}|${p.bId}`));
  for (const r of directive.pairResolutions || []) {
    if (!sentPairKeys.has(`${r.aId}|${r.bId}`)) continue;      // wasn't actually unresolved when asked
    if (!injectedThisRound.includes(r.resolvedBy)) continue;    // wasn't actually injected this checkpoint
    confirmedResolutionCandidates.push(r);
  }

  return { injectedCount: injectedThisRound.length, confirmedResolutionCandidates };
}

// ------------------------------------------------------------ the session --

/**
 * @param {{ lang: string, sessionId: string, enabled: boolean }} opts
 *   `enabled` should reflect the "Enhanced online analysis" setting (added
 *   in Phase 6) — when false, this session never calls the network and
 *   every method below is a harmless no-op. Callers in app.js should also
 *   just skip creating a session at all when disabled (`aiSession = null`
 *   and every call site uses `aiSession?.method(...)`), but the internal
 *   guard exists too so a stale session can't outlive a mid-quiz toggle.
 */
export function createAiSession({ lang, sessionId, enabled = true }) {
  let answeredSinceCheckpoint = 0;
  let checkpointsUsed = 0;
  let injectedSoFar = 0;
  let abandons = 0;
  let disabled = !enabled;

  // The most recent checkpoint's in-flight call and the unresolvedPairs it
  // was sent with (needed later by applyDirective to validate resolution
  // claims). Only one checkpoint is ever in flight at a time — a new one
  // isn't fired while a previous one hasn't resolved, so there's nothing to
  // race here.
  let inFlight = null;
  let inFlightUnresolvedPairs = [];
  let pendingDirective = null;

  // Everything Phase 4/5 will want once the quiz is done: which pairs were
  // ever flagged, and which resolution claims survived the structural check
  // above. Exposed via getSessionSummary(); not consumed by anything yet.
  const resolutionLog = [];

  async function fireCheckpoint(bank, i, answers) {
    const packet = buildRoutingPacket({
      sessionId, lang, bank, i, answers,
      probeBudgetLeft: Math.max(0, MAX_INJECTED_TOTAL - injectedSoFar),
      checkpointIndex: checkpointsUsed,
    });
    inFlightUnresolvedPairs = packet.unresolvedPairs;

    const result = await postPacket(packet, { timeoutMs: TIMEOUT_MS });
    inFlight = null;

    if (result == null) {
      abandons += 1;
      if (abandons >= MAX_ABANDONS) disabled = true;
      return;
    }
    if (!isValidRoutingDirective(result)) return; // discarded whole, spec §4.4
    pendingDirective = result;
  }

  return {
    /** Call right after recording an answer (quiz.answers[q.id] = v), before advancing. Never awaited by the caller — fires and returns immediately. */
    onAnswer(q, v, bank, i, answers) {
      if (disabled) return;
      answeredSinceCheckpoint += 1;

      const next = bank[i + 1];
      const boundaryCrossed = !!(next && next.cat !== q.cat);
      const due = answeredSinceCheckpoint >= CHECKPOINT_EVERY_N_ANSWERS || boundaryCrossed;

      if (due && checkpointsUsed < MAX_CHECKPOINTS && !inFlight) {
        answeredSinceCheckpoint = 0;
        checkpointsUsed += 1;
        inFlight = fireCheckpoint(bank, i, answers);
      }
    },

    /**
     * Call at the very top of renderQuestion(), before reading bank[i].
     * Synchronous, idempotent — if nothing has resolved since the last
     * call, this does nothing. Mutates `bank` in place via applyDirective().
     */
    drainPending(bank, i) {
      if (disabled || !pendingDirective) return;
      const directive = pendingDirective;
      pendingDirective = null;

      const { injectedCount, confirmedResolutionCandidates } = applyDirective(directive, {
        bank, i,
        sentUnresolvedPairs: inFlightUnresolvedPairs,
        injectedSoFar,
      });
      injectedSoFar += injectedCount;
      resolutionLog.push(...confirmedResolutionCandidates);
    },

    getSessionSummary() {
      return {
        checkpointsUsed, injectedSoFar, abandons, disabled,
        resolutionLog: resolutionLog.slice(),
      };
    },
  };
}
