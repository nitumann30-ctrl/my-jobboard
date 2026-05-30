# Nitu Job Board Web App

Full web app version of the personal job board.

## Stack
- Next.js
- TypeScript
- Supabase-ready schema
- Local sample data already loaded from your current job board and outreach work

## Version 1 scope
- Jobs dashboard
- Contacts CRM
- Personalized message studio
- Company watchlist
- Outreach log
- 24/7 watcher blueprint

## Local setup
```bash
cd job-board-webapp
npm install
npm run dev
```

## Deploy-ready target
This app is structured for Vercel deployment and Supabase-backed persistence.

## What is already included
- Seed roles from your current board
- Seed contacts from your imported target-company list
- Personalized message drafts loaded into the UI
- Company watchlist based on your 11 imported target companies

## What now supports real monitoring
- `/api/watch-jobs` now runs a real best-effort watcher against the configured target-company sources
- `scripts/watch-jobs.mjs` now performs the same best-effort watcher logic locally or in CI
- If Supabase is configured, watcher results can be written into the `roles` table and logged in `watcher_runs`

## Current watcher coverage
The watcher currently covers the companies already in your target watchlist:
- Deutsche Bank
- Porsche Consulting
- OBI Group Holding
- Munich Re
- Covestro
- KPMG Germany
- Siemens
- SAP
- Bayer
- Henkel
- adidas

## Important limitation
Some company career pages use anti-bot protection, client-side rendering, or dynamic search systems.
The watcher therefore uses a mixed approach:
- fetch official career or hiring-related pages
- extract JSON-LD JobPosting objects where available
- extract anchor-based job matches as a fallback
- score jobs against your target people/wellbeing/OD profile and Germany location signals

This is real watcher logic, but it is still best-effort. Some companies may return partial or blocked results until provider-specific adapters are added.

## Local watcher run
```bash
npm install
npm run watch:jobs
```

This writes:
- `data/job-feed.json`

## Supabase wiring status
The UI can now:
- load sample data when Supabase is not configured
- switch to live Supabase data when credentials are present
- persist message drafts and outreach status actions through API routes

## Recommended next build step
1. Add provider-specific adapters for companies with anti-bot or heavily dynamic career pages.
2. Add ingestion of watcher output directly into the dashboard UI.
3. Add alerting for newly discovered roles.

## Vercel deployment
See `DEPLOY_TO_VERCEL.md` and `VERCEL_CLICK_BY_CLICK.md`.
