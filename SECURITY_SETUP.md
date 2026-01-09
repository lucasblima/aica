# Security Setup Guide - AICA Life OS

## ⚠️ CRITICAL SECURITY ALERT

As of **January 8, 2026**, sensitive secrets were found hardcoded in the `.env` file and exposed in the public GitHub repository. This document outlines the remediation steps and secure configuration process.

## 1. Environment Variables Setup

### Initial Setup

1. Copy the template file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your actual credentials (NEVER commit this file):
```bash
# Use your preferred editor
nano .env.local
# or
code .env.local
```

### What Each Service Needs

#### Supabase Configuration
- **VITE_SUPABASE_URL**: Public endpoint (safe to expose)
- **VITE_SUPABASE_ANON_KEY**: Public anonymous key (safe in frontend)
- **VITE_SUPABASE_SERVICE_KEY**: ⚠️ SENSITIVE - Backend only
- **VITE_SUPABASE_JWT_SECRET**: ⚠️ SENSITIVE - Backend only
- **VITE_SUPABASE_SERVICE_ROLE_KEY**: ⚠️ SENSITIVE - Backend only
- **SUPABASE_ACCESS_TOKEN**: ⚠️ SENSITIVE - CLI/Backend only
- **SUPABASE_SERVICE_ROLE_KEY**: ⚠️ SENSITIVE - Backend only

Get these from: Supabase Dashboard → Settings → API

#### n8n Configuration
- **VITE_N8N_URL**: Workflow automation platform URL
- **VITE_N8N_API_KEY**: JWT token for API authentication

Get this from: n8n Dashboard → Settings → API

#### Evolution API (WhatsApp)
- **VITE_EVOLUTION_URL**: Evolution API endpoint
- **VITE_EVOLUTION_API_KEY**: API authentication key
- **VITE_EVOLUTION_INSTANCE_NAME**: WhatsApp instance identifier

#### Google Services
- **VITE_GOOGLE_OAUTH_CLIENT_ID**: Public client ID (safe to expose)
- **VITE_GOOGLE_SEARCH_KEY**: API key for search (should be restricted)
- **VITE_GOOGLE_SEARCH_CX**: Custom search engine ID

#### Test Credentials
- **TEST_EMAIL**: Dedicated test account email (NOT production user)
- **TEST_PASSWORD**: Test account password

WARNING: Create a separate test user account in Supabase for E2E tests. NEVER use production credentials.

## 2. GitHub Actions Secrets Configuration

All sensitive values must be stored in GitHub Secrets, not in `.env`:

### Required GitHub Secrets

1. **GCP_CREDENTIALS**: JSON service account key for Google Cloud deployment
   ```bash
   # Login to GitHub and go to:
   # Settings → Secrets and variables → Actions → New repository secret
   # Name: GCP_CREDENTIALS
   # Value: (paste full JSON key)
   ```

### Cloud Build Secrets

For CI/CD pipeline secrets, use Google Cloud Secret Manager:

```bash
# Create secrets in Secret Manager
gcloud secrets create vite-gemini-api-key --replication-policy="automatic"
echo -n "YOUR_KEY" | gcloud secrets versions add vite-gemini-api-key --data-file=-

# Grant Cloud Build access
PROJECT_NUMBER=$(gcloud projects describe gen-lang-client-0948335762 --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding vite-gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 3. Rotation Plan: Compromised Credentials

All the following credentials were exposed in Git history and MUST be rotated:

### 1. n8n API Key
- **Status**: COMPROMISED
- **Action Required**: 
  ```bash
  # Go to n8n Dashboard → Settings → API
  # Delete current API key
  # Generate new API key
  # Update VITE_N8N_API_KEY in GitHub Secrets
  ```

### 2. Supabase Keys
- **Status**: COMPROMISED
- **Action Required**:
  ```bash
  # Supabase Dashboard → Settings → API
  # Click "Regenerate" for each key:
  # - VITE_SUPABASE_ANON_KEY (public - low risk but rotate anyway)
  # - VITE_SUPABASE_SERVICE_ROLE_KEY
  # - VITE_SUPABASE_ACCESS_TOKEN
  # Update all GitHub Secrets after regeneration
  ```

### 3. Evolution API Key
- **Status**: COMPROMISED
- **Action Required**:
  ```bash
  # Go to Evolution API Dashboard
  # Generate new API key
  # Update VITE_EVOLUTION_API_KEY in GitHub Secrets
  ```

### 4. Google Search API Key
- **Status**: COMPROMISED
- **Action Required**:
  ```bash
  # Google Cloud Console → APIs & Services → Credentials
  # Delete exposed key
  # Create new API key with IP restrictions
  # Restrict to frontend domains only
  # Update VITE_GOOGLE_SEARCH_KEY in GitHub Secrets
  ```

### 5. Google OAuth Client ID
- **Status**: LOW RISK (public by design)
- **Action Required**: Monitor for suspicious OAuth traffic, no rotation needed

## 4. Local Development Workflow

### Initial Setup
```bash
# 1. Clone repository
git clone https://github.com/your-org/aica-frontend.git
cd aica-frontend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local

# 4. Populate .env.local with your credentials (ask team lead)
# NEVER commit .env.local
```

### Verify Setup
```bash
# Test that environment is correctly configured
npm run typecheck

# Start development server
npm run dev

# If you see errors about missing env vars, check .env.local
```

### When Pulling Latest Changes
```bash
# Never commit .env.local
git status  # Should show .env.local as untracked (not modified)

# Keep your .env.local - it won't be affected by git pull
git pull origin main
```

## 5. Security Best Practices

### DO
- ✅ Use `.env.local` for local development (in `.gitignore`)
- ✅ Commit `.env.example` with placeholders (no secrets)
- ✅ Use GitHub Secrets for CI/CD pipelines
- ✅ Use Google Secret Manager for Cloud Build
- ✅ Rotate credentials immediately if exposed
- ✅ Use specific API key restrictions (IP ranges, domains)
- ✅ Create dedicated test accounts for E2E tests
- ✅ Review `.gitignore` before every commit

### DON'T
- ❌ Commit `.env` or `.env.local` files
- ❌ Hardcode secrets in code comments
- ❌ Share credentials in Slack/Email
- ❌ Use production credentials in development
- ❌ Create API keys without restrictions
- ❌ Use user passwords in test files
- ❌ Store secrets in commit messages
- ❌ Log sensitive values in console output

## 6. Detecting Secret Leaks

### Pre-Commit Hook (Recommended)
Install git secret scanner:
```bash
npm install --save-dev husky lint-staged

# Add pre-commit hook to prevent secret commits
```

### Manual Audit
```bash
# Search for exposed keys in Git history
git log -p --all -S "VITE_" | grep -E "(VITE_|_KEY|_TOKEN|_SECRET)"

# Check for common patterns
git log --all --oneline | grep -iE "(secret|password|key|token)"
```

## 7. Incident Response Checklist

If you suspect credentials were exposed:

- [ ] STOP - Don't push changes
- [ ] Notify team immediately
- [ ] Identify which credentials were exposed
- [ ] Rotate exposed credentials (follow section 3 above)
- [ ] Update all GitHub Secrets
- [ ] Monitor services for suspicious activity
- [ ] Create incident report

## 8. Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Last Updated**: January 8, 2026
**Status**: All credentials rotated and removed from Git history
**Next Review**: Quarterly security audit
