# MatchWise

Private couple compatibility assessment. Mobile-friendly PWA, bilingual (English / Arabic), no backend — all answers stay on the device.

**Live:** https://matchwise-clu.vercel.app/

## Two ways to run it

Open the live URL on any phone and use "Add to Home Screen" to install it. After the first load it works offline.

Or double-click `MatchWise-preview.html` — a single self-contained file with everything inlined. No server, no install. Useful for quick review or sharing by email.

## Keeping and reloading a profile

After finishing the assessment, press **Download my profile file** to save a `.json` backup. Keep it anywhere — email, cloud drive, USB.

If you lose your phone, clear your browser, or switch devices, open the app and use **Choose file…** on the home screen to upload that `.json` back. It goes straight to your profile preview, where you can print it or save it as PDF again. Saved profiles also have **Preview** and **⤓** buttons for the same thing without re-uploading.

The preview screen shows your own results alone — no partner needed: where you lean in each area, your Big Five estimate, your attachment style, your love language, any answers that contradicted each other, and a full list of every question with the answer you gave. Printing includes that full answer list even though it's collapsed on screen.

## How it works

Each person answers 84 questions (81 if the optional intimacy section is skipped), then gets a share code. The partner pastes that code into their app and the report is generated locally. Nothing is uploaded anywhere.

Scoring is not a simple average. Each question is scored one of three ways: similarity (closer answers are better — values, children, lifestyle), complementarity (moderate difference is healthy — who repairs after a fight), or tolerance range (difference is fine within a band, penalized beyond it — spending, social energy). Questions about children, religion and relocation are flagged as deal-breakers: a large gap raises an explicit alert and caps the headline score regardless of everything else.

Twelve consistency pairs ask the same trait twice in different words. Contradictions lower the confidence percentage rather than the compatibility score, so the report tells you how much to trust itself.

The most useful output is the "Topics to Discuss" section, not the number — so the report puts it above the number.

## What the headline number is and isn't

The headline figure is called the **Alignment Index**, not a compatibility score, and that wording is deliberate.

Actual similarity between partners does not predict relationship satisfaction in established couples. Montoya, Horton & Kirchner's meta-analysis (460 effect sizes, 313 studies) found the effect of actual similarity in existing relationships was not significant, and Joel et al.'s machine-learning analysis of 43 longitudinal datasets (11,196 couples) found personality and traits added essentially nothing once relationship-specific judgments were accounted for.

So the index maps *where two people differ*, which is useful for deciding what to talk about. It does not predict whether a relationship will work. The report says this on the screen, not just here.

## Response quality

Four items are absolute statements almost nobody can honestly endorse ("I have never been irritated by someone close to me"). Strong agreement across them suggests answering to look good rather than to be accurate. One further item simply asks the person to pick a specific number, to check attention.

These only lower the confidence percentage — capped at 15 points — and never touch the compatibility score. Failing the attention check is flagged in the report but costs nothing.

## Privacy

Answers stay on the device. Sharing a code sends the profile to a Supabase row that expires after 6 months; row-level security is on with no policies, so the publishable key can only call two functions and cannot list or enumerate anything.

A partner who opens your profile by share code sees **aggregate results only** — the itemized question-by-question answer list is hidden for imported profiles. Your own profile, and a backup you restore from your own `.json` file, still show everything.

## Categories

15 scored areas: Personality (Big Five), Communication, Conflict & Repair, Money, Lifestyle, Family & Children, Values & Religion, Career & Ambition, Trust & Boundaries, Emotional Needs, Adaptability & Growth, Appreciation, Future Planning, Fairness at Home, and Physical Intimacy (optional).

Attachment is measured too, but reported per person rather than as a couple score, because that is how the evidence supports it.

Adaptability & Growth is measured indirectly through scenarios — reaction to a partner's job offer in another city, support for a risky business venture, willingness to try unfamiliar things.

Appreciation and Fairness at Home are their own categories on purpose: feeling appreciated and perceiving the division of labour as *fair* (not necessarily equal) both track relationship satisfaction more closely than the underlying facts do.

Physical Intimacy is opt-in. Skipping it costs no confidence, and the toggle states plainly that a partner never sees individual answers.

## Situations, not statements

