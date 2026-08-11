# Build MatchWise v4 — Situational, Gendered, Worldview-Aware

Status: **built, Arabic reviewed, audited.** Everything in Part 5 is done except step 11 (deploy + phone smoke test), which needs the repo owner.
v4 is an *additive* layer, exactly like v3. `questions.js`, `scoring.js`, `report.js` and the v3 files are **not modified**. New files only: `js/questions-v4.js`, `js/scoring-v4.js`, `js/report-v4.js`.

---

## Part 0 — What the research says

### 0.1 Situational questions really are better (claim 1 holds)

- SJTs (situational judgment tests) are **more resistant to faking and social desirability** than Likert or true/false self-report items. When people try to look good, SJT scores move much less.
- The ability to fake an SJT tracks only with cognitive ability; faking a Likert scale is easier and driven by many traits.
- **Honest caveat:** in the same studies, the higher faking-resistance did **not** produce higher criterion validity than plain single-statement items. So the gain is *lower faking + better engagement*, not proven better prediction. The README's "Limitations" section must say this.
- Practical note for us: SJTs measure the *interaction* of trait and situation. That fits MatchWise better than trait scores do, because relationships are situational.

### 0.2 What actually breaks marriages in Saudi Arabia (drives content)

Recurring causes in the literature: financial instability, unemployment and debt; failure to meet role expectations; **parental / in-law interference**; emotional disengagement ("emotional divorce"); infidelity; temperament mismatch; and **shifting gender-role expectations** — women with education and income are less willing to stay in an unfulfilling marriage, while men are still measured against the provider role. Social media adds a newer strain: unrealistic comparison and outside relational networks.

These map to six scenario themes that v4 must cover heavily:
1. Money and debt under pressure
2. In-laws and family authority
3. Provider vs. dual-income expectations
4. Emotional availability and repair
5. Phones, privacy and outside contact
6. Career/mobility vs. home duties

### 0.3 Asking unmarried people about married life (drives the stage layer)

The audience is mostly people deciding *whether* to marry, and the bank is full of married-life
situations. The worry is that a single person answers those with noise.

The evidence says otherwise, and clearly:

- **PREPARE**, the standard premarital inventory, asks not-yet-married couples exactly these
  hypotheticals and **predicts marital satisfaction at 80–85% accuracy** across two three-year
  longitudinal studies of couples assessed three months before marrying. If imagined answers
  were noise, that number would be impossible.
- So the item is not broken. For a married person it reports *behaviour*; for an unmarried
  person it reports an *expectation*. Expectation mismatch is precisely what this app exists to
  surface — it is the thing that collides later.
- **Therefore: no confidence deduction for answering prospectively.** Treating an expectation as
  second-class data would contradict the only outcome evidence available on this question.

What *is* standard practice is versioning by stage. PREPARE/ENRICH ships five: PREPARE
(premarital), PREPARE-CC (cohabiting), PREPARE-MC (marriage with children), ENRICH (married),
MATE (55+), each validated separately.

MatchWise takes the light version of that: **one bank, two wording registers.** A separate bank
per stage would make two people at different stages incomparable, which breaks the app's core
use case.

### 0.4 The Saudi worldview landscape (drives the ideology axes)

- Youth are **not** on a simple traditional↔modern line. 68% of young Saudis say men and women have equal rights and 96% welcome women in the workforce — while **69% say religion is the most important part of their identity** and **82% put preserving religious/cultural identity above a globalised society**. Support for reform and attachment to tradition coexist in the *same* person.
- Female labour participation rose 19.7% (2018) → 36.3% (Q1 2025). Reality moved fast; expectations inside couples did not move at the same speed. That gap is exactly what MatchWise should surface.
- Named camps ("liberal", "Sahwa/Islamist", the newer state-aligned nationalism, "Islamo-liberal" reformists) are **contested, politically loaded, and often self-denied**. A user will reject a label but will happily answer a scenario.

