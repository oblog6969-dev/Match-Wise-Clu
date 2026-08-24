---
title: Roadmap - v8 Proposals
tags:
  - matchwise
  - roadmap
---
# Roadmap — v8 Proposals

Candidate features only. **Nothing here is built.** Each follows the project's own additive-layer rule: new files, no edits to existing scoring/report modules — see [[Architecture#The versioning pattern (important)]].

## 1. Calibration pipeline (highest value — already planned by the project itself)
The project's own v3 spec lays this out as "Part 3 — Making the numbers real": an anonymous, opt-in, off-by-default upload of answers plus a short relationship-satisfaction outcome measure, to the existing Supabase project. At ~300 profiles, replace the static reliability figures with real ones. At ~300 couples with outcomes, re-derive weights by regression instead of judgment. This is the one item that would move the Alignment Index from "organized opinion" to something actually measured. See [[Known Limitations]].

## 2. Trend / re-take view
Let a person retake the assessment later and see their own trait scores change over time — a simple comparison between two of their own profiles, same device, same person. No new backend needed, just a new report view over profiles already stored locally.

## 3. Couple discussion tracker
A lightweight local checklist built from the existing "Topics to Discuss" and "Recommendations" sections, so a couple can tick off which conversations they've actually had. Stored locally — same privacy model as everything else.

## 4. Group/family mode
Currently strictly two people. A "parent–adult child" or sibling-compatibility variant could reuse the whole scoring/report pipeline with different category weighting. A natural extension of the additive architecture, not attempted yet.

## 5. Real PDF export
Today "export" means the browser's print dialog. A proper client-side PDF export (still no server, still offline) would make the report easier to save and share outside the app.

## Explicitly not recommended
- **Any new trademarked-instrument branding** (MBTI, DiSC, 16Personalities) — conflicts with existing guardrails and legal reasoning. See [[Decisions Log]].
- **Making the Alignment Index look more precise than it is** without calibration data — would contradict the project's own stated limitations.