// MatchWise v5 scoring — additive layer over v4.
// -----------------------------------------------------------------------------
// Does NOT modify js/scoring.js, js/scoring-v3.js or js/scoring-v4.js.
//
// What v5 adds:
//   1. Growth opportunities — categories where BOTH partners lean low on
//      their OWN answers (profile.catLean, from soloSummaryV4/compareV4),
//      not categories where the two DISAGREE. compareV4()'s `challenges`
//      already covers disagreement; two people can fully agree while both
//      leaning low on the same thing (e.g. both avoid conflict), and that
//      case is exactly what challenges never catches, because agreement
//      there scores high.
//   2. Recommendations — short, templated, bilingual action lines built
//      only from fields compareV4() already returns (strengths, challenges,
//      growth). No new measurement, no new weight, no new axis.
//
// GUARDRAIL: nothing in this file may read or write res.index, res.confidence,
// res.cap or any deal-breaker field. This layer is presentation logic over
// numbers v4 already produced — it must not be able to move the headline.
// -----------------------------------------------------------------------------

/** Lean below which a category counts as "low" for growth purposes, 0-100. */
export const GROWTH_LEAN_MAX = 45;

/** Max recommendation lines shown — keeps the section a starting point, not a checklist. */
export const REC_MAX = 5;

/**
 * Categories where both people's own lean (compareV4().catLean.{a,b}) sits
 * below GROWTH_LEAN_MAX. Sorted so the lowest combined lean — the area both
 * of them lean furthest from — comes first.
 *
 * Returns [] (never null) so callers never need a null check; an empty
 * report section is a legitimate, honest result, not an error.
 */
export function growthOpportunities(res) {
  if (!res || !res.catLean || !res.catLean.a || !res.catLean.b) return [];
  const { a, b } = res.catLean;
  return Object.keys(a)
    .filter(c => c in b && a[c] < GROWTH_LEAN_MAX && b[c] < GROWTH_LEAN_MAX)
    .sort((x, y) => (a[x] + b[x]) - (a[y] + b[y]));
}

/**
 * Up to REC_MAX action lines: the single weakest-agreement category, the
 * single strongest shared growth area, then up to three strengths worth
 * protecting. Each entry is {type, cat} — report-v5.js supplies the wording,
 * this file only decides which categories earn a line and in what order.
 */
export function recommendations(res) {
  if (!res || !res.catScores) return [];
  const out = [];

  const challenges = (res.challenges || [])
    .slice()
    .sort((x, y) => res.catScores[x] - res.catScores[y]);
  if (challenges[0]) out.push({ type: "challenge", cat: challenges[0] });

  const growth = growthOpportunities(res);
  if (growth[0] && growth[0] !== challenges[0]) out.push({ type: "growth", cat: growth[0] });

  for (const cat of res.strengths || []) {
    if (out.length >= REC_MAX) break;
    if (out.some(r => r.cat === cat)) continue;
    out.push({ type: "strength", cat });
  }

  return out.slice(0, REC_MAX);
}
