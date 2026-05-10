# Equinox Global Platform — v5 Live Supabase Integration

This version adds live Supabase persistence for the Properties System.

## What changed

- Properties load from Supabase when env vars are configured
- Add Property saves directly to `properties`
- Property notes save back to Supabase
- Property delete is wired to Supabase
- Dashboard metrics now read live property data
- Local browser storage remains as a fallback if Supabase env vars are missing

## Required Vercel environment variables

Add these in Vercel → Project → Settings → Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Then redeploy.

## Required Supabase SQL

Run:

```text
supabase/live_properties_v5.sql
```

This creates/patches the `properties` table and adds temporary open RLS policies for the build phase.

## Important

The RLS policies are intentionally open for early testing. Before investor/client access, replace them with proper authenticated company/team permissions.