**Conclusion:** measure *axes*, never *camps*. Do not print the words feminist, liberal, Islamist, secular, capitalist anywhere in the app.

---

## Part 2b — Relationship stage

### Why it exists

The v4 gendered rewrites introduced "your wife" / "your husband" into 26 stems and 7 options,
where v3 had said "your partner". For the app's main audience — not yet married — that
presupposes a marriage that does not exist. Two further items assumed a child already existed.
That was a regression, and the stage layer fixes it.

### Design

- Captured on the first screen, beside gender: **Not married yet · Married · Married before**.
- Two registers only. `pre` and `was` both read **prospective**; `mar` reads **present**.
  A profile with no stage recorded gets the present register — the wording those people saw.
- Delivered by `PROSPECTIVE`, a map keyed `id|genderVariant`, applied on top of the
  gender-resolved item. Option overrides are keyed **by score value, not index**, so
  reordering options can never silently rewrite the wrong one.
- Stage is stated once, in the intro line, so no stem repeats "imagine you are married".
- Stored as `answers.__s`, the same trick `__g` uses, so it travels through share codes and
  `.json` backups with no schema change.

### The guarantee

Stage changes wording only. A self-check at load compares the two registers item by item and
throws if the count, the order, the option score values, or the axis loads differ. Verified:
identical answer patterns produce an identical index, identical confidence and identical
worldview axes across `mar`, `pre` and mixed pairs.

### The report

One neutral line when the two answered from different places, or when both answered
prospectively. No caveat, no deduction — see §0.3.

---

## Part 1 — Question format: situational (hybrid)

### 1.1 What converts, what stays

| Block | Items | v4 treatment |
|---|---|---|
| Communication, Conflict, Money, Lifestyle, Family & Children, Values, Career, Trust, Emotional Needs, Adaptability, Appreciation, Future, Fairness | ~55 | **Convert to scenarios** |
| Big Five top-ups (`p*`, v3 BFI-style) | 15 | **Stay Likert.** They are copies of a validated structure; scenario-izing them breaks the link the README claims. |
| Attachment (`an*`, `av*`, ECR-S style) | 12 | **Stay Likert.** Same reason. |
| Quality items (impression mgmt, attention) | 5 | **Stay as-is.** They only work as absolute statements. |
| Intimacy module | 3 | Convert to scenarios, keep opt-in. |

**As built: 44 situational, 40 Likert, 84 items total.** The 40 remaining Likert items are exactly the ones that had to stay: 15 Big Five, 12 attachment, 5 response-quality, and 8 dispositional or reverse-scored twins (`c4`, `k4`, `m4`, `l2`, `t4`, `g4`, `g6`, `fa2`). The reverse-scored twins stay statements on purpose — a consistency pair works by asking the same trait twice in deliberately mirrored wording, and a scenario cannot mirror a statement.

### 1.2 Item template

Every converted item becomes:

```
stem  : one or two sentences, concrete, present tense, second person.
        Names a place, a person, a number where possible.
opts  : 4 reactions, each mapped to v: 1–7 as today.
```

Rules:
- **No option may be obviously "the right answer."** Every option must be something a reasonable person would defend out loud. This is what kills faking.
- Same length per option (±6 words). Length is a giveaway.
- No moralising verbs ("I would selfishly…"). Never label the behaviour inside the option.
- Scenarios stay **local but not stereotyped**: a family gathering, a salary that arrives on the 27th, a relative asking about children, a work trip. No brand names, no tribe/region markers.
- Arabic is written natively — **not translated from English**. A translated scenario reads foreign and breaks immersion. Flag every Arabic string for native review before release, same as v3 did.

### 1.3 IDs and backward compatibility

Converted items **keep their existing id** (`m3` stays `m3`) and their `mt`/`w`/`db`/`pair` metadata. Only `type`, `en`, `ar`, `opts` change, delivered through a `REWRITES_V4` map that `questions-v4.js` applies over the v2/v3 bank.

