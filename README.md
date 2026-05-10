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