Most questions are situations, not statements about yourself. Instead of rating "I find it easy to talk about my feelings" from 1 to 7, you are put in a specific evening and asked what you actually do. Forty-four of the eighty-four items work this way.

The reason is faking. Situational judgment items are measurably harder to answer strategically than agreement scales — when people try to look good, their answers move much less. The honest caveat is that the same research found this extra resistance did **not** make such tests better at predicting anything. So the gain here is more honest answers and a less tedious test, not a better prediction.

Forty items are still statements, on purpose. The Big Five, attachment and response-quality items are written in the style of published instruments and would lose that link if rewritten as scenarios. The reverse-scored twins that power the consistency checks have to stay statements too — a contradiction check works by mirroring wording, which a scenario cannot do.

## Male and female versions

At the start you choose male, female, or prefer not to say. Eighteen of the questions then place you where you would actually be standing: whose mother is on the phone, whose income dropped, who gets up at 3am.

Nothing after that first screen refers to it. The order, the count and the progress bar are identical for everyone, the tailored questions are scattered through the flow rather than grouped, and the report never marks which ones they were. Both versions of a question offer the same answer values, so a male and a female profile still compare item for item.

The choice travels with the profile — inside the answers payload, so share codes and `.json` backups carry it with no database change. A profile taken before this existed, or by someone who declined to say, gets the neutral wording and scores normally.

## Married and not-yet-married

The first screen asks where you are now: not married yet, married, or married before. That
changes wording, nothing else.

Twenty-six situations name a spouse ("your wife picks up your phone"), and two assume a child
already exists. For someone still deciding whether to marry, that presupposes a life they are
not in yet, so those items are reworded — "she picks it up", "picture a child of your own" —
and the intro says once that some situations describe married life.

The questions themselves are not removed, and answering them from imagination is not penalised.
PREPARE, the standard premarital inventory, asks not-yet-married couples exactly these
hypotheticals and predicts marital satisfaction at 80–85% accuracy over three years. For a
married person the item reports behaviour; for an unmarried person it reports an expectation —
and expectation mismatch is the thing this app exists to surface. Deducting confidence for it
would contradict the only outcome evidence there is.

Same item ids, same answer values, same scoring both ways, so a married person and a single
person still compare item for item. The report adds one neutral line when the two answered
from different places.

## Worldview

The report has a section called Worldview: four lines describing how a person tends to frame a decision.

- **Continuity and change** — keep what works ↔ open to changing it
- **Who decides** — family has a say ↔ the two of you decide
- **Money and risk** — security first ↔ worth the risk
- **Roles at home** — each has their own area ↔ whoever can, does

It is measured quietly. No question exists to measure it; the signal rides on ordinary questions about money, family and weekends. Within a single question, two options often describe nearly the same behaviour in different vocabulary — one in the language of rights and choice, one in the language of duty and responsibility. The behaviour is neutral; the wording is what is being read.

No ideology is ever named, in either language, and there is a check in the code that throws if one reaches a user-facing string. Neither end of any line is described as better. An axis is only shown once at least five of its items were answered; below that it says so rather than showing a number.

Two of the four — roles at home, and who decides — are the ones where a wide gap is raised as something to talk about, because those are the gaps the divorce research keeps naming. Even then it changes nothing about the score. A worldview gap is not treated as a deal-breaker and never caps the Alignment Index; asserting that a values difference predicts failure would go past what the evidence supports.

## Charts

Every chart is hand-written inline SVG. No chart library: the app is an offline-first PWA with
no build step, so a CDN script would break both the service worker precache and the
single-file build.

The couple report shows:

- **The alignment index as a ring**, with confidence as a lighter inner arc. Two rings rather
  than one stacked bar, because confidence does not reduce the index — they measure different
  things.
- **A radar with one outline per person.** The old radar drew a single polygon of the couple's
  agreement, which could not show *which* of the two was pulling a category down. These are each
  person's own lean, so the gap between the outlines is the information.
- **One sorted bar chart** where strengths and challenges used to be two bullet lists. Aligned
  areas at the top, divergent at the bottom, coloured by the same thresholds as the headline
  badge.
- **A gap bar on each topic to discuss**, widest first — which is the order worth talking in.

The solo report gets its own radar and a confidence ring; its per-area bars stay, because they
carry the pole labels a radar cannot.

