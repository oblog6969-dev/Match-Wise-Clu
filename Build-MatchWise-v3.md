# MatchWise v3 — Credibility Upgrade Spec

**Status:** build-ready plan. Nothing in this file has been implemented yet.
**Constraint:** additive and non-breaking. v2 profiles (`version: 2`, share code `v: 2`) must keep loading and keep producing a v2-style report.
**Scope chosen:** *Reframe, keep engine.* Keep the existing similarity/tolerance/complementarity engine, demote it in the UI, and add evidence-backed modules around it.

---

## Part 1 — What the research actually says

Each claim below was checked against published sources before being written into this plan. Verdict column says whether the original critique survived.

| Claim from the review | Verdict | Evidence |
|---|---|---|
| 1 item per Big Five trait is too few | **Confirmed** | The BFI-2-XS uses 3 items per domain and still only reaches α ≈ .51–.72 (avg .61–.63). One item per domain cannot be reported as a trait score. |
| No reliability statistic is reported | **Confirmed, with a correction** | Cronbach's α ≥ .70 is a Nunnally *convention*, not a rule, and α understates reliability for scales under ~10 items. Report **McDonald's ω**, not α. |
| Fixed question order biases answers | **Confirmed** | Items presented later show lower variance and higher measurement error; earlier items act as a comparison anchor (priming). Randomization spreads the error instead of concentrating it. |
| Self-report has no faking detection | **Confirmed** | 6 consistency pairs out of 47 is thin. Validated option: **BIDR-16** (Impression Management α = .81, Self-Deceptive Enhancement α = .70). Note: Marlowe–Crowne outperforms BIDR-IM specifically at catching deliberate fakers. |
| Attachment style is missing | **Confirmed — highest-value gap** | Attachment avoidance and attachment anxiety are 2 of the top 5 individual-difference predictors of relationship quality across 43 longitudinal datasets (n = 11,196 couples). **ECR-S**, 12 items, α .77–.86 (anxiety) and .78–.88 (avoidance), 1-month retest .80/.83. |
| Sexual compatibility is missing | **Confirmed** | Sexual satisfaction is a top-5 *relationship-specific* predictor in the same PNAS study. |
| Money coverage is shallow | **Partly** | The topic is present but the wrong variable is measured. What predicts divorce is **frequency of financial disagreement**, not saving style — the strongest disagreement type of all; frequent money arguers were up to 69% more likely to divorce. |
| Division of labour / gender roles missing | **Confirmed** | *Perceived fairness* predicts satisfaction better than actual equality does, and felt appreciation buffers an unequal split. |
| Weights and thresholds are arbitrary | **Confirmed** | `w: 1–3`, the 0.55 topic cutoff and the `65 − (n−1)×10` deal-breaker cap have no empirical basis and must be labelled as editorial. |

### The finding that changes the product

**Actual similarity does not predict satisfaction in established relationships.** Montoya, Horton & Kirchner's meta-analysis (460 effect sizes, 313 studies) found actual similarity matters at zero acquaintance and short interactions, but the effect in *existing* relationships was not significant; personality similarity among married couples is unrelated to satisfaction. *Perceived* similarity, by contrast, does predict.

Independently, Joel et al. found that a person's own relationship-specific judgments — perceived-partner commitment, appreciation, sexual satisfaction, perceived-partner satisfaction, conflict — explained ~45% of satisfaction, while personality and traits added essentially nothing.

**Implication for MatchWise:** the current headline index is built mostly on `mt:"sim"` matching, which the literature does not support as a predictor. This does not make the tool useless — it makes it a *difference map*, not a compatibility prediction. v3 must say that plainly instead of implying prediction.

### One claim to drop

Do **not** cite Gottman's "90%+ divorce prediction accuracy" anywhere in the app or docs. Those equations were fitted post-hoc on couples whose outcomes were already known and were criticised for lacking cross-validation (Heyman & Smith Slep, 2001); on fresh data the positive predictive value fell to about 21%. The Four Horsemen remain a useful clinical vocabulary — the accuracy number is not defensible.

---

## Part 2 — What to build

### 2.1 New modules (new questions)

