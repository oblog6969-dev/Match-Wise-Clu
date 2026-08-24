---
title: Architecture
tags:
  - matchwise
  - technical
---
# Architecture

## Stack
Vanilla HTML5, CSS3, ES6 modules. No framework, no build tool needed to run it — `index.html` loads `js/app.js` as a module directly.

## Layout
```
index.html            entry page, all screens (home, assessment, report, compare)
style.css              all styling
manifest.json           PWA manifest
sw.js                    service worker — offline caching
js/
  app.js                 controller — routes between versions, wires up the UI
  i18n.js                 English/Arabic strings
  questions.js, questions-v3.js, questions-v4.js    question banks
  scoring.js, scoring-v3.js … scoring-v7.js           scoring engines
  report.js, report-v3.js … report-v7.js              report renderers
  cloud.js                Supabase share-code lookup/save
  crypto-v5.js             optional local encryption for exported files
  demo-v5.js               live-generated demo profiles
build-single.js         bundles everything into one offline file
MatchWise-preview.html    the bundled, generated output — don't hand-edit
supabase/schema.sql      database schema for share codes
```

## The versioning pattern (important)
Every version from v3 onward is an **additive layer**. A new version adds new files; it never edits an older scoring or report file. Example: `report-v7.js` *wraps* `report-v6.js` and splices in one new card.

Why this matters: a profile made under an old version still renders correctly through its original report. Comparing an old profile to a new one just scores the questions they both share, and lowers the confidence score to say so — see [[Data Model]].

## Build step
`node build-single.js` flattens all the `js/` modules into one file, `MatchWise-preview.html`, so it can be opened offline with no server. It self-checks and fails loudly if:
- a module is missing from the service worker's offline cache list,
- the service worker's cache name wasn't bumped for the release,
- an `import`/`export` line was left dangling by mistake.

## See also
[[Assessment Design]] · [[Data Model]] · [[Deployment]]