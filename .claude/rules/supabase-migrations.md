---
paths:
  - "supabase/migrations/**"
---

## Supabase Migrations

### File Naming Convention

Migration files MUST follow: `YYYYMMDDHHmmss_short_description.sql`

- `YYYY` - Four digits for year (e.g., `2024`)
- `MM` - Two digits for month (01-12)
- `DD` - Two digits for day (01-31)
- `HH` - Two digits for hour in 24h format (00-23)
- `mm` - Two digits for minute (00-59)
- `ss` - Two digits for second (00-59)

Example: `20240906123045_create_profiles.sql`
