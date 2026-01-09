# Environment Variables & Security Setup - Phase 1

**Status:** Issue #73 - Phase 1 Implementation
**Date:** 2026-01-08
**Severity:** CRITICAL

---

## Executive Summary

This document defines the correct setup for environment variables in AICA Life OS, addressing critical security issues identified in Issue #73:

- ❌ **Was:** Secrets exposed in frontend .env files
- ✅ **Now:** Secrets only in Supabase Edge Functions
- ✅ **Templates:** Updated to prevent accidental secret exposure

---

## Frontend (.env.local) - PUBLIC ONLY

### ✅ Safe to Expose (No Security Risk)

Frontend .env files should ONLY contain non-sensitive configuration:

```env
# Supabase Project Configuration
VITE_SUPABASE_URL=https://gppebtrshbvuzatmebhr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OAuth (only Client ID, not Secret)
VITE_GOOGLE_OAUTH_CLIENT_ID=5562559893-j9n4ec5vo4dlo4c30hpefca1nf8md0bo.apps.googleusercontent.com

# Public URLs
VITE_FRONTEND_URL=https://aica-staging-5p22u2w6jq-rj.a.run.app
VITE_API_URL=http://localhost:3000
```

### ❌ NEVER in Frontend

These secrets MUST NOT appear in any frontend .env file:

```env
# ❌ CRITICAL: Service keys for Supabase
VITE_SUPABASE_SERVICE_KEY=...         # Never expose
VITE_SUPABASE_JWT_SECRET=...          # Never expose
VITE_SUPABASE_SERVICE_ROLE_KEY=...    # Never expose

# ❌ CRITICAL: Evolution API (WhatsApp)
VITE_EVOLUTION_API_KEY=...            # Never expose
VITE_EVOLUTION_INSTANCE_NAME=...      # Never expose
VITE_EVOLUTION_URL=...                # Never expose

# ❌ CRITICAL: AI APIs
VITE_GEMINI_API_KEY=...               # Never expose
NEXT_PUBLIC_GEMINI_API_KEY=...        # Never expose

# ❌ CRITICAL: OAuth
VITE_GOOGLE_OAUTH_CLIENT_SECRET=...   # Never expose
```

---

## Backend (Supabase Edge Functions) - SECRETS ONLY

### Configuration Location

Secrets are stored in **Supabase Dashboard → Settings → Secrets**

```bash
# How to add secrets to Supabase Edge Functions:
# 1. Go to Supabase Dashboard
# 2. Select your project (gppebtrshbvuzatmebhr)
# 3. Navigate to Settings → Secrets
# 4. Click "Create new secret"
# 5. Add environment variable pairs
```

### Required Secrets for Edge Functions

```env
# Gemini AI
GEMINI_API_KEY=AIzaSy...

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://evolution-api.com/
EVOLUTION_API_KEY=9BE943A8...
EVOLUTION_INSTANCE_NAME=AI_Comtxae_4006

# Supabase (auto-provided by Supabase)
SUPABASE_URL=https://gppebtrshbvuzatmebhr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Edge Function Access Pattern

```typescript
// ✅ Correct: Access secrets in Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Secrets are automatically available as env vars in Edge Functions
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

  // Use them securely (never return them to frontend)
  const response = await fetch("https://gemini-api.com/...", {
    headers: {
      "Authorization": `Bearer ${GEMINI_API_KEY}`,
    },
  });

  // Return results to frontend (without exposing keys)
  return new Response(JSON.stringify(result));
});
```

---

## Frontend-to-Backend Communication Pattern

### ❌ Old Pattern (BROKEN - Security Risk)

```typescript
// ❌ WRONG: Frontend calling external APIs with secrets
const response = await fetch("https://evolution-api.com/messages", {
  headers: {
    "Authorization": `Bearer ${VITE_EVOLUTION_API_KEY}`, // ❌ Exposed in bundle!
  },
});
```

### ✅ New Pattern (CORRECT - Secure)

```typescript
// ✅ CORRECT: Frontend calls Edge Function, Edge Function calls external API
const response = await fetch("/functions/v1/evolution-send-message", {
  method: "POST",
  body: JSON.stringify({ message: "Hello" }),
});

