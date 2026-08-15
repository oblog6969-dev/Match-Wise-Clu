# MatchWise v7 — Type Preferences

Additive layer over v6. New files only: `js/scoring-v7.js`, `js/report-v7.js`.
No earlier scoring or report module was edited. Wiring changes are the same
additive edits every version since v3 has made: `index.html` (none needed —
it loads `js/app.js` as a module), `style.css`, `js/app.js`, `build-single.js`,
`sw.js` (CACHE → `matchwise-v7`), `README.md`.

## What the user asked for, and what shipped

> "add person MBTI type to the report"
> "in the report show a visualization of most and least compatible MBTI to
> his/her type. in couple comparison report generate a visualization of how
> close or far they are"

Shipped as a **Type Preferences** card in both the solo and couple reports,
containing four sliders, a gated four-letter code, a sixteen-type map, a
labelled pairing chart, and a couple distance strip.

## Why it is not called the MBTI

Same reasoning as v6 and DiSC. The Myers-Briggs Type Indicator® and MBTI® are
registered trademarks of The Myers-Briggs Company and the items are
proprietary. This app cannot reproduce the instrument or score against its
norms. The underlying idea — Jung's (1921) psychological types and the
four-letter shorthand built on it — is old and freely discussed; the branded
product is not what this is.

A load-time guardrail in `report-v7.js` throws if `myers-briggs`, `mbti`,
`type indicator`, `16personalities`, `official type` or `certified
practitioner` appears in any user-facing string.

## The direct conflict with the v6 decision, and how it was resolved

`v6-interaction-style.md` records: *"The project already rejects MBTI-style
typing on reliability grounds; a forced 4-letter type would contradict that."*
That was raised with the user before any code was written. The user chose to
keep the v6 pattern rather than force a type, so v7 is **dimensional first**:
the four sliders are the result, the letters are a summary of them, and a
letter is only named when the score is clear of the midpoint.

## The mapping — no new questions

Four of the five Big Five factors map onto the four dimensions well enough to
re-project. McCrae & Costa (1989), *Reinterpreting the Myers-Briggs Type
Indicator from the perspective of the five-factor model of personality*,
J. Personality 57(1), N = 267, each continuous scale scored toward its second
pole:

| dimension (toward) | Big Five correlate | r    | strength |
|--------------------|--------------------|------|----------|
| E–I (toward I)     | Extraversion       | −.74 | strong   |
| S–N (toward N)     | Openness           |  .72 | strong   |
| T–F (toward F)     | Agreeableness      |  .44 | moderate |
| J–P (toward P)     | Conscientiousness  | −.49 | moderate |

So `E/I = Extraversion`, `S/N = Openness`, `T/F = Agreeableness`,
`J/P = Conscientiousness`, all on the app's existing 0–100 scales.

## The finding that had to reach the UI (`MISSING_NOTE`)

**Neuroticism has no counterpart in the four-letter model at all.** This is the
v7 equivalent of v6's `CLASH_NOTE`, and it matters more. In couples research,
Neuroticism is the single most consistent personality predictor of
relationship satisfaction and stability (Karney & Bradbury, 1995, meta-analysis
of 115 longitudinal studies). So the four letters are silent on precisely the
trait with the best evidence for the question this app exists to answer. A user
reading their type as a compatibility summary would be reading past exactly the
wrong gap. A guardrail throws if that note loses its evidence.

## Honesty constraints — do not undo

- **`TYPE_MIN_CLARITY = 8`** — matches `STYLE_MIN_CLARITY` deliberately; the two
  cards sit in the same report and must not apply different confidence
  standards to the same trait scores. Within 8 points of the midpoint a letter
  renders as `X`, not a guess. Justified by the same study finding the four
  dimensions are continuously and roughly normally distributed, not bimodal —
  the cut at the midpoint is imposed by the scoring, not found in the data,
  which is also why about half of people flip at least one letter on a
  five-week retest (Howes & Carskadon, 1979).
- **Per-dimension sufficiency**, but **no partial code**. A dimension whose
  source trait is under-answered is omitted; the four-letter code requires all
  four, because a code with a hole reads as a type and a partial type is an
  invented one.
- **No pairing score.** `compareTypes` returns description only. Nothing in
  this layer reads or writes the Alignment Index, confidence, or deal-breaker
  capping. Verified: index = 55 before and after, both languages.

## The two visualisations

The user's follow-up asked for compatibility visualisations, which partly
reverses the earlier "descriptive only" choice. Resolved by keeping the
**measured** and the **folk** answers in separate blocks that never share a
heading, so the second cannot borrow the credibility of the first.

