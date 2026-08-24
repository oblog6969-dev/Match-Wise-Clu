// MatchWise v8 — response validators.
// -----------------------------------------------------------------------------
// Belt-and-suspenders: supabase/functions/assess/index.ts already validates
// its own output before sending it, but this file re-checks on the client
// too. The two run in different trust domains (a stale deployed function,
// a compromised CDN, a proxy in between) — the rule from the spec is that
// nothing from the network is trusted just because it parsed as JSON.
// Anything that fails these checks is discarded whole by the caller
// (js/ai-session-v8.js), never partially used.
// -----------------------------------------------------------------------------

function isStringArray(a) {
  return Array.isArray(a) && a.every(x => typeof x === "string");
}

/**
 * Shape only — this file does not know the current question bank, so it
 * cannot check that injectItems/reorder ids actually exist or that reorder
 * is a real permutation of the unanswered tail. Those checks need bank
 * context and live in ai-session-v8.js's applyDirective(), right next to
 * the splice logic they guard.
 */
export function isValidRoutingDirective(d) {
  if (!d || typeof d !== "object") return false;
  if (!isStringArray(d.injectItems)) return false;
  if (!isStringArray(d.reorder)) return false;
  if (!Array.isArray(d.pairResolutions)) return false;
  for (const r of d.pairResolutions) {
    if (!r || typeof r !== "object") return false;
    if (typeof r.aId !== "string" || typeof r.bId !== "string" || typeof r.resolvedBy !== "string") return false;
  }
  if (typeof d.probesUsed !== "number") return false;
  return true;
}

/** Spec §6.1. Built in Phase 5 alongside report-v8.js; validator lives here now so the shape is fixed before that file is written. */
export function isValidReportPersonDirective(d) {
  if (!d || typeof d !== "object") return false;
  if (!d.card || typeof d.card !== "object") return false;
  const c = d.card;
  if (typeof c.summary !== "string") return false;
  if (typeof c.consistency !== "string") return false;
  if (!isStringArray(c.mattersMost)) return false;
  return true;
}

/** Spec §6.2. */
export function isValidReportCoupleDirective(d) {
  if (!d || typeof d !== "object") return false;
  if (!Array.isArray(d.insights)) return false;
  for (const ins of d.insights) {
    if (!ins || typeof ins !== "object") return false;
    if (ins.kind !== "strength" && ins.kind !== "challenge") return false;
    if (typeof ins.title !== "string" || typeof ins.text !== "string") return false;
    if (!Array.isArray(ins.evidence)) return false;
    for (const e of ins.evidence) {
      if (!e || typeof e.itemId !== "string" || typeof e.who !== "string" || typeof e.summary !== "string") return false;
    }
  }
  if (!Array.isArray(d.conversations)) return false;
  for (const c of d.conversations) {
    if (!c || typeof c.prompt !== "string" || typeof c.why !== "string" || !Array.isArray(c.evidence)) return false;
  }
  if (!Array.isArray(d.divergences)) return false;
  for (const dv of d.divergences) {
    if (!dv || typeof dv.cat !== "string" || typeof dv.text !== "string") return false;
  }
  return true;
}

/** Per-open-text signal shape, spec §5. Called once per signal, not once per response — a batch with one bad signal shouldn't sink the good ones. */
export function isValidOpenTextSignal(s) {
  if (!s || typeof s !== "object") return false;
  if (typeof s.cat !== "string") return false;
  if (s.direction !== "high" && s.direction !== "low") return false;
  if (s.strength !== "weak" && s.strength !== "moderate" && s.strength !== "strong") return false;
  if (typeof s.quote !== "string" || s.quote.length === 0) return false;
  return true;
}