// Edge Function handles API call with secrets:
// → Frontend sends data
// → Edge Function adds authentication headers
// → Edge Function calls Evolution API
// → Edge Function returns result to frontend (secrets stay hidden)
```

---

## Local Development Setup

### Step 1: Create .env.local

```bash
# Copy template from .env.example
cp .env.example .env.local

# Add your development values
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://gppebtrshbvuzatmebhr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
VITE_FRONTEND_URL=http://localhost:3000
EOF
```

### Step 2: .env.local is Automatically Ignored

```bash
# Verify .env.local is in .gitignore
grep "\.env\.local" .gitignore  # Should show: .env.local

# Verify Git ignores it
git status  # Should NOT show .env.local
```

### Step 3: Start Development

```bash
npm run dev  # Uses .env.local for development
```

---

## Production Deployment

### Staging (Cloud Run)

Secrets are injected via Supabase Edge Functions:

```bash
# 1. Configure secrets in Supabase Dashboard
# 2. Deploy via git push
git push origin main

# 3. Cloud Build automatically:
# - Pulls latest code
# - Deploys Edge Functions with secrets
# - Starts Cloud Run container (no secrets in env)

# 4. Frontend bundle contains ONLY public config
# (VITE_* variables become part of the build)
```

### Verification

```bash
# Check that Edge Functions have secrets
curl https://aica-staging-5p22u2w6jq-rj.a.run.app/functions/v1/health

# Check that frontend bundle does NOT have secrets
curl https://aica-staging-5p22u2w6jq-rj.a.run.app/index.html | grep EVOLUTION_API_KEY
# Should return: nothing (secret not exposed)
```

---

## Security Checklist

### Before Pushing to Main

- [ ] `.env.local` is in `.gitignore`
- [ ] `.env.local` does NOT contain any real secrets
- [ ] `.env.example` updated without secrets
- [ ] No `VITE_*` prefixed secrets exist in codebase
- [ ] All sensitive calls use Edge Functions pattern

### Templates

- [ ] `.env.example` - Updated ✅
- [ ] `supabase/.env.example` - Backend only
- [ ] `.env.test.example` - Test configuration

### Files to Remove Secrets From

- [ ] `.env` - Any real secrets (ignored anyway, but clean it)
- [ ] `.env.local` - Cleaned ✅
- [ ] `supabase/functions/.env` - Never use, use Dashboard
- [ ] `backend/.env` - Backend only, but verify

### Code Audit

- [ ] Search for `VITE_EVOLUTION_API_KEY` - Should find 0 references
- [ ] Search for `VITE_SUPABASE_SERVICE_KEY` - Should find 0 references
- [ ] Search for `VITE_GEMINI_API_KEY` - Should find 0 references
- [ ] Verify all Edge Functions use `Deno.env.get()`

---

## Audit Queries

### Find Exposed Secrets in Code

```bash
# Search for VITE_ prefixed secrets (should be 0)
grep -r "VITE_.*API_KEY" src/ --include="*.ts" --include="*.tsx"
grep -r "VITE_.*SECRET" src/ --include="*.ts" --include="*.tsx"
grep -r "VITE_EVOLUTION" src/ --include="*.ts" --include="*.tsx"
grep -r "VITE_SUPABASE_SERVICE" src/ --include="*.ts" --include="*.tsx"
```

### Verify Edge Functions Have Secrets

```bash
# List secrets configured in Supabase
supabase secrets list
```

---

## References

- **Issue #73** - Diagnóstico e Migração de Referência do Banco de Dados
- **SECURITY_SETUP.md** - Previous security documentation
- **Supabase Docs** - Environment Variables
  - https://supabase.com/docs/guides/functions/secrets
  - https://supabase.com/docs/guides/functions/environment
- **OWASP** - Sensitive Data Exposure
  - https://owasp.org/www-project-top-ten/

---

## Implementation Status

| Phase | Task | Status | Completed |
|-------|------|--------|-----------|
| 1 | Remove secrets from .env.example | ✅ | 2026-01-08 |
| 1 | Remove secrets from .env.local | ✅ | 2026-01-08 |
| 1 | Create environment security guide | ✅ | 2026-01-08 |
| 1 | Audit RLS coverage | ⏳ | Pending |
| 1 | Review foreign keys | ⏳ | Pending |
| 1 | Create RLS policy migrations | ⏳ | Pending |

---

**Next Steps:** Continue Phase 1 with RLS policies audit
