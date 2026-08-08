# MatchWise

Private couple compatibility assessment. Mobile-friendly PWA, bilingual (English / Arabic), no backend — all answers stay on the device.

**Live:** https://matchwise-clu-oblog6969-1103s-projects.vercel.app

## Two ways to run it

Open the live URL on any phone and use "Add to Home Screen" to install it. After the first load it works offline.

Or double-click `MatchWise-preview.html` — a single self-contained file with everything inlined. No server, no install. Useful for quick review or sharing by email.

## Keeping and reloading a profile

After finishing the assessment, press **Download my profile file** to save a `.json` backup. Keep it anywhere — email, cloud drive, USB.

If you lose your phone, clear your browser, or switch devices, open the app and use **Choose file…** on the home screen to upload that `.json` back. It goes straight to your profile preview, where you can print it or save it as PDF again. Saved profiles also have **Preview** and **⤓** buttons for the same thing without re-uploading.

The preview screen shows your own results alone — no partner needed: where you lean in each of the 12 areas, your Big Five estimate, your love language, any answers that contradicted each other, and a full list of every question with the answer you gave. Printing includes that full answer list even though it's collapsed on screen.

## How it works

Each person answers 47 questions across 12 areas, then gets a share code. The partner pastes that code into their app and the compatibility report is generated locally. Nothing is uploaded anywhere.

Scoring is not a simple average. Each question is scored one of three ways: similarity (closer answers are better — values, children, lifestyle), complementarity (moderate difference is healthy — who repairs after a fight), or tolerance range (difference is fine within a band, penalized beyond it — spending, social energy). Questions about children, religion and relocation are flagged as deal-breakers: a large gap raises an explicit alert and caps the headline score regardless of everything else.

Six questions are consistency pairs — the same trait asked twice in different words. Contradictions lower the confidence percentage rather than the compatibility score, so the report tells you how much to trust itself.

The most useful output is the "Topics to Discuss" section, not the number. The report says so explicitly.

## Categories

Personality (Big Five), Communication, Conflict & Repair, Money, Lifestyle, Family & Children, Values & Religion, Career & Ambition, Trust & Boundaries, Emotional Needs, Adaptability & Growth, Future Planning.

Adaptability & Growth is measured indirectly through scenarios — reaction to a partner's job offer in another city, support for a risky business venture, willingness to try unfamiliar things, and whether small kindnesses get noticed and thanked.

## Files

`index.html`, `style.css`, and `js/` (app, questions, scoring, report, i18n) are the source. `manifest.json` and `sw.js` make it installable and offline-capable. `MatchWise-preview.html` is generated — run `node build-single.js` to rebuild it after changing any source file. `Build-MatchWise-v2.md` is the design spec.

## Deploying

From this folder: `npx vercel --prod`. Or push to GitHub and connect the repo to Vercel. It's a static site — no build step, no environment variables.

Rebuild the single file first if you changed anything: `node build-single.js` (it self-checks and fails loudly if the bundle is broken).

## Limitations

This is a conversation tool, not a validated psychometric instrument. Self-report questionnaires capture how people describe themselves, which is not always how they behave. Treat the score as a starting point for talking, not a prediction.
