# ⚠️ DEPRECATED MIGRATION FILES

**DO NOT USE THESE FILES FOR NEW INSTALLATIONS**

This directory contains the old migration files that have been **superseded** by the consolidated migration.

## Old Files (Deprecated)
- `001_initial_schema.sql` - ❌ DEPRECATED
- `002_couplebond_tables.sql` - ❌ DEPRECATED

## Current File (Use This)
- `001_couplebond_schema.sql` - ✅ **USE THIS FOR NEW INSTALLATIONS**

## Why Were They Deprecated?

The old migrations had several issues:
1. **Overlapping definitions** - Both files tried to add `couple_id` and `name` to users
2. **Table name conflicts** - 001 used `photo_collages`, 002 used `photos`
3. **Missing columns** - Neither had all columns needed by route handlers
4. **Schema errors** - `couple_id` marked as UNIQUE in users (incorrect)
5. **Incomplete triggers** - Some tables missing updated_at triggers

## If You Have an Existing Database

See `MIGRATION_GUIDE.md` for instructions on migrating from the old schema to the new one.

## For New Installations

Simply run:
```bash
psql -U postgres -d your_database -f migrations/001_couplebond_schema.sql
```

This single file contains everything you need.

---

**Last Updated:** November 2024
**Migration Author:** Backend Debugging & Improvement Project
