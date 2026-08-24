// MatchWise v8 — Insight Engine probe bank + open-text items.
// -----------------------------------------------------------------------------
// PHASE-2-STUB. Empty on purpose. Phase 3 fills this in with ~40 probe items
// (tagged by cat + trigger kind, ids like "p_conf_01") and 4 open-text items
// (ids like "ot_conflict_1", type: "text"). See "MatchWise Vault/v8 - Build
// Plan.md" Phase 3.
//
// This file exists now — rather than being deferred entirely to Phase 3 —
// so js/ai-session-v8.js has something real to import and the injection
// mechanism (splice into quiz.bank after quiz.i, respect the 8-item silence
// budget) can be built and tested end-to-end before any probe content
// exists. With both arrays empty, the AI can never actually inject anything
// yet: injectItems ids simply won't resolve in AI_ITEMS_BY_ID and are
// dropped, same as any other unknown id (see ai-session-v8.js's
// applyDirective()). That is the correct, safe state for Phase 2.
//
// Shape each item must have once Phase 3 adds them (mirrors questions-v3.js
// / questions-v4.js so renderQuestion() in app.js needs no special case):
//   { id, cat, type: "likert" | "mcq" | "text",
//     en, ar,                          // likert/mcq
//     opts: [{v, en, ar}, ...],        // mcq only
//     maxLen,                          // text only, spec caps at 500
//   }
// -----------------------------------------------------------------------------

export const PROBE_ITEMS = [];

export const OPEN_TEXT_ITEMS = [];

export const AI_ITEMS_BY_ID = Object.fromEntries(
  [...PROBE_ITEMS, ...OPEN_TEXT_ITEMS].map(q => [q.id, q])
);