1. **Type map (measured).** All sixteen types shaded by distance from the
   person's four scores. Each type is a corner of the space the app already
   scores, so this is arithmetic on numbers already in the report. Answers
   *which types resemble me*, explicitly not *who suits me*.
2. **Pairing chart (proposal, labelled).** Keirsey & Bates, *Please Understand
   Me* (1978): share S/N, differ on E/I and J/P. Nearly every "best match"
   chart online descends from it. Shown with its provenance **and** the fact
   that it did not hold up — type-pairing has not produced a dependable effect
   against couple satisfaction, and the US National Research Council's 1991
   review did not support this use. Guardrails require both dates to survive,
   in both languages.
3. **Couple distance strip (measured).** Average distance across the four
   dimensions plus a per-dimension gap bar. Labelled as description, not a
   grade, with neither end marked as the good end.

## Bugs found during QA that are worth remembering

1. **The guardrail alternation bug — the important one.** The caveat checks were
   first written as one regex per rule, `/english|arabic/`. That passes as long
   as *either* translation still carries the evidence, so the single most
   likely degradation (rewrite the English copy, leave the Arabic) sailed
   straight through. Mutation testing caught it: 5 of 7 guardrails were silent.
   Rewritten as a `bothLangs()` helper asserting each language separately —
   19/19 now fire. **Any future guardrail in this codebase must check both
   languages independently.**
2. **A mutation suite does not prove the shipped file is clean.** After fixing
   the above, the suite showed 18/18 firing while the real `report-v7.js` was
   throwing on load: an Arabic regex demanded `غير محسوم` but the copy inflected
   it as `غير المحسوم`. Mutation tests only prove guardrails *fire*; nothing
   asserted the unmutated file *loads*. That assertion is now the first case in
   the suite. (Arabic regexes must allow the definite article.)
3. **Shading designed for the full range, used on clustered data.** Trait
   scores cluster near the midpoint, so real distances to the sixteen centroids
   occupy a band ~20 points wide. Mapped onto an absolute 0–100 ramp, all
   sixteen cells rendered the same shade and the map carried no information.
   Fixed by stretching the ramp to the observed min/max. Same family of mistake
   as v6's quadrant labels hugging the centre.
4. **Averaging distances is degenerate for opposite partners.** For any type,
   distance-to-A plus distance-to-B is constant when A and B sit on opposite
   sides, so an opposite-leaning couple got an identical shade in all sixteen
   cells. Switched to `min(dA, dB)` — "is this type near *either* of you" —
   which stays informative for exactly the couples the averaged version failed
   on. A `flat` guard now suppresses the Near/Far legend when the data really
   is equidistant, rather than manufacturing contrast.
5. **Null-returning helpers that render nothing.** `t.code` may legitimately
   contain `X`, but `"INXX"` is not one of the sixteen cells, so passing it as
   a map mark silently highlighted nothing — no error, just a missing outline.
   Likewise `keirseyMatches()` returns null for any `X` code, which made the
   whole "best match" block vanish with no explanation for a user who came
   specifically to see it. Both now render an explicit note saying why.
6. **"Every preference that could be compared" was misleading.** On the demo
   pair only one dimension was clear on both sides, so the sentence read as
   "opposite on all four" when it rested on a single letter. Wording now states
   the denominator.

## Layout notes

This card uses **no SVG** — the sliders are the existing `.axis4-track` (logical
properties, mirrors itself) and the type map is a CSS grid. That sidesteps the
entire `text-anchor`/`direction` class of bug documented in the v5 round. The
one thing that must *not* mirror is the four-letter code, which reuses
`.code-display` (already pinned to `direction:ltr` under `[dir="rtl"]`); the
grid pins `direction:ltr` for the same reason.

## Verification performed

- 30 scoring assertions (mapping signs, clarity gating at the boundary,
  per-dimension sufficiency, distance bounds and symmetry, Keirsey rule shape).
- 14 rendered-HTML assertions per language (code display, chip counts, chart
  provenance, absent-chart and unmarked-square notes, map contrast, flat-data
  handling).
- 19-case guardrail mutation suite, per language, plus a clean-load assertion.
- Top-level name-collision scan across the flattened bundle (`build-single.js`
  shares one scope — see the v5 gotcha).
- Headless Chromium, 390×900, both languages: element containment via
  `getBoundingClientRect`, pairwise cell-overlap check, page overflow, computed
  `direction`, zero console/page errors.
- Side-by-side against a pristine v6 build: Alignment Index 55 → 55, radial
  index, alert count and full card list identical in both languages.

## Explicitly out of scope

- Any type-pair compatibility number feeding the Alignment Index.
- Renaming the card to the branded instrument.
- Asking new questions — v7 adds none.
