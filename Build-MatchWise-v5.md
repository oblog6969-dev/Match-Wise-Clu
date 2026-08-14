# MatchWise v5 — build spec

Additive layer over v4. Nothing in `questions.js`, `scoring.js`, `report.js`,
`*-v3.js` or `*-v4.js` was edited. New files only: `js/scoring-v5.js`,
`js/report-v5.js`, `js/demo-v5.js`, `js/crypto-v5.js`.

## Why this version exists

The user had previously built a second, independent MatchWise prototype with
a different agent and liked several things about its product shape: a
one-click way to see a full sample report, a plain-language summary at the
top of the report, a closing recommendations section, and a landing page
that explains the flow before asking for 45+ answers. This spec ports the
product ideas worth keeping, in this app's own idiom, without touching the
scoring engine, the evidence-based question design, or any of the
guardrails v2–v4 already established (no MBTI, no named ideology, no
deal-breaker softening, no confidence inflation).

Two things reviewed from that prototype were deliberately **not** ported:

- **MBTI 4-letter types.** Poor test-retest reliability; the existing
  README already avoids trait-typing for exactly this reason.
- **A "complementarity" function that was actually softened similarity.**
  Rewards small differences, penalises large ones, same as `similarity()`
  with a gentler curve — not a different construct. This app's actual
  complementarity model (`MODEL` rule types) already does the real thing.

Also found and avoided: raw internal category keys leaking into
user-facing report text, cross-axis label/value mismatches in a topics
section, and giant unstyled icon glyphs on the landing page.

## 1. Growth Opportunities (`js/scoring-v5.js`)

`compareV4()`'s `challenges` field flags categories where the couple
**disagrees** (the category score is low). It cannot flag a category where
both people **agree while both leaning the same low way** — two avoidant
communicators score *well* on communication similarity while sharing a real
growth area neither of them will raise unprompted.

`growthOpportunities(res)` reads `res.catLean.a` / `res.catLean.b` (each
person's own lean, already computed by `compareV4()` for the dual radar) and
returns categories where both sit below 45/100. Never touches `res.index`,
`res.confidence`, or any deal-breaker field — presentation logic over
numbers v4 already produced, nothing new measured.

## 2. Recommendations (`js/scoring-v5.js`)

`recommendations(res)` returns up to 5 `{type, cat}` entries: the single
weakest-agreement category, the single strongest shared growth area, then
up to three strengths — pulled only from fields `compareV4()` already
returns. `report-v5.js` supplies the bilingual sentence per type. No new
scoring, no new weight.

## 3. "In short" (`js/report-v5.js`)

One paragraph, placed immediately after the headline ring gauge, translating
the index, confidence, top-2 and bottom-2 categories into a sentence before
any chart. If deal-breaker alerts exist, the paragraph ends by pointing back
to them. Couple report only — a solo profile has no "the two of you" story
to tell.

## 4. Demo profiles (`js/demo-v5.js`)

Two profiles, generated **live** from the current `buildBankV4()` bank with
a small seeded PRNG (`mulberry32`) rather than hand-authored — a hand-typed
84-question demo answer set would silently drift out of sync the next time
a question is added, edited or removed. Reproducible (same seed → same
answers every load), not random per click.

Every demo profile carries `demo: true`. The UI enforces:
- a visible "Demo" tag in the profile list (`style.css` `.demo-badge`),
- no download button in the list row, and
- the solo preview's download button hidden when previewing a demo profile.

Demo profiles never call `saveProfile()` / hit Supabase — they only ever
exist in `localStorage`, so there is no share-code or network path for
sample data to leak through.

## 5. Encrypted export — opt-in (`js/crypto-v5.js`)

AES-GCM-256 via WebCrypto, key derived once per device and stored in
`localStorage` (`mw_device_key_v5`) — no passphrase UI. Same no-passphrase
design already documented for the prototype this was reviewed against:
files decrypt automatically on the *same* browser/device, and are opaque
elsewhere. That is the intended boundary — this protects a file sitting in
email or a cloud drive, it is not a portable password.

**Deliberately opt-in, off by default**, via a checkbox on the home screen
(`#encryptExportsCheck`, `localStorage.mw_encrypt_exports`). Every `.json`
this app has ever exported is plain, human-readable JSON, and something
outside the app may already parse those files. Turning encryption on by
default would silently change that contract without asking. Import
auto-detects the `MWENC1:` prefix and decrypts transparently; a legacy
plain file, or a plain file exported with the toggle off, imports exactly
as it always has. A file encrypted on a different device produces a
specific "can't be opened here" message (`fileWrongDevice`) rather than the
generic "not a valid profile" error.

## 6. Landing page "How it works" + copy

Four numbered rows (`.hiw-list` / `.hiw-num` in `style.css`), plain text and
a small circle, not an icon graphic — an oversized unstyled icon glyph was
one of the concrete problems found reviewing the other build's landing
page. Bilingual strings live in `js/i18n.js` (`howTitle`, `how1Title` …
`how4Desc`) alongside every other UI string, through the same `t()` /
`data-i18n` mechanism the rest of the app uses — no new i18n pathway.

## Explicitly out of scope for v5

**Question bank as JSON instead of `js/questions-v4.js`.** The prototype
this was reviewed against needed `questions.json` + a bundling step because
its `index.html` runs via `fetch()`, which fails on `file://` without a
pre-generated fallback bundle. This app already solved that problem
differently: `build-single.js` inlines every module into one script, so
there is no `fetch()` to fail and no `file://` constraint to work around.
Converting ~105KB of question objects (which carry live logic — gender/stage
resolution, axis loads, weights, `rv` flags — not just text) to a
data-only JSON format would be a substantial, purely mechanical rewrite for
a problem this codebase does not have. Skipped; flagged here rather than
silently dropped.

## Build / cache

`build-single.js`: added `scoring-v5.js`, `demo-v5.js`, `crypto-v5.js`,
`report-v5.js` to the bundle in dependency order (after the v4 layer,
before `app.js`); added `growthOpportunities`, `renderReportV5`,
`buildDemoProfiles`, `demoBtn`, `MWENC1`, `encryptExportsCheck` to the
required-marker self-check; bumped the expected `sw.js` cache-name check to
`matchwise-v5`.

`sw.js`: `CACHE` bumped to `"matchwise-v5"`; the three new `js/` files added
to `ASSETS`.

Every top-level identifier across the v5 files was checked against every
existing bundled file for name collisions before shipping — `build-single.js`
flattens every module into one script scope, so a repeated top-level `const`
name (this build hit one: `catNameFor`, renamed `catNameForV5`) is a silent
runtime bug, not a build error.