Charts flip their own coordinates in Arabic — SVG does not mirror on its own, so a chart that
relied on the document direction would point at the wrong label in RTL. Printing resets the
colour tokens, so a report printed while the app is in dark mode is legible on white paper.

## Where the questions come from

The attachment section follows the two-dimension model of the ECR-S (Wei et al., 2007) — anxiety and avoidance — written in that style, not reproducing its items. The Big Five top-ups follow the BFI-2-XS structure (Soto & John, 2017). The response-quality items are BIDR-style (Hart et al., 2015).

The report's "How this was scored" panel shows the published reliability of those original instruments, clearly labelled as *reference only*: MatchWise's own wording is adapted and has not been separately validated.

## What's new in v5

Reviewed against a second MatchWise prototype the user built separately, and
ported the product ideas worth keeping — without touching the scoring engine
or any v2–v4 guardrail. Full rationale, including what was deliberately
*not* ported and why, is in `Build-MatchWise-v5.md`.

- **"In short"** — one plain-language paragraph right after the headline
  ring, before any chart: names, index, confidence, strongest and most
  worth-discussing categories.
- **Growth Opportunities** — categories where both partners' *own* lean
  sits low on the same thing. Different from Topics to Discuss: this is
  where you agree while both quietly avoiding the same area, which a
  disagreement-based section can't catch.
- **Recommendations** — a short, templated closing list: the weakest
  agreement area, a shared growth area, and up to three strengths worth
  protecting.