Add **28 items** in a new file. Do not edit `js/questions.js`.

**A. Attachment — 12 items, ECR-S-style (`cat:"attachment"`)**
Two subscales, 6 items each: anxiety (`sub:"anx"`), avoidance (`sub:"avo"`). Scored as **profile traits**, not as pair-similarity — set `mt:"info"` for the pair engine and compute subscale means separately. Write original items in the ECR-S *style*; do not paste the copyrighted item text. Both EN and AR, and the AR wording must be reviewed by a native speaker before release.

**B. Big Five top-up — 10 items (`cat:"personality"`)**
Bring each domain to 3 items (currently 1). Follow the BFI-2-XS structure: one positively and one negatively keyed item added per domain, `mt:"info"` for pairing, used only for the trait profile.

**C. Sexual & physical intimacy — 3 items (`cat:"intimacy"`)**
Importance of physical affection, comfort discussing intimacy openly, expectation alignment. Gate behind an explicit *"include intimacy questions?"* toggle, default **on for married/engaged**, skippable without penalty. Culturally sensitive phrasing required for the Arabic build.

**D. Rewrite, don't add — money (`m5`, replaces emphasis of `m1`)**
Add one item: *"How often do you expect money to be a source of disagreement?"* — frequency of financial disagreement is the variable with evidence behind it.

**E. Fairness & division of labour — 2 items (`cat:"fairness"`)**
Expected split of home/childcare work, and *perceived fairness* of that split. Score fairness on similarity; score the split itself on tolerance.

**F. Appreciation — reuse `g5`**
Move `g5` ("I notice and thank my partner for small things") out of *growth* into a first-class **Appreciation** category and raise its weight to 3. Appreciation is a top-5 predictor and is currently buried.

### 2.2 Response-quality layer

- **BIDR-style impression-management check — 4 items**, `mt:"info"`, e.g. "I have never been irritated by someone close to me." Extreme-virtuous responding lowers **confidence only**, never the score. Cap the deduction at −15.
- **Consistency pairs: raise from 6 to 12.** Each of the 12 categories gets at least one pair.
- **Randomize order within each category block**, seeded by profile id so a re-opened session keeps the same order. Keep category blocks in their current sequence — full randomization would break the narrative flow, and some items only make sense in context.
- **Attention check — 1 item** ("Select 'Agree' for this item"). Failing it flags the profile, does not void it.

### 2.3 Scoring changes (`js/scoring-v3.js`, new file)

1. **Reliability reporting.** Compute **McDonald's ω** per multi-item subscale from the user's own responses where the subscale has ≥ 3 items; show it in the report's methodology panel. Where ω cannot be computed on a single profile, ship the ω obtained from the calibration sample (Part 3) as a static figure and label it as such.
2. **Suppress under-measured scores.** Any Big Five domain or subscale with fewer than 3 answered items renders as "not enough data", never as a number. This alone removes the biggest current credibility hole.
3. **Separate the two outputs.**
   - *Alignment Map* (the existing engine, renamed) — where the two of you differ, by category.
   - *Individual Risk & Strength profile* — attachment anxiety/avoidance, appreciation, conflict style, financial-disagreement expectation. These are reported **per person**, not as a couple score, because that is how the evidence supports them.
4. **Headline number.** Keep it, rename it from "compatibility" to **"Alignment Index"**, and put the confidence figure and a one-line "this is not a prediction" note directly beside it, not in a footnote.
5. **Weights stay as they are** but the methodology panel must state they are editorial judgments, not empirically derived.
6. Deal-breaker cap logic is unchanged.

### 2.4 Report and copy changes (`js/report-v3.js`)

- New **Methodology & Limits** section, collapsible, containing: item counts per scale, ω where available, which scales are adapted from published instruments, the weighting disclaimer, and the similarity caveat in one plain sentence — *"Being similar to your partner does not, by itself, predict a happy relationship. This report maps where you differ so you can talk about it."*
- Show attachment as a 2-axis plot (anxiety × avoidance) per person.
- "Topics to Discuss" is promoted above the number.
- Response-quality banner when the impression-management or attention flags fire.

### 2.5 Compatibility and file layout

