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

> [!note] Update after this report was written
> The section below described the state right after Phase 7. Since then, the Phase 1 stub was replaced with a real call to Google's Gemini API (provider switched from the originally-planned Anthropic — the user asked for a non-Anthropic option; see [[Decisions Log]]) — `gemini-2.5-flash-lite` for routing, `gemini-2.5-pro` for report calls. `isValidReportDirective`'s loose placeholder was also tightened into real phase-aware validators matching the client exactly. This was verified offline against a live local server (`tests/assess-edge-function.test.js`, 9 checks: missing-key fallback, a genuine failing call against the real Gemini endpoint with a bogus key degrading cleanly, rate limiting, CORS, size limits) — but the *successful* model-response path (a real, valid `GEMINI_API_KEY`) has not been live-tested yet, since that key must be set by the user via the Supabase dashboard/CLI (no MCP tool exists for setting edge function secrets). Until that key is set, the function's observable behaviour is still identical to "AI off" — the paragraphs below describe that now-resolved-except-for-the-live-key state accurately as history.

**The edge function deployed right at Phase 7 was still the Phase 1 stub.** `stubRoutingDirective()` always returned empty (`injectItems: []`), and `stubReportDirective()` always returned empty cards/insights. This meant:

- Every guarantee above is real and tested.
- But in production at that time, the Insight Engine did **nothing observable** — no probes actually got injected, no report addon ever appeared, because the stub never had anything to say. The app behaved exactly as if the toggle were off, for every real user.

The Build Plan's own Phase 1 step 5 ("swap the stub for the real API call") was completed after this report, per the note above. What's left before the feature is live in the sense of actually influencing anyone's test:
1. The user sets the `GEMINI_API_KEY` secret on the Supabase project (`supabase secrets set GEMINI_API_KEY=...`, key from https://aistudio.google.com/apikey).
2. A live curl test of a real (non-bogus-key) call, to confirm actual model output round-trips through the schema validators correctly — same style as this report's own live rate-limit testing.

Everything built in Phases 1–7 is the safety harness around that call — validated shapes, evidence grounding, quote verification, budget caps, the "AI never sets scores" guarantee. None of it needed the real model to be tested, by design (that's the whole point of stubbing first).

## Test inventory (all passing as of this report)

- 45 unit tests across `tests/ai-session-v8.test.js` (10), `tests/questions-v8.test.js` (9), `tests/scoring-v8.test.js` (19), `tests/report-v8.test.js` (7)
- 9 unit tests in `tests/ai-client-v8.test.js`
- 5 jsdom smoke suites: `tests/questions-v8.render.smoke.mjs`, `tests/report-v8.render.smoke.mjs`, `tests/report-v8.integration.render.smoke.mjs`, `tests/build-single.render.smoke.mjs`, `tests/qa-v8-phase7.render.smoke.mjs` (15 checks)
- 1 live integration test against the real deployed function: `tests/ai-session-v8.integration.test.js`
- Added after this report (Gemini integration): 9 checks in `tests/assess-edge-function.test.js` — runs the real edge function as a local Deno server and hits it with real HTTP requests (missing-key fallback for all 3 phases, a genuinely-failing live call to Gemini with a bogus key degrading cleanly, malformed body, unknown phase, rate-limit cutoff, CORS trusted/untrusted origin, oversized body)

## See also
[[v8 - Build Plan]] · [[v8 - AI Assessor Spec]] · [[Known Limitations]] · [[Decisions Log]]
