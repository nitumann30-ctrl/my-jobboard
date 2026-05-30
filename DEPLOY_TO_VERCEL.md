# Deploy to Vercel

This project is now prepared for Vercel deployment.

## Fastest path

1. Put the `job-board-webapp` folder in a GitHub repository.
2. Go to Vercel.
3. Click **Add New Project**.
4. Import the GitHub repository.
5. Keep the default framework as **Next.js**.
6. Deploy.

## Environment variables

For the current sample-data version, no environment variables are required to see the app UI.

For the watcher endpoint and Supabase connection, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOB_WATCHER_WEBHOOK_SECRET`

## What works right away after deployment

- Jobs dashboard
- Contacts CRM
- Personalized message studio
- Company watchlist
- Outreach log
- Health endpoint at `/api/health`
- Watcher endpoint at `/api/watch-jobs`

## Vercel Hobby plan note
Vercel Hobby does **not** allow cron schedules more than once per day.

Because of that, this project no longer uses Vercel Cron in `vercel.json`.

If you want the watcher to run on a free setup, use the included GitHub Actions workflow:
- `.github/workflows/job-watcher.yml`

That workflow is already set to run every 3 hours.

## What is now real and what is still partial

### Real now
- `/api/watch-jobs` performs best-effort live checking of your configured Germany target companies
- watcher logic fetches official career or hiring-related pages
- it extracts structured JobPosting data where possible
- it falls back to anchor-based listing extraction when structured jobs are missing
- it scores matches against your role profile and Germany signals

### Still partial
- some company sites use anti-bot or dynamic rendering and may return blocked or partial results
- provider-specific adapters are still needed for the most reliable coverage
- alerts and live ingestion into the UI can be improved further

## Local verification before deploy

```bash
npm install
npm run dev
npm run watch:jobs
```

Open:
- `http://localhost:3000`
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/watch-jobs`