Consequence: **a v2 or v3 profile still scores against a v4 profile on the same ids.** The answer value 1–7 keeps the same meaning. This is the single most important constraint — do not renumber anything.

New v4-only items get `v4:true` and fresh ids.

---

## Part 2 — Gender branch

### 2.1 Structure: shared core + gendered wing

- A `gender: "m" | "f"` field is captured on the "Who is taking the assessment?" screen, next to the name. A third choice, **"prefer not to say"**, serves the shared core only.
- ~80% of items are identical for both. **18 items** are authored twice — `c3 k2 m3 l1 f1 f2 f3 r3 t1 t2 g1 g2 u3 fa1 n1 n2 n3 n4` — one male version, one female version, sharing an id and scored identically.
- Field: `gv: { m: {...}, f: {...} }` on the item. If `gender` is missing (all existing profiles), the shared/neutral version is used. Nothing breaks.

### 2.2 The 18 gendered items (themes, derived from 0.2)

**Male wing** — provider load and its failure modes: income drop or job loss; debt kept private; her salary being higher; her family's expectations of him; being asked to choose between his mother and his wife; time with friends vs. home; being expected to absorb stress without showing it; his role in childcare beyond play.

**Female wing** — autonomy and load: career timing vs. children; travel or a job in another city; who controls her own income; in-law involvement in the household; being the default parent; asking for help vs. doing it herself; how much of her social life survives marriage; what happens to her studies.

**Both wings ask the same underlying question.** Example pair:

- *(m)* "Your income drops for six months. Your wife offers to cover the rent from her salary until it recovers. You…"
- *(f)* "Your husband's income drops for six months. You can cover the rent from your salary until it recovers. You…"

Same construct, same scoring, same id, opposite chairs. That is what keeps cross-gender scoring valid.

### 2.3 Scoring effect

None on the engine. Same id, same `v` scale, same `mt`. The wing only changes *whose shoes* the person is in, which raises answer honesty. Report shows the item text the person actually saw.

### 2.4 Invisibility rule (hard requirement)

The gender choice on the first screen is the **only** moment the user is aware gender matters. After that, nothing may reveal it:

- **No section, no header, no badge, no icon** marking an item as gendered.
- **No change in numbering, order, count or progress bar.** Both genders see the same total and the same position for the same id. The gendered items sit scattered through the normal flow, never grouped.
- **Wording carries no meta-signal.** Never "as a husband…", never "for women…". The scenario just happens to place the reader where they actually stand.
- **The report never says an item was gendered.** The answer list prints the exact text the person saw, with no marker, no footnote, no alternate version shown.
- **The comparison report never shows the partner's variant text** for a gendered id — it shows the aggregate result only, as it already does for imported profiles.
- Internally the field is `gv`, and no UI string in `i18n.js` may reference it.

---

## Part 3 — Worldview axes (the "ideology" feature, done quietly)

### 3.1 Four axes, no labels

| Axis | Low end | High end |
|---|---|---|
| `trad` | Tradition & continuity | Openness & change |
| `auth` | Family/collective decides | Couple decides alone |
| `econ` | Security, saving, obligation | Market, ambition, individual return |
| `role` | Distinct gender roles | Interchangeable roles |

Report names them in plain language only: e.g. **"Family authority: you lean toward deciding as a couple; your partner leans toward involving family."** No camp names. Ever.

### 3.2 The detection trick (this is the core of request #3)

Two mechanisms, used together:

**(a) Register-split options.** Inside one scenario, two options describe *almost the same behaviour* but in different vocabulary. The behaviour is neutral; the wording is the signal.

> Your wife is offered a promotion that means longer hours.
> - "I'd support it — it's her right to build her career." → `role +2` (rights register)
> - "I'd support it — as long as the house doesn't suffer." → `role −1` (duty register)
> - "I'd support it if the family agrees it's the right time." → `auth −2`
> - "I'd rather she didn't — we don't need the money." → `role −2`, `econ −1`

