// MatchWise v7 scoring — type preferences. Additive layer over v3/v4/v5/v6.
// -----------------------------------------------------------------------------
// Does NOT modify any earlier scoring module. No new questions are asked: like
// v6, this is a re-projection of Big Five estimates the app already computes.
//
// WHY THIS IS NOT CALLED "THE MBTI"
// ---------------------------------
// The Myers-Briggs Type Indicator® and MBTI® are registered trademarks of The
// Myers-Briggs Company, and the instrument's items are proprietary. This file
// does not reproduce, license or approximate that instrument. Nothing here is
// scored against its norms and nothing here has standing to claim equivalence
// with it. The underlying idea — Jung's (1921) psychological types, and the
// four-letter shorthand built on it — is old and freely discussed; the branded
// instrument is not this, and the report must not imply otherwise.
//
// WHY IT CAN BE DERIVED FROM BIG FIVE AT ALL
// ------------------------------------------
// Four of the five Big Five factors map onto the four type dimensions well
// enough that the projection is not a stretch. McCrae & Costa (1989),
// "Reinterpreting the Myers-Briggs Type Indicator from the perspective of the
// five-factor model of personality", J. Personality 57(1), N = 267, scoring
// each continuous MBTI scale toward its second pole:
//
//     MBTI scale (toward)      strongest Big Five correlate        r
//     ---------------------------------------------------------------
//     E-I  (toward I)          Extraversion                     -.74
//     S-N  (toward N)          Openness                          .72
//     T-F  (toward F)          Agreeableness                     .44
//     J-P  (toward P)          Conscientiousness                -.49
//
// So, with this app's 0-100 trait scales:
//     E/I  = Extraversion        (high -> E)
//     S/N  = Openness            (high -> N)
//     T/F  = Agreeableness       (high -> F)
//     J/P  = Conscientiousness   (high -> J)
//
// Two of those (E-I at .74, S-N at .72) are strong. T-F at .44 is moderate
// and J-P at .49 is moderate; the report says so rather than presenting all
// four letters as equally well-founded.
//
// THE FINDING THAT MUST REACH THE UI — see MISSING_NOTE in report-v7.js.
// The fifth factor, Neuroticism / emotional volatility, has NO counterpart in
// the four-letter model at all. In the same study it did not define any of the
// four dimensions. That omission matters more here than in a workplace tool,
// because in couples research Neuroticism is the single most consistent
// personality predictor of relationship satisfaction and stability (Karney &
// Bradbury, 1995, meta-analysis of 115 longitudinal studies). So the trait
// with the best evidence for the thing this app is actually about is the one
// trait the four-letter model leaves out. A user who reads their type as a
// compatibility summary would be reading past exactly the wrong gap.
//
// WHY LETTERS ARE GATED RATHER THAN FORCED — see TYPE_MIN_CLARITY.
// The same study found the four dimensions are continuously and roughly
// normally distributed, not bimodal: there is no gap in the middle separating
// two kinds of people, so the cut at the midpoint is imposed by the scoring,
// not found in the data. That is also why retest instability is concentrated
// near the middle — in Howes & Carskadon (1979) about half of respondents
// came out with a different type on a five-week retest. Someone at 51 is not
// "an E"; they are near the middle, and next month the coin lands the other
// way. This module therefore refuses to name a letter inside the dead band and
// reports that dimension as undifferentiated ("X").
//
// GUARDRAIL: like the worldview axes in v4 and interaction style in v6,
// nothing here may touch the Alignment Index, the confidence figure, or
// deal-breaker capping. Type-pair "compatibility" tables have no established
// predictive validity, so no number here may feed the couple's score.
// -----------------------------------------------------------------------------

/** Big Five domains this projection needs, in output (letter) order. */
export const TYPE_DOMAINS = ["E", "O", "A", "C"];

/**
 * Distance from the 50 midpoint below which we decline to name a letter.
 * Matches STYLE_MIN_CLARITY in scoring-v6.js deliberately: the two cards sit
 * in the same report and must not apply different standards of confidence to
 * the same underlying trait scores.
 */
export const TYPE_MIN_CLARITY = 8;

/** Undifferentiated marker. Long-standing convention in type circles. */
export const UNDIFFERENTIATED = "X";

/**
 * The four dimensions. `domain` is the Big Five key that drives it; `hi`/`lo`
 * are the letters at the top and bottom of that 0-100 scale; `r` is the
 * absolute correlation from McCrae & Costa (1989) that justifies the mapping,
 * and `strength` is how the report is allowed to describe it.
 */
