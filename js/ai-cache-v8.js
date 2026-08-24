// MatchWise v8 — small localStorage cache for AI directives.
// -----------------------------------------------------------------------------
// The concrete case this exists for: js/app.js's language toggle re-runs
// renderCoupleReport(lastPair.pa, lastPair.pb) every time the user switches
// EN/AR while looking at a report (see the $("#langBtn").onclick handler).
// Once report-v8.js (Phase 5) adds AI-written report_person/report_couple
// calls to that path, every language toggle would otherwise re-bill both
// calls for content that hasn't changed. This cache is keyed on the actual
// answers, not on time, so it stays valid for as long as the two profiles
// being compared don't change — which, for a finished report, is forever.
//
// Not a general-purpose cache: no TTL, no invalidation beyond a hard cap on
// entry count (oldest evicted first). Deliberately small and boring.
// -----------------------------------------------------------------------------

const LS_KEY = "mw_ai_cache_v8";
const MAX_ENTRIES = 20;

// FNV-1a, 32-bit. Not cryptographic — this only needs to avoid accidental
// collisions between different answer sets in a single browser, not resist
// an adversary. Deterministic across runs, which is the actual requirement.
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/**
 * A stable key for one (phase, participants, answers) combination. Answers
 * are sorted by key first so the same answer set always hashes the same way
 * regardless of insertion order.
 */
export function cacheKeyFor(phase, ...answerObjects) {
  const parts = answerObjects.map(ans => {
    const sortedKeys = Object.keys(ans || {}).sort();
    return sortedKeys.map(k => `${k}:${ans[k]}`).join(",");
  });
  return `${phase}:${hashString(parts.join("|"))}`;
}

function readStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // Corrupt JSON, storage disabled, quota exceeded on read (shouldn't
    // happen, but localStorage has surprised people before) — treat as empty
    // rather than throwing. This is a cache; losing it is never fatal.
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded or storage disabled. Silently drop the write — worst
    // case is one extra AI call next time, not a broken app.
  }
}

export function getCached(key) {
  const store = readStore();
  const entry = store[key];
  return entry ? entry.directive : null;
}

export function setCached(key, directive) {
  const store = readStore();
  store[key] = { directive, ts: Date.now() };

  const keys = Object.keys(store);
  if (keys.length > MAX_ENTRIES) {
    keys.sort((a, b) => store[a].ts - store[b].ts);
    for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete store[k];
  }

  writeStore(store);
}