- **Load demo profiles** — one tap on the dashboard generates two sample
  profiles live from the current question bank (not hand-typed, so they
  can't drift out of sync with it) and opens a full report instantly.
  Clearly tagged **Demo**; never downloadable, never uploaded anywhere.
- **How it works** — a four-step strip on the home screen explaining the
  flow before asking for any answers.
- **Encrypted export — opt-in, off by default.** A checkbox on the home
  screen turns on AES-GCM-256 encryption for downloaded `.json` files,
  keyed to this device only. Off by default because every file this app
  has ever exported is plain JSON and something outside the app may
  already read those; turning it on is the user's call, not a silent
  default change.

## Interaction Style (v6)

The report has a section called **Interaction Style**: a quadrant plot showing
how each person tends to come across, on two dimensions — reserved ↔ outspoken,
and task-first ↔ people-first.

This is the DISC-family read, built without asking a single extra question.
It works because the DISC plane is very close to a rotation of two traits the
app already measures: in a 9,000-person study of people who took both, each
DISC scale came out as a blend of about two Big Five factors, with
Extraversion and Agreeableness doing nearly all the work.

It is deliberately **not** called a DiSC result. DiSC® is a Wiley trademark
with proprietary items; this is a projection of our own Big Five estimates,
not that instrument and not scored against its norms. The quadrants are named
in plain language — Driving, Inspiring, Steady, Precise — and the classic
DISC letter appears only as a cross-reference for people who know that
vocabulary.

One thing the section says out loud, because the report would otherwise
contradict itself: **DISC's "C" is not the Conscientiousness figure shown
elsewhere in this report.** They correlated about zero in that same study.
DISC's C means reserved and precise; Big Five Conscientiousness means
organised and dependable. The two numbers are allowed to disagree.

Someone sitting within 8 points of the midpoint on both axes is reported as
**balanced** rather than pushed into a corner — a 51/49 split is not a
personality type, and forcing one would invent a result the data doesn't
support. If either partner is balanced, no couple-level comparison is drawn.

Like the worldview axes, this never moves the Alignment Index.

## Type Preferences (v7)

The report also shows a **Type Preferences** card: the four preferences behind the familiar four-letter shorthand, in both the solo and couple views. No new questions — like Interaction Style, it re-reads the Big Five answers already given.

The mapping comes from McCrae & Costa (1989, N = 267), which correlated each continuous four-letter scale against the five-factor model: E–I with Extraversion (−.74), S–N with Openness (.72), T–F with Agreeableness (.44), J–P with Conscientiousness (−.49). The first two are strong, the second two moderate, and the card says so.

**This is not the branded instrument.** The Myers-Briggs Type Indicator® and MBTI® are trademarks of The Myers-Briggs Company with proprietary items; nothing here is scored against its norms. A load-time guardrail throws if a user-facing string claims otherwise.

**The sliders are the result; the letters are a summary.** Within 8 points of the midpoint a letter shows as `X` rather than being forced — the four dimensions are continuous and roughly normally distributed, not two kinds of people, which is also why about half of people flip at least one letter on a five-week retest.

**The card says out loud what the four letters leave out.** Emotional volatility (Neuroticism) has no counterpart in the model at all — and across 115 longitudinal studies of couples it was the most consistent personality predictor of satisfaction and stability. The four letters are silent on the trait with the strongest evidence for the question the app is about.

Two visualisations, deliberately kept in separate blocks:

- **Type map** — all sixteen types shaded by distance from the actual scores, with nearest and furthest listed. Measured; it shows resemblance, not suitability.
- **"Best match" chart** — Keirsey & Bates (1978), the source nearly every online match chart descends from. Shown *with* the fact that it did not hold up when tested, and that a 1991 US National Research Council review did not support this use.
- **Couple distance strip** — average and per-dimension gaps between two people. Description, not a grade; neither end is the good end.

Like the worldview axes and Interaction Style, none of this moves the Alignment Index.

## Files

`index.html`, `style.css`, and `js/` are the source. The v2 modules (`questions.js`, `scoring.js`, `report.js`, `i18n.js`, `cloud.js`, `app.js`) are joined by three additive v3 modules — `questions-v3.js`, `scoring-v3.js`, `report-v3.js` — three additive v4 modules — `questions-v4.js`, `scoring-v4.js`, `report-v4.js` — four additive v5 modules — `scoring-v5.js`, `report-v5.js`, `demo-v5.js`, `crypto-v5.js` — two additive v6 modules — `scoring-v6.js`, `report-v6.js` — and two additive v7 modules — `scoring-v7.js`, `report-v7.js` — which layer on top without modifying anything below them. `Build-MatchWise-v4.md`, `Build-MatchWise-v5.md`, `Build-MatchWise-v6.md` and `Build-MatchWise-v7.md` are the v4, v5, v6 and v7 specs, including the research and review each was built from.

Every `import` in the `js/` folder must stay on one line. `build-single.js` flattens the modules into the offline file by deleting whole lines that start with `import`, so a multi-line import leaves a dangling `} from "…";` behind. The build now fails loudly on that rather than shipping a broken bundle.

`manifest.json` and `sw.js` make it installable and offline-capable. `MatchWise-preview.html` is generated. `Build-MatchWise-v2.md` and `Build-MatchWise-v3.md` are the design specs; the v3 spec records which research claims were checked and what the evidence said.

### Version compatibility

A profile is identified as v2, v3 or v4 purely by which question ids appear in its answers (v4 also by the gender key) — nothing is stamped on the stored file, so existing profiles, share codes and `.json` backups keep working with no migration.

A v2 profile still renders through the original v2 report, untouched. Comparing a v2 profile against a v3 one scores only the questions both answered, lowers confidence, and says so on screen — and the older profile is not penalised for "skipping" questions that did not exist when it was taken.

## Deploying

From this folder: `npx vercel --prod`. Or push to GitHub and connect the repo to Vercel. It's a static site — no build step, no environment variables.

Rebuild the single file first if you changed anything: `node build-single.js`. It self-checks and fails loudly if the bundle is broken, if any file in `js/` is missing from the service worker's precache list, or if `sw.js`'s cache name wasn't bumped for the release.

**Bump `CACHE` in `sw.js` on every release that changes a cached file.** Installed phones serve from cache first; if the name doesn't change, they keep the old version indefinitely.

## Limitations

This is a conversation tool, not a validated psychometric instrument. Self-report questionnaires capture how people describe themselves, which is not always how they behave. Treat the score as a starting point for talking, not a prediction.

Two limits worth naming specifically:

- **Question weights are editorial judgment**, not derived from data. Category percentages are organized opinion, not measurement.
- **Nothing here has been calibrated against real outcomes.** Validating the scoring would need roughly 300 opt-in profiles paired with a relationship-satisfaction measure, then re-deriving the weights by regression and checking honestly whether the Alignment Index correlates with satisfaction at all. Until that happens, this section stays as it is.