Every option is defensible. Nobody feels caught. The vocabulary does the work: *right / choice / partnership / independence* vs. *duty / responsibility / permission / what people will say* vs. *blessing / preserving / our upbringing*.

**(b) Distributed loading.** No item exists only to measure worldview. Each axis is loaded onto **6–8 ordinary scenarios** spread across money, family and lifestyle. Axis load is a small side-field: `ax: { role: +2 }`. The item still scores normally for compatibility. The user never encounters a "values section."

### 3.3 Scoring and reporting

- Axis score = weighted mean of loaded options, normalised to −100…+100, per person.
- **Reported only when ≥5 of the axis's items were answered.** Otherwise "not enough data" — same rule v3 uses for Big Five domains.
- Couple output per axis: distance, plus one line on *whether that distance is workable*:
  - `trad`, `econ` — **complementary-tolerant.** Difference is normal and often fine; only extreme distance is flagged.
  - `role`, `auth` — **similarity-critical.** These are the ones that predict conflict in the KSA divorce literature. A large gap here is raised as a **discussion topic with high priority**, and gets a warning line, but is **not** a deal-breaker cap. It does not silently change the headline number beyond the existing engine.
- Combination hints, phrased as questions, not verdicts: "One of you frames decisions as the couple's alone, the other as the family's — worth agreeing early on which decisions the family hears about."

### 3.4 Guardrails

- No axis is ever framed as better. Both ends get neutral, respectful wording in EN and AR.
- No political content: no state, no policy, no religion-vs-secularism framing, no Vision 2030 references.
- Religiosity itself stays where it is today — inside Values & Religion as a normal scored category, not an axis.
- Add an explicit line in the report: axes describe *how you talk about decisions*, not what you believe.

---

## Part 4 — Files and data

```
js/questions-v4.js   REWRITES_V4 (converted stems+opts), GENDERED (gv), NEW_V4 items,
                     AXIS_LOADS. Exports buildBank(gender) -> final array.
js/scoring-v4.js     axis computation, gender-aware item selection, unchanged pair engine.
js/report-v4.js      Worldview section + gendered item text in the answer list.
```

- `index.html`: one new radio group on the who-screen. `style.css`: one small block. No restructuring.
- Profile object gains `g:"m"|"f"|null`. `encodeProfile` adds `g`. **Decoding an old code without `g` must not throw** — default `null`.
- Version detection stays id-based (v4 detected by presence of any `v4:true` id or `g`).
- `sw.js`: bump `CACHE`, add the three new files to precache. `build-single.js`: add to bundle order after the v3 files. Its self-check already fails loudly if you forget.

---

## Part 5 — Execution plan, with model and effort per step

| # | Step | Output | Model | Effort | Where to run it |
|---|---|---|---|---|---|
| ✅ 1 | Approve this spec; lock the 4 axes and the 18 gendered themes | edits to this file | Opus 5 | low | here (chat) |
| ✅ 2 | Deep research pass: 10–15 sources on gendered marital expectations in KSA/Gulf + SJT item-writing rules | `research-v4.md` | Opus 5 | **high** | here (web access) |
| ✅ 3 | Write the English scenarios + options + axis loads (44 as built) | `questions-v4.js` | Opus 5 | **high** | here — the creative core |
| ✅ 4 | Write the 18 gendered pairs | same file | Opus 5 | high | here |
| ✅ 5 | Arabic authoring, then native review | same file | Opus 5 | high | **review returned and applied — 97 strings changed** |
| ✅ 6 | `scoring-v4.js` — axes, gender selection, thresholds | code | Sonnet 5 | medium | **VS Code + Claude plugin** (cheaper, sees the repo) |
| ✅ 7 | `report-v4.js` — Worldview section, i18n strings | code | Sonnet 5 | medium | VS Code plugin |
| ✅ 8 | Wire-up: index.html, style.css, sw.js CACHE bump, build-single order | code | Sonnet 5 | low | VS Code plugin |
| ✅ 9 | Regression: v2 vs v4, v3 vs v4, missing-gender profile, old share code, all-same-answer, attention-check | test notes | Sonnet 5 | medium | VS Code plugin |
| ✅ 10 | Bias/tone audit | see Part 7 below | Opus 5 | **high** | done — 5 items changed |
| 11 | Deploy + live smoke test on phone width | — | Haiku 4.5 | low | **OPEN** — needs `npx vercel --prod` from the repo owner |
| ✅ 12 | Update README (SJT caveat from 0.1, gender, worldview, limitations) | `README.md` | Sonnet 5 | medium | VS Code plugin |

