# Equinox Global Platform — v3 Navigation Build

This version turns the prototype into a proper multi-page Next.js app.

## Live Routes

- `/` — Command Dashboard
- `/acquisitions` — Acquisition Engine / mark opportunities
- `/criteria` — Criteria Engine
- `/properties` — Property Feed
- `/map` — Map Intelligence placeholder
- `/pipeline` — Deal Pipeline
- `/documents` — Document Vault placeholder
- `/contacts` — Agent / Partner CRM placeholder
- `/settings` — Platform settings

## Deploy

Upload the project contents to GitHub, commit changes, then Vercel will redeploy automatically.

Make sure Vercel Framework Preset is `Next.js`.

## Supabase Environment Variables

Add these in Vercel Project Settings → Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Notes

This build keeps the Equinox Global styling and prepares the app for Supabase-powered create/save actions next.

## v4 - Properties System

Added:
- Add Property workflow
- local saved property records
- search and state filters
- auto match score preview
- property detail route `/properties/[id]`
- deal cockpit with metrics, agent panel, files placeholder and editable notes
- Supabase helper schema at `supabase/properties_system_v1.sql`

Current data persistence is browser localStorage so the app can be tested immediately. Next pass should replace localStorage with Supabase CRUD.
