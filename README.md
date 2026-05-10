# Equinox Global Platform v7 — Level 3 Acquisition Importer

This version upgrades the Acquisition Engine from saved-search simulation into a scraper/API-ready import workflow.

## New in v7

- Level 3 Import Pipeline UI
- Source URLs per acquisition category
- Run Import button for saved sources
- Server route: `/api/import-source`
- External scraper webhook route: `/api/apify-webhook`
- Recent imports/review queue
- Auto-created property records from imported listings
- SQL helper: `supabase/level3_importer_v7.sql`

## Setup

1. Upload files to GitHub.
2. Let Vercel redeploy.
3. Run this SQL in Supabase:

```text
supabase/level3_importer_v7.sql
```

## Important

Some listing websites block server-side fetching or disallow scraping. Use the direct importer for URLs you are allowed to fetch. For larger automated scraping, use approved APIs, partner data feeds, or a compliant external scraper that posts results into `/api/apify-webhook`.

## Optional webhook token

In Vercel Environment Variables, you can add:

```text
IMPORT_WEBHOOK_TOKEN=your-secret-token
```

Then external importers must send:

```text
x-equinox-import-token: your-secret-token
```