**Cost note.** Steps 3–5 and 10 are where Opus earns its price — item writing and bias auditing are judgment work. Steps 6–9 and 12 are mechanical; running them in VS Code with the Claude plugin is markedly cheaper than doing them through chat, because the plugin edits files in place instead of re-sending them. Step 11 needs no reasoning at all.

**Rough size:** ~90 scenarios/options blocks × 2 languages. Expect steps 3–5 to be the bulk of the work and to run across more than one session. Author in batches of 10 items, each batch reviewed before the next.

---

## Part 6 — Risks, stated plainly

1. **Scenario rewriting can silently change what an item measures.** Mitigation: each rewrite keeps the original item text in a `was:` comment field, and step 10 checks the construct is unchanged.
2. **Longer items = more fatigue.** 90 scenarios is heavier reading than 90 statements. Mitigation: hard cap the stem at 2 lines on a phone; consider dropping the total item count to ~70 in step 3 rather than adding length on top of length.
3. **The axis feature could feel like profiling** if a user senses it. Mitigation: distributed loading, no dedicated section, neutral report language, and a plain sentence in the report saying what the axes are and are not.
4. **Arabic is the real deliverable for this audience.** A machine-flavoured Arabic scenario destroys the immersion that the whole v4 change exists to create. Native review is not optional.
5. **Still uncalibrated.** v4 improves faking-resistance and relevance. It does not make the Alignment Index predictive. The README limitation stays word for word.

---

## Sources

- Situational Judgment Tests as a method for measuring personality — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0211884
- Fake It to Make It: susceptibility of construct-laden SJTs to socially desirable responding — https://oaktrust.library.tamu.edu/items/e2792a76-2624-4b1a-a83a-819d633ee47d
- Controlling for response biases in self-report scales — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6803422/
- Robust estimation methods used to study reasons behind increasing divorce in Saudi society — https://onlinelibrary.wiley.com/doi/10.1155/2021/4027599
- Divorce trends in Hail, Saudi Arabia, and their socio-demographic correlates — https://www.researchsquare.com/article/rs-8971505/v1.pdf
- Impact of emotional divorce on the mental health of married women in Saudi Arabia — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0293285
- Arab Youth Survey — young Saudis on reform, work and identity — https://arabyouthsurvey.com/en/almost-all-young-saudis-support-private-sector-reforms-and-say-vision-2030-will-secure-a-strong-economy/
- From law to social change: behavioural effects of legal reforms in Saudi Arabia — https://www.nature.com/articles/s41599-025-06225-5
- A decade of Vision 2030: impact on the status of women — https://www.icwa.in/show_content.php?lang=1&level=1&ls_id=14073&lid=8541
- Saudi First: how hyper-nationalism is transforming Saudi Arabia (ECFR) — https://ecfr.eu/publication/saudi_first_how_hyper_nationalism_is_transforming_saudi_arabia/
- Understanding the rise of nationalism in Saudi Arabia: the decline of the Sahwa — https://www.toplum.org.tr/en/understanding-the-rise-of-nationalism-in-saudi-arabia-i-the-decline-of-the-sahwa-movement/


---

## Part 7 — Audit findings (step 10), and what was changed

The bias pass read every low-end option in all three variants, then checked mechanically
whether option length gives the answer away. Five items were changed.

**Option length is not a tell.** Across 78 scored scenarios the longest English option is the
top-scoring one 22% of the time and the bottom-scoring one 23% of the time — chance is 25%.
Within-item length spread varies, but it does not correlate with the score, so a respondent
cannot game the test by picking the longest answer.

