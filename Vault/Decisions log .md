---
title: Decisions Log
tags:
  - matchwise
---
# Decisions Log

Key calls made during the build, and why — so nobody re-litigates them by accident.

> [!note] No MBTI, no DiSC branding
> Both the Myers-Briggs Type Indicator and DiSC are trademarked, proprietary instruments this app cannot reproduce or score against. v6 and v7 use the underlying public psychological ideas (Jung's types; Marston's DISC theory) re-derived from the app's own Big Five scores — and both files carry a code guardrail blocking the trademarked names from ever reaching a user-facing string.

> [!note] Share codes instead of "encrypted" file export
> v1's plan was client-side encrypted JSON export. Rejected in v2: encryption with no backend and no real key management is fake security. Replaced with a Supabase-backed share code — see [[Data Model]].

> [!note] Encryption is opt-in, not default
> v5 added local file encryption, but left it off by default. Every file this app has ever exported was plain JSON; turning that on by default would silently break anything outside the app that reads those files.

> [!note] Demo profiles are generated, not hand-written
> A hand-typed demo answer set would silently go stale the moment a question is added or removed. v5 generates demo answers live from the real current question bank instead.

> [!note] Deal-breakers are flags, not score penalties
> Children, religion, and relocation mismatches are shown as explicit alerts, separate from the Alignment Index — so a couple can't miss a serious mismatch just because everything else scored well.

> [!note] Old profiles are never migrated
> Version is inferred from which question ids appear in a profile's answers. A v2 profile still renders in its original v2 report forever, and comparing it against a newer profile just scores their shared questions with lower confidence — no forced upgrade, no broken old data.