// MatchWise v8 — the report layer.
// -----------------------------------------------------------------------------
// Never returns an HTML string for innerHTML assignment. renderReportV7()'s
// own output stays the trusted innerHTML under #reportRoot exactly as it is
// today; everything in this file is appended afterward as real DOM nodes
// built with document.createElement() + .textContent only. See "MatchWise
// Vault/v8 - AI Assessor Spec.md" §6.3 and the "AI never sets the numbers"
// guardrail in §2.
//
// Nothing here recomputes anything scoring-v3/v4 already computed. Every
// real number this file shows (bigFive, attachment, loveLanguage,
// worldview, catScores, strengths/challenges, the base confidence) is read
// straight off compareV4()'s own return value — never rederived. The one
// new number, displayConfidence, comes from scoring-v8.js's
// computeDisplayConfidence(), which itself only adds a small, capped,
// numerically-verified bonus on top of that same base confidence.
//
// Two network calls, fired in the background from renderCoupleReport() in
// app.js, AFTER the real (v7) report is already on screen and show("report")
// has already run:
//   1. report_person — once per partner. Produces a short first-person-style
//      card (summary / consistency / mattersMost) plus, optionally, signals
//      extracted from that partner's own open-text answers (each one
//      re-verified as a literal quote by scoring-v8.js's
//      filterValidOpenTextSignals — never trusted just because it parsed).
//   2. report_couple — once, only if at least one report_person call
//      produced something. Produces evidence-linked insights, discussion
//      prompts, and divergence notes. Every evidence[].itemId is checked
//      here against what both partners actually answered (or, for an
//      open-text citation, against that specific partner's own
//      already-quote-verified extraction) — an insight or conversation
//      citing anything else is dropped whole, never partially trusted.
//
// If either call fails, times out, or comes back empty (exactly what the
// Phase 1 stub deployed today returns), buildAiReportAddon() resolves to
// null and nothing is appended — the report stays byte-identical to
// renderReportV7()'s own output. No empty cards, no error shown.
//
// Both calls are cached (js/ai-cache-v8.js, keyed on phase+who+lang plus
// the actual answers involved) — this is that module's originally-stated
// purpose: app.js's language toggle re-runs renderCoupleReport() on every
// EN/AR switch while a report is open, and without this, every toggle would
// re-bill both calls for content that can't have changed. Only a
// shape-validated response is ever cached; a failed call is never cached,
// so a down endpoint is retried on the next toggle rather than staying
// silent forever.
// -----------------------------------------------------------------------------

import { bankFor } from "./scoring-v4.js";
import { computeUnresolvedPairs, computeCategoryCoverage } from "./ai-session-v8.js";
// Single line on purpose — build-single.js's strip() only removes whole-line
// `import`s; a wrapped import leaves a dangling `} from "...";` in the
// bundle (a syntax error that surfaces only when someone opens the built
// single-file preview). See that file's own sanity-check comment.
import { parseResolutionLog, validateNumericResolution, computeDisplayConfidence, filterValidOpenTextSignals } from "./scoring-v8.js";
import { isValidReportPersonDirective, isValidReportCoupleDirective } from "./ai-schema-v8.js";
import { OPEN_TEXT_ITEMS } from "./questions-v8.js";
import { postPacket } from "./ai-client-v8.js";
import { cacheKeyFor, getCached, setCached } from "./ai-cache-v8.js";

const REPORT_TIMEOUT_MS = 4000; // matches ai-session-v8.js's own TIMEOUT_MS / supabase/functions/assess/index.ts
// (named distinctly from ai-session-v8.js's TIMEOUT_MS so the two module-
// scoped constants don't collide once build-single.js concatenates every
// module into one shared top-level scope for the offline single-file build)

// ------------------------------------------------------------- text table --

const T8 = {
  confTitle: { en: "A closer look at consistency", ar: "نظرة أقرب على الاتساق" },
  confBody: {
    en: (base, display) =>
      `A few answers were double-checked against each other for consistency. Where they held up, the confidence score moved from ${base}% to ${display}%.`,
    ar: (base, display) =>
      `تمّ التحقق من بعض الإجابات للتأكد من اتساقها مع بعضها. وحيثما ثبت الاتساق، ارتفعت نسبة الثقة من ${base}% إلى ${display}%.`,
  },
  personTitle: { en: "In their own words", ar: "بكلماتهما" },
  consistencyLabel: { en: "Consistency", ar: "الاتساق" },
  mattersMostLabel: { en: "What seems to matter most", ar: "ما يبدو أنه الأهمّ" },
  insightsTitle: { en: "Evidence-Backed Insights", ar: "رؤى مبنية على أدلة" },
  strengthLabel: { en: "Strength", ar: "نقطة قوة" },
  challengeLabel: { en: "Worth discussing", ar: "يستحق النقاش" },
  conversationsTitle: { en: "Conversations worth having", ar: "أحاديث تستحق أن تدور بينكما" },
  divergencesTitle: { en: "Where you see things differently", ar: "أين تختلف رؤيتكما" },
};