**Fixed — options that were not honestly choosable:**

| Item | Was | Problem |
|---|---|---|
| `g5` | "You had not thought of it as something to thank someone for" | An indictment, not a position. Nobody selects it, so the item lost its low end. Now: "You show it in other ways rather than saying it." |
| `t3` | "Say a free afternoon is the one you **should** be spending together" | Told the reader what to think. Now states a preference instead. |
| `k3` | "Hold your ground — being right is the point" | Caricatured the position. Now: "the point still needs to stand." |
| `i2` | "You would not raise it at all" | Bare and bleak; a reason makes it selectable. |

**Fixed — a real gender asymmetry, and the most important finding of the audit:**

`n1` (income drops, partner can cover the rent) held the *same* traditional position for both
genders, but dignified it for him and made it passive for her:

- male: "Refuse — the rent is your responsibility, not hers" — a principle
- female: "Say nothing — the rent is his to handle" — silence

The female version now reads "Leave it to him — the rent is his responsibility, not yours."
Same stance, same standing. This is exactly the failure the audit exists to catch: an
asymmetry invisible inside a single variant, only visible when the two are read side by side.
Any future gendered item must be checked this way, both variants together.

**Not changed, deliberately:** the eight remaining Likert items. Five are the reverse-scored
twins that power the consistency checks — a contradiction check works by mirroring wording,
which a scenario cannot do, so converting them would break 5 of the 12 pairs. Two carry Big
Five trait tags. `fa2` has to stay a felt judgment ("it has to feel fair"), not a behaviour.


---

## Part 8 — Report visuals

Four sections of the v3 report are replaced with charts. `report-v3.js` is **not edited** —
`report-v4.js` takes v3's finished HTML string and swaps whole cards out of it, so a v2 or v3
profile still renders exactly as before.

| Was | Now |
|---|---|
| Headline number as text | Ring gauge, index arc + lighter confidence arc |
| Radar of couple agreement (one polygon) | Radar with one outline per person |
| Strengths list + challenges list | One sorted bar chart, coloured by band |
| Topics as plain text | Each topic with a gap bar, widest first |
| v3's category bar list | Removed — the sorted chart replaces it |

### How the swap works

`replaceCard(html, marker, newHtml)` finds the marker, walks back to the enclosing
`<div class="card`, then counts `<div>`/`</div>` depth to find that card's real end. A regex
cannot do this because cards nest divs. **If a marker is not found the original HTML is returned
untouched** — a report showing v3's old section is a far better failure than one with a hole in
it.

Markers are v3's own emoji, which are stable. The worldview card was moved from 🧭 to 🗺
because v3 already uses 🧭 for both the attachment card and the executive summary, and three
identical markers would make the anchors ambiguous.

### Data the charts needed

`compareV4()` gained two fields. Both are additive; `topics` and `catScores` keep their original
shape because `renderReportV3` still reads them and must not break.

- `catLean: {a, b}` — each person's own 0-100 lean per category. This is **not** `catScores`,
  which is the couple's agreement. The dual radar needs the first thing.
- `topicsDetail: [{q, s}]` — the same six topics with the per-item agreement score kept, so the
  gap bar has something to draw.

### Constraints these charts are built under

- **No chart library.** Offline PWA, no build step: a CDN script would break the service worker
  precache and `build-single.js`. All SVG, hand-written.
- **RTL is not automatic.** SVG does not mirror. The ring fills anticlockwise, the radar steps
  round the circle in the other direction, and the diverging chart flips its bar origin and text
  anchors, all keyed off `lang`.
- **Print.** Charts get `break-inside: avoid`. Printing also now resets the colour tokens
  themselves — the old print block reset `body` colour but not `--text`/`--muted`/`--line`, so a
  report printed from dark mode put light text and light chart strokes on white paper. That bug
  predates v4 and affected v3's charts too; it is fixed for all of them.
