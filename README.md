# Equinox Global Platform v9 — AI Acquisition Automation

This version builds on v8 and adds the first automation layer for the Acquisition Engine.

## Added

- Scheduled import architecture
- Manual "Run Scheduled Imports" action
- AI-style property enrichment endpoint
- Risk flags and opportunity insights
- Daily acquisition feed inside Acquisition Engine
- Notifications table support
- Price/history tracking foundation
- Vercel cron config

## New API Routes

- `/api/run-scheduled-imports`
- `/api/ai-enrich-property`

## SQL to run

Run this in Supabase after upload:

```text
supabase/acquisition_ai_v9.sql
```

## Notes

The enrichment logic is currently rule-based so it works without an OpenAI API key. Later, this can be upgraded to true AI document/listing analysis once the import pipeline is stable.
