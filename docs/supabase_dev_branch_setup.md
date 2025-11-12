# Supabase Dev Branch Setup Guide

This guide covers setting up a Supabase dev branch for the Recollect project.

## Prerequisites

⚠️ **ONLY PROCEED AFTER LOCAL IS FULLY WORKING**

Make sure your local Supabase environment is running correctly before setting up a dev branch.

---

## Step 1: Create Dev Branch in Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → Branching
4. Click "Create branch"
5. Name it "dev"
6. Wait for branch creation (Supabase creates branch with schema only, no data)

## Step 2: Get Dev Branch Credentials

1. Once branch is created, click on it
2. Copy the project ref (it will be different from production)
3. Go to Settings → API
4. Copy the anon key and service role key
5. Copy the API URL

## Step 3: Enable Required Integrations

If your migration uses `supabase_functions` schema (for webhooks):

1. Go to Database → Integrations in the Supabase Dashboard
2. Enable "Database Webhooks" integration
3. This will create the `supabase_functions` schema needed for webhook triggers

## Step 4: Link CLI to Dev Branch

```bash
# Switch to dev branch (use the dev branch project-ref)
npx supabase link --project-ref <dev-branch-project-ref>
```

## Step 5: Push Schema and Data to Dev Branch

```bash
# Option 1: Push with seed file (recommended)
npx supabase db push --include-seed
```

## Step 6: Configure Dev Environment

Create `.env.development`:

```env
NEXT_PUBLIC_SUPABASE_URL=<dev-branch-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev-branch-anon-key>
NEXT_PUBLIC_SITE_URL=https://dev.yourdomain.com
# Copy other necessary env variables
```

## Step 7: Verify Dev Branch Data

```bash
# Check data counts
psql "<DEV_BRANCH_CONNECTION_STRING>" -c "SELECT COUNT(*) FROM profiles;"
psql "<DEV_BRANCH_CONNECTION_STRING>" -c "SELECT COUNT(*) FROM everything;"

# Or use Supabase SQL Editor in Dashboard
```

## Step 8: Test Dev Branch

1. Point your staging environment to dev branch
2. Test all functionality
3. Verify dev accounts work
4. Check all features work as expected

---

## Verification Checklist

### After Dev Branch Setup

- [ ] Dev branch accessible in dashboard
- [ ] Required integrations enabled (e.g., Database Webhooks if needed)
- [ ] Dev accounts can login
- [ ] Data integrity verified (counts match expected values)
- [ ] All functions operational
- [ ] Performance acceptable
- [ ] RLS policies active

---

## Troubleshooting

### Issue: Schema "supabase_functions" does not exist

**Solution**: Enable the Database Webhooks integration in the Supabase Dashboard:

1. Go to Database → Integrations
2. Enable "Database Webhooks"
3. Retry `npx supabase db push`

### Issue: Forgot to push seed data

**Solution**: Run seed separately:

```bash
npx supabase db push --include-seed
```

### Issue: Migration conflicts

**Solution**: Check which migrations have already been applied:

```bash
npx supabase migration list
```

---

## Rollback Procedures

### Dev Branch

- Can reset branch from dashboard
- Or delete and recreate branch
- Production remains unaffected

---

Last Updated: November 2025
