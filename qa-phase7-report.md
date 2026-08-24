---
title: v8 - Phase 7 QA Report
tags:
  - matchwise
  - v8
  - qa
---
# v8 — Phase 7 QA Gate Report

Result of running the 17-item checklist from [[v8 - Build Plan]]'s Phase 7 section, on branch `feat/v8-insight-engine` after Phases 1–6 were built. 16 of 17 items are fully automated and pass; 1 is a live-observed finding (not a regression) about an already-documented server-side limitation. **One important gap found: the edge function is still the Phase 1 stub — see "What this QA gate does NOT cover" at the end.**

## Item-by-item

| # | Item | Status | Where verified |
|---|---|---|---|
| 1 | Full test offline, start to finish → v7 report, no errors | ✅ Pass | `tests/qa-v8-phase7.render.smoke.mjs` |
| 2 | Toggle OFF → zero network calls to `assess` | ✅ Pass | `tests/qa-v8-phase7.render.smoke.mjs` (explicit call count, not just "didn't crash") |
| 3 | Supabase cold start → completes with no visible stall | ✅ Pass (by design) + ⚠️ live check recommended | Architecture guarantee: every AI call is fire-and-forget — nothing on the UI thread ever `await`s one. `tests/ai-client-v8.test.js` proves the client aborts and moves on at the timeout budget regardless of how long the server actually takes. A live cold Supabase project (~30–60s wake, confirmed earlier in this build) was not re-tested here since forcing the project to sleep on demand isn't something to do to production casually — but the mechanism that makes it safe is the same one already tested. |
| 4 | Timeout injected at every checkpoint → completes, no UI trace | ✅ Pass | `tests/ai-client-v8.test.js` (abort mechanism) + code path review (`onAnswer`/`drainPending`/`renderCoupleReport` never await the AI promise) |
| 5 | Malformed JSON returned → discarded, continues | ✅ Pass | `tests/ai-client-v8.test.js` + live-curled the real deployed function with an unparseable body → confirmed `400` |
| 6 | No packet ever contains `name`, `code`, `id`, or `date` | ✅ Pass | `tests/ai-session-v8.test.js`, `tests/report-v8.test.js` (packet-poisoning tests) |
| 7 | Injected/reordered item never lands at or before `quiz.i` | ✅ Pass | `tests/ai-session-v8.test.js` |
| 8 | Open-text prompt-injection string → no effect on output | ✅ Pass | `tests/qa-v8-phase7.render.smoke.mjs` — a real injection attempt, paired with smuggled `score`/`confidence` fields and a fabricated quote, proven to leave the displayed confidence and Alignment Index untouched, with only the real substring-verified text surviving |
| 9 | Open-text XSS payload → renders as literal text | ✅ Pass | `tests/report-v8.render.smoke.mjs` (a raw `<img onerror=...>` payload confirmed to create zero DOM elements) |
| 10 | Fabricated quote in a signal → dropped | ✅ Pass | `tests/scoring-v8.test.js`, `tests/report-v8.test.js` |
| 11 | Claimed pair resolution that doesn't narrow the gap → rejected | ✅ Pass | `tests/scoring-v8.test.js` |
| 12 | Arabic RTL: injected probes and AI report text render correctly | ✅ Pass | `tests/qa-v8-phase7.render.smoke.mjs` |
| 13 | Old v6/v7 profile still opens and renders through its original report | ✅ Pass | `tests/qa-v8-phase7.render.smoke.mjs` — zero Insight Engine calls for a legacy pair, not just "still renders" |
| 14 | Total injected items never exceeds 8 | ✅ Pass | `tests/ai-session-v8.test.js` (`MAX_INJECTED_TOTAL` budget test) |
| 15 | Rate limit returns 429, app degrades silently | ⚠️ Partial | Client side: ✅ (`tests/ai-client-v8.test.js` — any non-2xx resolves to `null`, no retry, no crash). Server side: firing 22 rapid requests under the same `sessionId` against the real deployed function never produced the expected 429 at the documented cutoff of 20. This is not a regression — `supabase/functions/assess/index.ts`'s own comment already documents the counters as "best-effort... a Deno edge function instance can be recycled or scaled to multiple isolates at any time." This is a live confirmation of that known limitation, not a new one. |
| 16 | Edge function logs contain no answer text | ✅ Pass | Code review of the deployed function: the one log line is `{ts, phase, status, latencyMs}` — no packet field is referenced |
| 17 | With AI fully off, `renderReportV7()` output is byte-identical to production | ✅ Pass | `tests/report-v8.integration.render.smoke.mjs` (AI-off vs. AI-on-with-empty-response produce byte-identical `#reportRoot` HTML) |

**16/17 fully pass. Item 15 is a partial pass with a live-confirmed, already-documented server-side limitation — not something this phase introduced or needs to fix before shipping**, since legitimate usage never approaches the 20-calls-per-session cutoff anyway (a real quiz+report uses roughly 8 checkpoints + 2 person calls + 1 couple call ≈ 11). Worth revisiting only if real abuse is ever observed — the function's own comment already names the fix (move counters to a Supabase table).

## What this QA gate does NOT cover

**The edge function deployed right now is still the Phase 1 stub.** `stubRoutingDirective()` always returns empty (`injectItems: []`), and `stubReportDirective()` always returns empty cards/insights. This means:

- Every guarantee above is real and tested.
- But in production today, the Insight Engine currently does **nothing observable** — no probes actually get injected, no report addon ever appears, because the stub never has anything to say. The app behaves exactly as if the toggle were off, for every real user, right now.

The Build Plan's own Phase 1 step 5 ("swap the stub for the real API call") was never completed. Turning this into a feature that actually does something needs, in order:
1. Confirming the `ANTHROPIC_API_KEY` secret is set on the Supabase project (Phase 0 step 5 — not verifiable from this session; only checkable from the Supabase dashboard or CLI).
2. Writing the actual prompts for the three phases (`routing`, `report_person`, `report_couple`) that call the Anthropic API and shape its output into the already-fixed directive schemas.
3. Replacing `stubRoutingDirective()`/`stubReportDirective()` in `supabase/functions/assess/index.ts` with the real call, redeploying.

Everything built in Phases 1–7 is the safety harness around that call — validated shapes, evidence grounding, quote verification, budget caps, the "AI never sets scores" guarantee. None of it needed the real model to be tested, by design (that's the whole point of stubbing first). But it's worth being clear that the feature isn't "live" in the sense of actually influencing anyone's test yet.

## Test inventory (all passing as of this report)

- 45 unit tests across `tests/ai-session-v8.test.js` (10), `tests/questions-v8.test.js` (9), `tests/scoring-v8.test.js` (19), `tests/report-v8.test.js` (7)
- 9 new unit tests in `tests/ai-client-v8.test.js`
- 5 jsdom smoke suites: `tests/questions-v8.render.smoke.mjs`, `tests/report-v8.render.smoke.mjs`, `tests/report-v8.integration.render.smoke.mjs`, `tests/build-single.render.smoke.mjs`, `tests/qa-v8-phase7.render.smoke.mjs` (15 checks)
- 1 live integration test against the real deployed function: `tests/ai-session-v8.integration.test.js`

## See also
[[v8 - Build Plan]] · [[v8 - AI Assessor Spec]] · [[Known Limitations]] · [[Decisions Log]]