export const TYPE_DIMS = [
  { key: "EI", domain: "E", hi: "E", lo: "I", r: 0.74, strength: "strong" },
  { key: "SN", domain: "O", hi: "N", lo: "S", r: 0.72, strength: "strong" },
  { key: "TF", domain: "A", hi: "F", lo: "T", r: 0.44, strength: "moderate" },
  { key: "JP", domain: "C", hi: "J", lo: "P", r: 0.49, strength: "moderate" },
];

/**
 * One person's type preferences.
 *
 * Per-dimension sufficiency rather than all-or-nothing: a dimension whose
 * source trait is under-answered is returned with sufficient:false and simply
 * omitted from the display, exactly as v4's worldview axes do. The four-letter
 * code, however, requires all four — a code with a hole in it would be read as
 * a type, and a partial type is a made-up one.
 */
export function typePreferences(bigFive) {
  if (!bigFive) return { sufficient: false, dims: [] };

  const dims = TYPE_DIMS.map(d => {
    const src = bigFive[d.domain];
    if (!src || !src.sufficient) {
      return {
        ...d, sufficient: false,
        n: src ? src.n : 0, needed: src ? src.needed : null,
      };
    }
    const value = src.value;
    const clarity = Math.abs(value - 50);
    const clear = clarity >= TYPE_MIN_CLARITY;
    return {
      ...d, sufficient: true, value, clarity, clear,
      letter: clear ? (value >= 50 ? d.hi : d.lo) : UNDIFFERENTIATED,
    };
  });

  const usable = dims.filter(d => d.sufficient);
  if (!usable.length) {
    const short = dims[0];
    return { sufficient: false, dims, n: short.n, needed: short.needed };
  }

  const complete = usable.length === TYPE_DIMS.length;
  const code = complete ? dims.map(d => d.letter).join("") : null;
  const clearCount = usable.filter(d => d.clear).length;

  return {
    sufficient: true, dims, usable, complete, code, clearCount,
    // A code that is all X is not a type by any reading. Flagged so the
    // report can lead with the sliders and say so plainly.
    allBalanced: complete && clearCount === 0,
  };
}

// -----------------------------------------------------------------------------
// TYPE TABLE, DISTANCE, AND THE PAIRING CHART
// -----------------------------------------------------------------------------
// The user asked to see which types are most and least compatible with theirs.
// That request has two very different answers, and this module returns them
// separately on purpose, because blending them would launder folk advice into
// something that looks measured:
//
//   1. DISTANCE (typeDistances) — a real, computed quantity. Each of the 16
//      types is a corner of the same four-dimensional space this app already
//      scores, so "how far is this person from that type's profile" is just
//      arithmetic on numbers already in the report. It answers "which types
//      resemble me / least resemble me". It does NOT answer "who suits me".
//
//   2. THE PAIRING CHART (keirseyMatches) — Keirsey & Bates, "Please
//      Understand Me" (1978), which proposed that satisfying couples tend to
//      share the S/N preference while differing on E/I and J/P. This is the
//      source most of the "best match" charts circulating online descend from.
//      It is a published proposal, not a finding: attempts to predict couple
//      satisfaction from type pairings have not produced a reliable effect,
//      and reviews of the instrument's predictive validity (including the US
//      National Research Council's 1991 assessment) did not support this use.
//      It is returned so the report can show it AND label it, rather than
//      leaving the user to find a worse version of it elsewhere.
//
// GUARDRAIL: neither figure may reach the Alignment Index. See report-v7.js.
// -----------------------------------------------------------------------------

/** The 16 codes in the conventional 4x4 type-table layout, row-major. */
export const TYPE_TABLE = [
  ["ISTJ", "ISFJ", "INFJ", "INTJ"],
  ["ISTP", "ISFP", "INFP", "INTP"],
  ["ESTP", "ESFP", "ENFP", "ENTP"],
  ["ESTJ", "ESFJ", "ENFJ", "ENTJ"],
];

export const ALL_TYPES = TYPE_TABLE.flat();

/**
 * Where a type sits in the 0-100 space. 25/75 rather than 0/100 deliberately:
 * a type label means "on this side of the middle", not "at the extreme", and
 * using the poles would exaggerate every distance in the table.
 */
const POLE_HI = 75, POLE_LO = 25;

export function typeCentroid(code) {
  return TYPE_DIMS.map((d, i) => (code[i] === d.hi ? POLE_HI : POLE_LO));
}

