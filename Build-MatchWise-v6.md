# MatchWise v6 — build spec

Additive layer over v5. New files only: `js/scoring-v6.js`, `js/report-v6.js`.
Nothing in `questions*.js`, `scoring.js`/`scoring-v3`/`v4`/`v5`, or
`report.js`/`report-v3`/`v4`/`v5` was modified.

## The request, and what was actually built

The ask was: "do we have DiSC in the report? add the DiSC assessment result."

The answer to the first half was no — the report had Big Five, attachment
style, love language and worldview, but nothing in the DISC family.

The second half could not be done literally, for two reasons, so v6 ships
the defensible version of it. Both reasons are worth recording.

### 1. DiSC® is proprietary

`DiSC®` and `Everything DiSC®` are registered trademarks of John Wiley &
Sons, and the item content is proprietary. This app cannot reproduce that
instrument, cannot score against its norms, and must never present its own
output as "your DiSC result" — that would be both a trademark problem and a
false claim about provenance.

The underlying *model* is a different matter: it descends from Marston's
*Emotions of Normal People* (1928) and the four-quadrant idea is long in the
public domain. Referencing it as a cross-reference is fine. Claiming to be
Wiley's product is not. `report-v6.js` enforces that distinction with a
load-time guardrail check that throws if a string like "Everything DiSC" or
"your DiSC result" reaches the user-facing layer.

### 2. DISC is very close to a rotation of two Big Five factors

This is what makes the feature possible without asking a single new
question. In a concurrent-validation sample of 9,000+ people who took both
instruments (123test, 2015), the correlations were:

|   | O | C | E | A | N |
|---|---|---|---|---|---|
| **D** | .186 | .001 | .336 | **-.392** | -.109 |
| **I** | .159 | -.055 | **.543** | .067 | -.297 |
| **S** | -.172 | .069 | -.280 | **.434** | .012 |
| **C** | -.203 | -.018 | **-.624** | -.006 | .387 |

Each DISC scale is a blend of about two Big Five factors, and the two doing
the work are **Extraversion** and **Agreeableness**. So v6 plots:

- **x = Extraversion** — reserved ↔ outspoken
- **y = Agreeableness** — task-first ↔ people-first

which reproduces the classic quadrant layout: D = outspoken+task,
I = outspoken+people, S = reserved+people, C = reserved+task. A smaller
independent study (n=89, *Journal of Instructional Pedagogies*) found the
same directional pattern with modest effect sizes.

The app already estimates E and A from BFI-2-XS-style items with sufficiency
gating, so the whole card is a re-projection of data already collected. No
new questions, no added assessment burden.

### The finding that had to be surfaced in the UI

In that same 9,000-person matrix, **DISC's "C" correlates -.018 with Big
Five Conscientiousness** — i.e. nothing. Big Five Conscientiousness in fact
correlates ≈.00 with *all four* DISC scales (.001, −.055, .069, −.018): the
DISC model does not measure it at all. DISC's C is about being reserved and
precise, not organised or dependable.

This matters here specifically because **this report already shows a Big Five
Conscientiousness figure elsewhere on the same page.** A user seeing a "C"
quadrant would reasonably assume the two are the same number, and they are
not — they are free to disagree completely. `CLASH_NOTE` in `report-v6.js`
says so explicitly, in both languages, and a guardrail check throws if that
note ever loses its supporting evidence.

## What the card shows

- A quadrant plot, one dot per person, on the two axes above. Same visual
  language as the existing attachment quadrant chart.
- A plain-language quadrant name as the **primary** label — Driving,
  Inspiring, Steady, Precise — with the classic DISC letter offered only as
  a parenthetical cross-reference, never as the identity.
- A couple-level read: `same` quadrant / `adjacent` (shares one axis) /
  `opposite` (diagonal), each with its own interpretation. Adjacent is
  described as the easiest combination; opposite is explicitly *not* framed
  as a warning.
- A collapsed "If you know the DISC model" panel carrying the C-vs-
  Conscientiousness disambiguation.

## Honesty constraints in the implementation

**`STYLE_MIN_CLARITY = 8`.** The standard and correct criticism of
four-quadrant tools is that they force someone at 51/49 into a corner and
invent a personality the data does not show. When a person sits within 8
points of the midpoint on *both* axes, v6 declines to name a quadrant and
reports "balanced" instead — described as a real result, not a missing one.
If either partner is balanced, the couple-level relation is suppressed
entirely: you cannot call two people opposites when one has no clear
position.

**Sufficiency gating.** If either E or A is under-answered, the card shows
the standard "not enough answers" message rather than a guessed position —
the same rule `bigFiveV3` and `attachmentV3` already apply.

**GUARDRAIL — never touches the score.** Like the v4 worldview axes, nothing
in v6 may read or write the Alignment Index, the confidence figure, or
deal-breaker capping. Interaction style is a thing to understand, not
evidence a relationship will fail, and the literature does not support
treating it as such. Verified: index reads 55 both before and after the card
is added, and in both languages.

## Verification performed

- Quadrant assignment unit-tested at all four corners, dead centre, and both
  sides of the clarity threshold; insufficiency and one-balanced couple
  paths tested.
- Rendered in EN and AR, including via the live language toggle.
- SVG containment checked with `getBoundingClientRect` (**not** `getBBox` —
  `getBBox` ignores transforms, so the rotated y-axis label false-positives
  as off-canvas; this cost a debugging cycle and is why the check now uses
  rendered geometry). 0 off-canvas labels, 0 label collisions, both languages.
- Quadrant names were moved from the centre crosshair to the outer edge of
  each quadrant: trait scores cluster near the midpoint, so centre-hugging
  labels collided with the person dots exactly when the chart was busiest.

## Build / cache

`build-single.js`: added `scoring-v6.js` and `report-v6.js` after the v5
layer; added `interactionStyle`, `renderReportV6`, `STYLE_MIN_CLARITY` to the
required-marker self-check; bumped the expected cache name to `matchwise-v6`.

`sw.js`: `CACHE` → `"matchwise-v6"`, both new files added to `ASSETS`.

All v6 top-level identifiers were checked against every other bundled file
for collisions before shipping — `build-single.js` flattens all modules into
one shared scope, so a duplicate top-level name is a silent runtime bug
rather than a build error. (Check column-0 declarations only; indented
function-scoped names are not collisions.)

## Sources

- 123test, *Concurrent validation study: DISC vs. Big Five* (n > 9,000).
- *Comparing Correlations Between Four-Quadrant and Five-Factor Personality
  Assessments*, ERIC EJ1054970 (n = 89).
- Everything DiSC, *The Science Behind Everything DiSC* — trademark
  ownership and the vendor's own reliability figures (α .79–.90, test-retest
  .85–.88 over two weeks, n = 752).