// ------------------------------------------------------ request packets --

/** Distinct, validated, deduped pair resolutions this person actually earned — see scoring-v8.js's own computeResolutionBonus() for the identical dedupe rule. Sent so the report_person prompt can reference "you clarified X" without re-deriving it. */
function resolvedPairsFor(p) {
  const bank = bankFor(p);
  const answers = p.answers || {};
  const seen = new Set();
  const out = [];
  for (const c of parseResolutionLog(p)) {
    if (!c || typeof c.aId !== "string" || typeof c.bId !== "string") continue;
    const key = [c.aId, c.bId].sort().join("|");
    if (seen.has(key)) continue;
    if (!validateNumericResolution(c, bank, answers)) continue;
    seen.add(key);
    out.push({ aId: c.aId, bId: c.bId, resolvedBy: c.resolvedBy });
  }
  return out;
}

/** This person's own open-text answers, truncated the same way buildRoutingPacket() does. */
function openTextFor(p) {
  const answers = p.answers || {};
  const out = [];
  for (const item of OPEN_TEXT_ITEMS) {
    const v = answers[item.id];
    if (typeof v === "string" && v.trim()) out.push({ id: item.id, cat: item.cat, text: v.slice(0, 500) });
  }
  return out;
}

/**
 * Explicit allow-list, same discipline as ai-session-v8.js's
 * buildRoutingPacket() — never built by spreading a profile object. `who` is
 * just the tag "a"/"b" this session uses to keep the two calls apart; it is
 * not a name and is never paired with one anywhere in this packet.
 *
 * bigFive / attachment / loveLanguage / worldview all come straight out of
 * compareResult (compareV4()'s own return value) rather than being
 * recomputed here — one source of truth for those numbers, same principle
 * scoring-v8.js's computeDisplayConfidence() already follows.
 */
function buildPersonPacket({ sessionId, lang, who, compareResult, p }) {
  const bank = bankFor(p);
  const answers = p.answers || {};
  return {
    sessionId,
    lang: lang === "ar" ? "ar" : "en",
    phase: "report_person",
    who,
    bigFive: compareResult.bigFive[who],
    attachment: compareResult.attachment[who],
    loveLanguage: compareResult.love[who],
    worldview: compareResult.worldview[who],
    categoryCoverage: computeCategoryCoverage(bank, answers),
    unresolvedPairs: computeUnresolvedPairs(bank, answers),
    resolvedPairs: resolvedPairsFor(p),
    openText: openTextFor(p),
  };
}

/** Real v4 bank item ids BOTH partners actually answered — the only ids a couple-level insight is allowed to cite as evidence, alongside each partner's own already-quote-verified open-text extractions (checked separately, at filter time). */
function sharedAnsweredIds(pa, pb) {
  const bankA = bankFor(pa), bankB = bankFor(pb);
  const idsA = new Set(bankA.map(q => q.id));
  const shared = new Set();
  for (const q of bankB) {
    if (!idsA.has(q.id)) continue;
    if ((pa.answers || {})[q.id] == null || (pb.answers || {})[q.id] == null) continue;
    shared.add(q.id);
  }
  return shared;
}

function buildCouplePacket({ sessionId, lang, pa, pb, compareResult, personA, personB, shared }) {
  const byId = Object.fromEntries(bankFor(pa).map(q => [q.id, q]));
  const answeredShared = [...shared]
    .map(id => ({ id, cat: byId[id] && byId[id].cat, type: byId[id] && byId[id].type, a: pa.answers[id], b: pb.answers[id] }))
    .filter(e => e.cat);

  const openTextSignals = [];
  for (const ex of (personA && personA.extractions) || []) for (const s of ex.signals) openTextSignals.push({ itemId: ex.itemId, who: "a", ...s });
  for (const ex of (personB && personB.extractions) || []) for (const s of ex.signals) openTextSignals.push({ itemId: ex.itemId, who: "b", ...s });

  return {
    sessionId,
    lang: lang === "ar" ? "ar" : "en",
    phase: "report_couple",
    catScores: compareResult.catScores || null,
    catLean: compareResult.catLean || null,
    strengths: compareResult.strengths || null,
    challenges: compareResult.challenges || null,
    unresolvedPairsA: computeUnresolvedPairs(bankFor(pa), pa.answers || {}),
    unresolvedPairsB: computeUnresolvedPairs(bankFor(pb), pb.answers || {}),
    answeredShared,
    openTextSignals,
    cardA: (personA && personA.card) || null,
    cardB: (personB && personB.card) || null,
  };
}

// ------------------------------------------------------- network + verify --

