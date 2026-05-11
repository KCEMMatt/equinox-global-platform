# Equinox Global Platform

## v8 — Acquisition Engine Daily Workflow

This version improves usability before moving deeper into automation.

### Added
- Auto-categorised acquisition matches
- Match explanation cards
- Shortlist / Review Later / Pass actions
- Duplicate detection for imported listings
- Import health metrics
- Smarter review queue
- Hardened Level 3 importer endpoint
- External scraper webhook remains available at `/api/apify-webhook`

### Supabase
Run this after uploading v8:

```text
supabase/acquisition_engine_v8_usability.sql
```

You should already have run the master schema. This SQL only adds the v8 fields/views/indexes.

### Environment variables
Set these in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
IMPORT_WEBHOOK_TOKEN optional, for external scraper webhook security
```