| File | Action |
|---|---|
| `js/questions.js` | untouched |
| `js/scoring.js` | untouched |
| `js/report.js` | untouched |
| `js/questions-v3.js` | **new** — exports `QUESTIONS_V3` (v2 bank + new items) |
| `js/scoring-v3.js` | **new** — imports v2 functions, adds ω, subscales, suppression |
| `js/report-v3.js` | **new** — extends the v2 renderer |
| `js/app.js` | **edit** — version routing only |

Version routing rules:

- Share code / profile JSON gets `v: 3` / `version: 3`.
- Loading a `v: 2` profile → runs the v2 engine, renders the v2 report, and shows a "taken with the earlier version" note. **No silent re-scoring.**
- Comparing a v2 profile against a v3 profile → score the intersection only, drop confidence by 10, and say so on screen.
- Bump the `sw.js` cache version and rerun `node build-single.js`.

---

## Part 3 — Making the numbers real (optional phase 2)

Everything above improves *transparency*. Only data improves *validity*.

1. Ship an anonymous, opt-in, off-by-default calibration upload to the existing Supabase project: answers + a 4-item relationship-satisfaction outcome, no names, no share codes.
2. At n ≈ 300 profiles, compute ω per subscale and replace the static figures.
3. At n ≈ 300 couples with outcomes, re-derive weights by regression instead of judgment, and check whether the Alignment Index correlates with satisfaction at all. If it does not, say so in the app.
4. Until step 3 lands, the README's existing limitation paragraph stays — and gets stronger, not weaker.

---

## Part 4 — Build order

1. `questions-v3.js` — 28 new items, EN + AR, with an Arabic language review pass.
2. `scoring-v3.js` — subscales, ω, suppression rule, impression-management penalty.
3. `app.js` version routing + the intimacy-module toggle.
4. `report-v3.js` — methodology panel, attachment plot, reordered layout.
5. Rebuild `MatchWise-preview.html`, bump `sw.js`.
6. **Verification pass:** load a saved v2 `.json` and confirm the old report renders unchanged; confirm a v2 × v3 comparison degrades gracefully; confirm no Big Five number appears for a domain with < 3 answers; confirm ω math against a hand-worked example.

---

## Sources

- [Joel et al., *PNAS* 2020 — machine learning across 43 longitudinal couples studies](https://www.pnas.org/doi/10.1073/pnas.1917036117)
- [Montoya, Horton & Kirchner, 2008 — actual vs. perceived similarity meta-analysis](https://journals.sagepub.com/doi/10.1177/0265407508096700)
- [Wei et al., 2007 — ECR-Short Form: reliability, validity, factor structure](https://pubmed.ncbi.nlm.nih.gov/17437384/)
- [Soto & John, 2017 — BFI-2-S and BFI-2-XS short forms](https://www.researchgate.net/publication/314015515_Short_and_extra-short_forms_of_the_Big_Five_Inventory-2_The_BFI-2-S_and_BFI-2-XS)
- [Hart, Ritchie, Hepper & Gebauer, 2015 — BIDR-16](https://journals.sagepub.com/doi/10.1177/2158244015621113)
- [McNeish — "Thanks Coefficient Alpha, We'll Take It From Here", *Psychological Methods*](https://rameliaz.github.io/files/kuliah/matrikulasi-mapsi/mcneish.pdf)
- [Item order effects on psychometric properties, *Frontiers in Psychology* 2021](https://www.frontiersin.org/articles/10.3389/fpsyg.2021.590545/full)
- [Dew, Britt & Huston, 2012 — financial issues and divorce, *Family Relations*](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1741-3729.2012.00715.x)
- [Gordon et al., 2022 — appreciation buffers unequal division of labour, *Psychological Science*](https://sites.lsa.umich.edu/whirl/wp-content/uploads/sites/792/2022/02/Gordon-et-al.-2022-Psych-Science.pdf)
- [Perceived fairness in housework and shared expenses, *PLOS One* 2019](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0214204)
- [Heyman & Smith Slep critique of Gottman's divorce prediction — summarised](https://www.scienceabc.com/social-science/the-gottman-method-can-you-actually-predict-divorce)