/** Never throws, never returns a partial/unverified result. Returns null when there is nothing safe or non-empty to show. */
async function fetchPersonDirective({ sessionId, lang, who, compareResult, p }) {
  const cacheKey = cacheKeyFor(`report_person:${who}:${lang}`, p.answers || {});
  let result = getCached(cacheKey);
  if (result == null) {
    const packet = buildPersonPacket({ sessionId, lang, who, compareResult, p });
    result = await postPacket(packet, { timeoutMs: REPORT_TIMEOUT_MS });
    if (result == null) return null;
    if (!isValidReportPersonDirective(result)) return null;
    setCached(cacheKey, result); // only a shape-validated response is ever cached
  }

  const openTextAnswers = {};
  for (const item of OPEN_TEXT_ITEMS) {
    const v = (p.answers || {})[item.id];
    if (typeof v === "string" && v.trim()) openTextAnswers[item.id] = v;
  }

  const extractions = [];
  const raw = Array.isArray(result.openTextExtractions) ? result.openTextExtractions : [];
  for (const ex of raw) {
    if (!ex || typeof ex.itemId !== "string" || !Array.isArray(ex.signals)) continue;
    const kept = filterValidOpenTextSignals(ex, openTextAnswers);
    if (kept.length) extractions.push({ itemId: ex.itemId, signals: kept });
  }

  const c = result.card;
  const cardEmpty = !c.summary.trim() && !c.consistency.trim() && (!c.mattersMost || c.mattersMost.length === 0);
  if (cardEmpty && extractions.length === 0) return null; // no empty cards, spec §6.4

  return { card: c, extractions };
}

async function fetchCoupleDirective({ sessionId, lang, pa, pb, compareResult, personA, personB }) {
  const shared = sharedAnsweredIds(pa, pb);
  const cacheKey = cacheKeyFor(`report_couple:${lang}`, pa.answers || {}, pb.answers || {});
  let result = getCached(cacheKey);
  if (result == null) {
    const packet = buildCouplePacket({ sessionId, lang, pa, pb, compareResult, personA, personB, shared });
    result = await postPacket(packet, { timeoutMs: REPORT_TIMEOUT_MS });
    if (result == null) return null;
    if (!isValidReportCoupleDirective(result)) return null;
    setCached(cacheKey, result);
  }

  const idsA = new Set(((personA && personA.extractions) || []).map(ex => ex.itemId));
  const idsB = new Set(((personB && personB.extractions) || []).map(ex => ex.itemId));
  const isGrounded = e => {
    if (!e || typeof e.itemId !== "string") return false;
    if (shared.has(e.itemId)) return true;
    if (e.who === "a" && idsA.has(e.itemId)) return true;
    if (e.who === "b" && idsB.has(e.itemId)) return true;
    return false;
  };

  // Drop the WHOLE insight/conversation the moment any one of its evidence
  // claims doesn't resolve to something both partners actually answered (or
  // a quote-verified open-text extraction from the partner it names) — never
  // partially trusted, same rule as everywhere else in the v8 layer.
  const insights = (result.insights || []).filter(ins =>
    Array.isArray(ins.evidence) && ins.evidence.length > 0 && ins.evidence.every(isGrounded));

  const conversations = (result.conversations || []).filter(c =>
    !Array.isArray(c.evidence) || c.evidence.length === 0 || c.evidence.every(isGrounded));

  const knownCats = new Set([...bankFor(pa), ...bankFor(pb)].map(q => q.cat));
  const divergences = (result.divergences || []).filter(d => knownCats.has(d.cat));

  if (!insights.length && !conversations.length && !divergences.length) return null; // no empty cards
  return { insights, conversations, divergences };
}

/**
 * The one function app.js calls. Fire-and-forget from renderCoupleReport(),
 * strictly AFTER the real v7 report is already on screen — see that
 * function's own comment for why this never blocks or replaces it.
 * Resolves to null (never throws) when there's nothing safe or non-empty to
 * add, so the caller's job reduces to "append this if it's not null".
 */
export async function buildAiReportAddon({ sessionId, lang, pa, pb, compareResult }) {
  // Always computable, no network needed — the confidence bonus already
  // numerically verified against this person's own real answers during the
  // quiz itself (scoring-v8.js). Shown whenever it's actually nonzero.
  const confidence = computeDisplayConfidence(pa, pb, compareResult);

  const [personA, personB] = await Promise.all([
    fetchPersonDirective({ sessionId: `${sessionId}:a`, lang, who: "a", compareResult, p: pa }),
    fetchPersonDirective({ sessionId: `${sessionId}:b`, lang, who: "b", compareResult, p: pb }),
  ]);

  let couple = null;
  if (personA || personB) {
    couple = await fetchCoupleDirective({ sessionId, lang, pa, pb, compareResult, personA, personB });
  }

  const hasContent = confidence.resolutionBonus > 0 || !!personA || !!personB || !!couple;
  if (!hasContent) return null;

  return { confidence, personA, personB, couple };
}

