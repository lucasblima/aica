# Fix: Supabase Edge Function Secrets Blocked (Issue #83)

**Issue:** https://github.com/lucasblima/Aica_frontend/issues/83
**Date:** 2026-01-10
**Status:** RESOLVED

---

## Problem Description

Cannot update Edge Function secrets in Supabase Dashboard.

## Solution Applied

1. Deleted all Edge Functions from Supabase Dashboard
2. Updated secrets (Evolution API credentials)
3. Re-deployed functions

## Credentials Updated

| Secret | Value |
|--------|-------|
| `EVOLUTION_INSTANCE_NAME` | `AI_Comtxae_4006` |
| `EVOLUTION_API_KEY` | `9BE943A8B11D-4260-9EFC-7B1F26B51BAB` |
| `EVOLUTION_API_URL` | `https://evolution-evolution-api.w9jo16.easypanel.host` |

## Note

The following secrets are **managed by Supabase** and cannot be edited:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

This is expected behavior.

---

**Document Owner:** Claude Code
**Last Updated:** 2026-01-10
