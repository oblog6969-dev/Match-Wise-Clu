// MatchWise v6 scoring — interaction style. Additive layer over v3/v4/v5.
// -----------------------------------------------------------------------------
// Does NOT modify any earlier scoring module. No new questions are asked: this
// is a re-projection of Big Five estimates the app already computes.
//
// WHY THIS IS NOT CALLED "DiSC"
// -----------------------------
// DiSC® and Everything DiSC® are registered trademarks of John Wiley & Sons,
// and their items are proprietary. This file does not reproduce, license or
// approximate that instrument, and nothing here should ever be presented as
// "your DiSC result" — it is not scored against DiSC's norms and has no
// standing to claim equivalence with it.
//
// What it DOES do is compute the two-dimensional interpersonal space that
// DISC-style tools sit in, from the traits this app already measures. That is
// defensible because the DISC plane is very close to a rotation of Big Five
// Extraversion × Agreeableness. In a concurrent-validation sample of 9,000+
// respondents who took both (123test, 2015):
//
//        O      C      E      A      N
//   D   .186   .001   .336  -.392  -.109
//   I   .159  -.055   .543   .067  -.297
//   S  -.172   .069  -.280   .434   .012
//   C  -.203  -.018  -.624  -.006   .387
//
// Each DISC scale is essentially a blend of two Big Five factors, and the
// pair doing the work is Extraversion and Agreeableness. So:
//   x = Extraversion   (reserved ..... outspoken / fast-paced)
//   y = Agreeableness  (task-first .... people-first)
// which reproduces the classic DISC quadrant layout: D = outspoken+task,
// I = outspoken+people, S = reserved+people, C = reserved+task.
//
// IMPORTANT AND COUNTERINTUITIVE — the report must say this out loud:
// DISC's "C" is NOT the Big Five's Conscientiousness. Its correlation with
// it is -.018, i.e. nothing. Big Five Conscientiousness in fact correlates
// ~.00 with ALL FOUR DISC scales (.001, -.055, .069, -.018) — the DISC model
// does not measure it at all. Since this app shows a Big Five
// Conscientiousness figure elsewhere in the same report, a user seeing a "C"
// quadrant here would otherwise reasonably assume they are the same number.
// See CLASH_NOTE in report-v6.js.
//
// GUARDRAIL: like the worldview axes in v4, nothing here may touch the
// Alignment Index, the confidence figure, or deal-breaker capping. A
// difference in interaction style is a thing to understand, not evidence
// that a relationship will fail, and the literature does not support
// treating it as such.
// -----------------------------------------------------------------------------

/** Big Five domains this projection needs. Both must be sufficient. */
export const STYLE_DOMAINS = ["E", "A"];

/**
 * Distance from the 50 midpoint, on either axis, below which we decline to
 * name a quadrant at all.
 *
 * This is the honest answer to the standard and correct criticism of
 * four-quadrant tools: someone at 51/49 is not "a D", they are simply near
 * the middle, and forcing them into a corner invents a personality that the
 * data does not show. Below this threshold the report says "balanced"
 * instead of picking a box.
 */
export const STYLE_MIN_CLARITY = 8;

export const QUADRANTS = ["driving", "inspiring", "steady", "precise"];

/**
 * One person's position in the interaction plane.
 * Returns {sufficient:false} rather than a guess when either domain is
 * under-answered — same rule bigFiveV3/attachmentV3 already apply.
 */
export function interactionStyle(bigFive) {
  if (!bigFive) return { sufficient: false };
  const E = bigFive.E, A = bigFive.A;
  if (!E || !A || !E.sufficient || !A.sufficient) {
    const short = (E && !E.sufficient) ? E : A;
    return { sufficient: false, n: short ? short.n : 0, needed: short ? short.needed : null };
  }

  const x = E.value, y = A.value;
  const clarity = Math.max(Math.abs(x - 50), Math.abs(y - 50));
  const balanced = clarity < STYLE_MIN_CLARITY;

  // Quadrant by sign on each axis. Only meaningful when not balanced.
  const outspoken = x >= 50, people = y >= 50;
  const quadrant = balanced ? null
    : outspoken ? (people ? "inspiring" : "driving")
                : (people ? "steady" : "precise");

  return { sufficient: true, x, y, clarity, balanced, quadrant, outspoken, people };
}

/**
 * Couple-level read.
 *
 * `relation` is derived from which axes the two share a side of:
 *   same     — same quadrant
 *   adjacent — share one axis, differ on the other
 *   opposite — differ on both (diagonal on the plane)
 * `balanced` on either side suppresses the relation entirely: you cannot
 * call two people "opposites" when one of them has no clear position.
 */
export function compareInteraction(sa, sb) {
  if (!sa || !sb || !sa.sufficient || !sb.sufficient) return { sufficient: false };

  const gapX = Math.abs(sa.x - sb.x);
  const gapY = Math.abs(sa.y - sb.y);

  if (sa.balanced || sb.balanced) {
    return { sufficient: true, relation: null, gapX, gapY, a: sa, b: sb };
  }

  const sameX = sa.outspoken === sb.outspoken;
  const sameY = sa.people === sb.people;
  const relation = (sameX && sameY) ? "same" : (sameX || sameY) ? "adjacent" : "opposite";

  return { sufficient: true, relation, sameX, sameY, gapX, gapY, a: sa, b: sb };
}