// ------------------------------------------------------------------ render --
// Every element below is built with createElement()/.textContent — never
// innerHTML, never a template string parsed as markup. This is the one hard
// line the whole Insight Engine draws around anything model-authored: a
// crafted answer or a compromised response can, at absolute worst, show up
// as literal inert text on screen. It can never become markup, a script, or
// an event handler.

function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.cls) node.className = opts.cls;
  if (opts.text != null) node.textContent = opts.text;
  return node;
}

function renderConfidenceCard(conf, lang) {
  const card = el("div", { cls: "card report-section" });
  card.appendChild(el("h3", { text: T8.confTitle[lang] }));
  card.appendChild(el("p", { cls: "muted small", text: T8.confBody[lang](conf.baseConfidence, conf.displayConfidence) }));
  return card;
}

function renderPersonCard(personResult, person, lang) {
  const card = el("div", { cls: "card report-section" });
  card.appendChild(el("h3", { text: `${T8.personTitle[lang]} — ${person.name}` }));
  const { summary, consistency, mattersMost } = personResult.card;
  if (summary) card.appendChild(el("p", { cls: "small", text: summary }));
  if (consistency) {
    const p = el("p", { cls: "muted small" });
    p.appendChild(document.createTextNode(`${T8.consistencyLabel[lang]}: `));
    p.appendChild(document.createTextNode(consistency));
    card.appendChild(p);
  }
  if (mattersMost && mattersMost.length) {
    card.appendChild(el("p", { cls: "muted small", text: `${T8.mattersMostLabel[lang]}:` }));
    const ul = el("ul", { cls: "clean" });
    for (const m of mattersMost) ul.appendChild(el("li", { text: m }));
    card.appendChild(ul);
  }
  return card;
}

function renderCoupleCard(couple, lang) {
  const wrap = document.createElement("div");
  let any = false;

  if (couple.insights.length) {
    const card = el("div", { cls: "card report-section" });
    card.appendChild(el("h3", { text: T8.insightsTitle[lang] }));
    for (const ins of couple.insights) {
      const block = el("div", { cls: "report-section" });
      const label = ins.kind === "strength" ? T8.strengthLabel[lang] : T8.challengeLabel[lang];
      block.appendChild(el("h4", { cls: "lean-head", text: `${label} — ${ins.title}` }));
      block.appendChild(el("p", { cls: "small", text: ins.text }));
      if (ins.evidence.length) {
        const ul = el("ul", { cls: "clean" });
        for (const e of ins.evidence) ul.appendChild(el("li", { cls: "muted small", text: e.summary }));
        block.appendChild(ul);
      }
      card.appendChild(block);
    }
    wrap.appendChild(card);
    any = true;
  }

  if (couple.conversations.length) {
    const card = el("div", { cls: "card report-section" });
    card.appendChild(el("h3", { text: T8.conversationsTitle[lang] }));
    const ul = el("ul", { cls: "clean" });
    for (const c of couple.conversations) {
      const li = document.createElement("li");
      const b = el("b", { text: c.prompt });
      li.appendChild(b);
      li.appendChild(document.createTextNode(` — ${c.why}`));
      ul.appendChild(li);
    }
    card.appendChild(ul);
    wrap.appendChild(card);
    any = true;
  }

  if (couple.divergences.length) {
    const card = el("div", { cls: "card report-section" });
    card.appendChild(el("h3", { text: T8.divergencesTitle[lang] }));
    const ul = el("ul", { cls: "clean" });
    for (const d of couple.divergences) ul.appendChild(el("li", { text: d.text }));
    card.appendChild(ul);
    wrap.appendChild(card);
    any = true;
  }

  return any ? wrap : null;
}

/**
 * Builds the DOM fragment app.js appends to #reportRoot, or returns null
 * when addon is null or (defensively) turns out to have nothing renderable.
 * Never touches #reportRoot itself — the caller decides where and whether
 * to attach it.
 */
export function renderAiReportAddon(addon, pa, pb, lang) {
  if (!addon) return null;
  const frag = document.createElement("div");
  let any = false;

  if (addon.confidence.resolutionBonus > 0) {
    frag.appendChild(renderConfidenceCard(addon.confidence, lang));
    any = true;
  }
  if (addon.personA) { frag.appendChild(renderPersonCard(addon.personA, pa, lang)); any = true; }
  if (addon.personB) { frag.appendChild(renderPersonCard(addon.personB, pb, lang)); any = true; }
  if (addon.couple) {
    const card = renderCoupleCard(addon.couple, lang);
    if (card) { frag.appendChild(card); any = true; }
  }

  return any ? frag : null;
}
