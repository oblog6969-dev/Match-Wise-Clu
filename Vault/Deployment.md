---
title: Deployment
tags:
  - matchwise
  - technical
---
# Deployment

It's a static site — no build step required to run it, no environment variables.

## Before deploying
If anything under `js/` changed, rebuild the single-file bundle first:
```
node build-single.js
```
This regenerates `MatchWise-preview.html` and self-checks for missing files or a stale service-worker cache name.

## Bump the cache name
Installed phones serve from cache first. If `sw.js`'s `CACHE` name isn't bumped on a release that changes any cached file, installed users keep the old version indefinitely.

## Deploy
From the project folder:
```
npx vercel --prod
```
Or push to GitHub and connect the repo to Vercel — same static-site deploy, no server config.

## See also
[[Architecture]]