/**
 * Distance from one person's four scores to every type, 0 (identical) to 100
 * (as far as this space allows). Mean absolute difference across the four
 * dimensions, normalised by the largest mean difference achievable (75, when
 * a score sits at a pole and the centroid sits at the opposite 25).
 *
 * Returns null when any dimension is under-answered: a distance computed from
 * three of four dimensions would silently rank types on partial evidence.
 */
export function typeDistances(t) {
  if (!t || !t.sufficient || !t.complete) return null;
  const vals = TYPE_DIMS.map(d => t.dims.find(x => x.key === d.key).value);
  const rows = ALL_TYPES.map(code => {
    const c = typeCentroid(code);
    const mean = vals.reduce((s, v, i) => s + Math.abs(v - c[i]), 0) / 4;
    return { code, distance: Math.round((mean / 75) * 100) };
  });
  const sorted = [...rows].sort((a, b) => a.distance - b.distance);
  return {
    rows,
    byCode: Object.fromEntries(rows.map(r => [r.code, r.distance])),
    nearest: sorted.slice(0, 3),
    furthest: sorted.slice(-3).reverse(),
  };
}

/**
 * Keirsey's proposed complementary pairing, applied to a four-letter code:
 * share S/N, differ on E/I and J/P, T/F unconstrained — which yields two
 * "best" codes and two "worst" (differ on S/N, share E/I and J/P).
 *
 * Returned as a labelled proposal. The report MUST present it as such.
 */
export function keirseyMatches(code) {
  if (!code || code.length !== 4 || code.includes(UNDIFFERENTIATED)) return null;
  const flip = (c, i) => (c === TYPE_DIMS[i].hi ? TYPE_DIMS[i].lo : TYPE_DIMS[i].hi);
  const build = (ei, sn, jp) =>
    ["T", "F"].map(tf =>
      (ei ? flip(code[0], 0) : code[0]) +
      (sn ? flip(code[1], 1) : code[1]) +
      tf +
      (jp ? flip(code[3], 3) : code[3]));
  return {
    best: build(true, false, true),    // opposite E/I and J/P, same S/N
    worst: build(false, true, false),  // same E/I and J/P, opposite S/N
  };
}

/**
 * Couple distance — how far apart the two people actually sit, per dimension
 * and overall. This is measured, not a compatibility rating: it says how
 * similar they are, and similarity is not the same question as suitability.
 */
export function typeDistanceCouple(ta, tb) {
  if (!ta || !tb || !ta.sufficient || !tb.sufficient) return null;
  const dims = TYPE_DIMS.map(d => {
    const a = ta.dims.find(x => x.key === d.key), b = tb.dims.find(x => x.key === d.key);
    if (!a.sufficient || !b.sufficient) return { ...d, sufficient: false };
    return { ...d, sufficient: true, a: a.value, b: b.value, gap: Math.abs(a.value - b.value) };
  });
  const usable = dims.filter(d => d.sufficient);
  if (!usable.length) return null;
  const overall = Math.round(usable.reduce((s, d) => s + d.gap, 0) / usable.length);
  return { dims, usable, overall, complete: usable.length === TYPE_DIMS.length };
}

/**
 * Couple-level read — DESCRIPTIVE ONLY, by explicit product decision.
 *
 * There is no compatibility score here and must not be one. Type-pairing
 * compatibility claims ("N types need N types", and similar) are folk
 * guidance: they are not supported by the peer-reviewed literature, and
 * pair-level predictive validity for the four-letter model has not been
 * established. What this returns is per-dimension agreement so the report can
 * describe where two people differ and what that difference tends to look
 * like day to day — nothing that ranks the couple.
 *
 * A dimension where either side is undifferentiated returns shared:null:
 * you cannot say two people "agree" on a letter one of them does not have.
 */
export function compareTypes(ta, tb) {
  if (!ta || !tb || !ta.sufficient || !tb.sufficient) return { sufficient: false };

  const dims = TYPE_DIMS.map(d => {
    const a = ta.dims.find(x => x.key === d.key);
    const b = tb.dims.find(x => x.key === d.key);
    if (!a.sufficient || !b.sufficient) return { ...d, sufficient: false };
    const comparable = a.clear && b.clear;
    return {
      ...d, sufficient: true, a, b,
      gap: Math.abs(a.value - b.value),
      comparable,
      shared: comparable ? (a.letter === b.letter) : null,
    };
  });

  const comparable = dims.filter(d => d.sufficient && d.comparable);
  return {
    sufficient: true,
    dims,
    comparable,
    sharedCount: comparable.filter(d => d.shared).length,
    differing: comparable.filter(d => d.shared === false),
  };
}
