# Equinox Capital V1

A Next.js + Supabase + Vercel starter for the Equinox Capital director dashboard.

## Included in V1

- Supabase email/password login
- Company/team based data model
- Responsive desktop + iPhone layout
- Branded navy/gold/ivory design using the supplied Equinox assets
- Dashboard first screen
- Properties tab
- Upcoming Properties tab with Settlement button
- Leases tab
- Loans tab with private/lender pie chart
- Valuations tab with historical valuation records
- Calendar view for leases, loan dates, upcoming settlements and manual events
- Investor Mode presentation view
- Supabase Storage upload support with folder names

## 1. Create Supabase project

Create a project in Supabase, then open **SQL Editor** and run:

`supabase/schema.sql`

This creates tables, security policies, and the private `company-files` storage bucket.

## 2. Get Supabase keys

In Supabase, go to **Project Settings > API** and copy:

- Project URL
- anon public key

## 3. Run locally

```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:3000

## 4. Deploy to Vercel

1. Push this folder to GitHub.
2. Import the GitHub repo into Vercel.
3. Add these Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

## 5. Adding your business partner

This app uses company-based access. The first logged-in user creates the Equinox Capital company automatically.

To add another director:

1. Create their Supabase Auth user or let them sign up.
2. In Supabase Table Editor, open `company_memberships`.
3. Add a row with:
   - same `company_id` as your company
   - their `user_id`
   - role: `director`

Then they can log in separately and see the same portfolio data.

## Notes

- This is a clean Version 1 foundation, not the final enterprise build.
- Email/SMS reminders are represented in-app in Phase 1. True outbound reminders should be added with Supabase Edge Functions or another scheduled service.
- Investor Mode is a presentable view inside the app. PDF/PPT export can be added next.
