---
title: Feature Timeline
tags:
  - matchwise
  - changelog
---
# Feature Timeline

> [!info] How to read this
> Each version after v2 is additive — see [[Architecture#The versioning pattern (important)]]. A profile's version is inferred, not stored.

## v1 — original concept
The original brief: an offline single-page quiz app, 45–70 adaptive questions, Big Five + MBTI-tendency + attachment + love-language estimate, encrypted JSON export, no backend. (Superseded before build — see v2.)

## v2 — first real build
- Became a PWA: installable, offline-first, hosted as a static site on Vercel.
- Dropped client-side "encryption" of exports (fake security with no backend) in favor of **share codes** — a compact code plus QR, instead of trading files.
- ~48 core questions + adaptive follow-ups, 45–60 per user, mixed types.
- Added deal-breaker flags (children, religion, relocation) — shown as alerts, not folded into the score.
- Consistency-pair questions to catch low-effort answering.

## v3 — measurement upgrade
- Added attachment style (ECR-S-style, 12 items), a Big Five top-up (3 items/domain), and an optional intimacy module.
- Added ω (omega) reliability reporting and an impression-management penalty.
- **Key finding baked into the product:** actual personality similarity does not predict relationship satisfaction in established couples (Montoya, Horton & Kirchner meta-analysis). The report's language shifted from implying prediction to calling itself a **difference map**.
- Explicitly avoids citing Gottman's "90% divorce prediction" claim — found not defensible on fresh data.

## v4 — gendered worldview axes
- Four axes for *how couples talk about decisions* (family authority, tradition, gender roles, economic independence) — loaded invisibly onto 6–8 ordinary scenario questions each, never a labeled "values" section.
- Gender-aware item phrasing (18 gendered pairs), native Arabic review pass (97 strings changed).
- Two axis types: complementarity-tolerant (difference is normal) vs. similarity-critical (large gaps flagged as high-priority discussion topics, not score penalties).

## v5 — trust and onboarding polish
- "In short" plain-language summary paragraph at the top of the couple report.
- Live-generated (not hand-typed) demo profiles, so a new user sees a full report instantly.
- Optional local encryption for exported `.json` files (opt-in, off by default).
- "How it works" landing strip.

## v6 — Interaction Style
- New report card: an outspoken/reserved × task/people quadrant, derived from existing Big Five scores — no new questions.
- Deliberately **not** branded as DiSC — a commercial instrument. A guardrail check blocks that phrasing from ever reaching the UI.

## v7 — Type Preferences
- New report card: four dimensional sliders (re-projected from Big Five, per McCrae & Costa 1989's mapping) plus a gated four-letter code, a sixteen-type resemblance map, and a couple distance chart.
- Deliberately **not** branded as MBTI — same trademark reasoning as v6/DiSC. A guardrail blocks "MBTI", "Myers-Briggs", "16personalities", etc. from user-facing strings.
- Notes plainly that the Keirsey "best match" chart most online tools copy did not hold up when tested (1991 US National Research Council review).

## Where it stands today
v7 is the current version. See [[Roadmap - v8 Proposals]] for candidate next steps and [[Known Limitations]] for what's still unresolved.