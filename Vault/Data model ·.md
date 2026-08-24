---
title: Data Model
tags:
  - matchwise
  - technical
---
# Data Model

## A profile
Each completed assessment becomes a **profile**: an id, creation date, app version, raw answers, and derived trait scores. Version (v2/v3/v4…) is inferred from *which question ids appear in the answers* — nothing is stamped on the file. That's what lets old profiles keep working with zero migration.

## Where profiles live
- **localStorage**, by default — nothing leaves the device.
- **Exported `.json` file** — plain JSON by default; optional AES-GCM-256 local encryption (`crypto-v5.js`), off by default, tied to the device's own key. Turning encryption on doesn't add a password — it makes the file unreadable outside that one browser.
- **Share codes** — an 8-character code backed by a Supabase table (`supabase/schema.sql`). This is how two partners actually exchange profiles without emailing a file.

## Supabase share-code security model
Row-level security is **on**, with **no policies** — the public key can't query the table directly at all. The only access is through two `SECURITY DEFINER` functions (`create_profile`, `get_profile`). Practical effect: nobody can list codes or enumerate them in bulk; guessing one out of roughly 1.1 trillion combinations would take one HTTP call at a time. Codes expire after 6 months.

## Demo profiles
Two illustrative profiles, generated live from the real current question bank with a small seeded random generator — never hand-typed (so they can't drift out of sync with the question bank), never saved to Supabase, never exportable, always tagged `demo: true`.

## See also
[[Architecture]] · [[Assessment Design]]