# Vercel Click-by-Click Deployment Guide

## Part 1: Put the app on GitHub

1. Download or copy the `job-board-webapp` folder to your laptop.
2. Create a new GitHub repository, for example: `nitu-job-board`.
3. Upload the contents of `job-board-webapp` into that repository.
4. Make sure the repo contains files like `package.json`, `app/page.tsx`, `vercel.json`, and `README.md` at the root.

## Part 2: Create a Supabase project

1. Go to https://supabase.com and sign in.
2. Click **New Project**.
3. Choose your organization.
4. Name the project, for example: `nitu-job-board`.
5. Set a database password and create the project.
6. Wait for the project to finish provisioning.

## Part 3: Create database tables

1. In Supabase, open the **SQL Editor**.
2. Open the file `supabase/schema.sql` from this project on your laptop.
3. Copy the full contents.
4. Paste into the SQL Editor.
5. Run the query.

## Part 4: Seed your current data

1. On your laptop, open a terminal in the project folder.
2. Run:
   ```bash
   npm install
   node scripts/generate-seed-sql.mjs
   ```
3. This creates `supabase/seed.sql`.
4. Open `supabase/seed.sql`.
5. Copy the full contents.
6. Go back to Supabase SQL Editor.
7. Paste and run it.

## Part 5: Get your Supabase keys

1. In Supabase, go to **Project Settings**.
2. Open **API**.
3. Copy these values:
   - `Project URL`
   - `anon public key`
   - `service_role key`

## Part 6: Deploy to Vercel

1. Go to https://vercel.com and sign in.
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. Vercel should detect **Next.js** automatically.
5. Before clicking Deploy, open **Environment Variables**.
6. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JOB_WATCHER_WEBHOOK_SECRET` (choose any secret string)
7. Click **Deploy**.

## Important Hobby-plan fix
If you saw the red Vercel cron error, that is expected on the Hobby plan.

I already removed the 3-hour Vercel cron from `vercel.json`.

So now the app should deploy normally on the free plan.

For scheduled watcher runs on a free setup, use the included GitHub Actions workflow instead:
- `.github/workflows/job-watcher.yml`

## Part 7: Verify deployment

After deployment, open:
- `/`
- `/api/health`
- `/api/watch-jobs?token=YOUR_SECRET`

If Supabase is connected correctly, the app should show **Data mode: Live Supabase data**.

## Part 8: Optional scheduled watcher on free plan
GitHub Actions is already configured to run every 3 hours.
If GitHub Actions is enabled in your repo, that can be your free scheduled runner.

## Part 9: What to do next after deployment

1. Build more provider-specific adapters for companies with anti-bot or dynamic career systems.
2. Improve ingestion of watcher results into the visible dashboard.
3. Add alerting for newly discovered roles.
