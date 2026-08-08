# Build MatchWise v2.0 — Improved Prompt

You are a senior full-stack engineer, UX designer, and psychology-informed product designer.
Build **MatchWise**, a relationship compatibility assessment web app for couples.

Goal: measure how compatible a couple is at *enjoying life together and growing together* — not just matching answers.

---

## Architecture (changed from v1)

- **PWA** (Progressive Web App): installable, works offline after first load, accessible from any phone via one URL.
- Hosting: **Vercel** (static). Code in **GitHub**.
- **No backend for v1.** All data stays on the device (localStorage). Supabase may be added later for cross-device profile sync.
- Stack: HTML5 + CSS3 + vanilla JS (ES6 modules). No frameworks, no CDN dependencies.

## Profile sharing (replaces "encrypted JSON export")

Client-side encryption with no backend is fake security. Instead:
- A finished assessment produces a compact **share code** (base64 of compressed answers) and a **QR code** (SVG, no library).
- Partner opens the app on their phone, pastes/scans the code → both profiles load → report generates.
- Profiles also saved locally for reuse.

## Design

Modern, minimal, premium, Apple-like. Rounded cards, soft shadows, large type.
Mobile-first, responsive, dark + light mode, smooth transitions, progress indicator.
Full **Arabic RTL** and **English LTR**, switchable anytime.

## Assessment design (improved)

~48 core questions + adaptive follow-ups (total 45–60 per user). Mixed types:
7-point Likert, multiple choice, scenario, priority ranking. Never all the same type.

### Categories
1. Personality (Big Five only — **no MBTI**, weak science)
2. Communication & repair after conflict
3. Conflict style
4. Money & spending
5. Lifestyle & daily rhythm
6. Family, in-laws & children
7. Religion & values
8. Career & ambition
9. Trust & boundaries
10. Emotional needs & affection
11. **Adaptability & Growth (new)** — asked *indirectly* via scenarios:
    - Adapting to life changes ("Partner gets a job offer in another city — first thought?")
    - Openness to new ideas ("Partner suggests something you've never tried…")
    - Supporting risky projects ("Partner wants to quit stable job for a startup…")
    - Stress behavior ("After a terrible day, talk or be alone?")
    - Who repairs after a fight; gratitude habits
12. Future planning

### Honesty safeguards
- 4–6 **consistency pairs**: same trait asked twice in different words. Contradiction lowers the confidence score.
- Avoid obviously "correct" answers; use scenarios with equally socially-acceptable options.

### Deal-breakers
Children, religion practice, relocation willingness are **flags, not scores**. A mismatch shows a clear alert regardless of the overall index.

## Scoring engine

Each question has metadata: id, category, weight, trait, matchType, dealbreaker, followups, type, en/ar text.

Three match types (never simple averaging):
- **similarity** — closer answers = better (values, children, lifestyle)
- **complementarity** — moderate difference can be good (dominance, spontaneity)
- **tolerance range** — difference OK within a band, penalty beyond it (spending, social energy)

Outputs: Overall Compatibility Index, per-category scores, Big Five estimates, attachment style, conflict style, love-language tendency, confidence % (reduced by inconsistency), strengths, challenges, deal-breaker alerts, **topics to discuss** (the most valuable output — emphasize it over the single number).

Never claim certainty. This is a conversation tool, not a verdict.

## Report

Professional, printable (browser print → PDF). Sections: Executive Summary, Compatibility Index, Personality Dynamics, per-category analysis, Adaptability & Growth, Strengths, Challenges, Suggested Conversations, Recommendations. Charts in pure SVG: radar, bars, progress circles.

## Files

index.html, style.css, js/app.js, js/questions.js, js/scoring.js, js/report.js, js/i18n.js, manifest.json, sw.js, README.md

## Build order (do in phases, not one pass)

1. App shell + flow + one sample category → validate UX on phone
2. Full bilingual question bank (review as text before wiring)
3. Scoring + report
4. PWA, polish, RTL pass, deploy

## Quality bar

Feels like a polished commercial product. No default browser styling. Documented, no duplicated code. Works immediately after deploy; installable on phone.
