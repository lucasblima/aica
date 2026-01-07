# Environment Variables Configuration Guide

## Overview

AICA uses Vite for building the frontend application. Vite replaces `import.meta.env.VITE_*` variables at **compile time**, meaning these values must be available when running `npm run build`.

This document explains how to configure environment variables for:
- Local development
- Production builds via Google Cloud Build
- Adding new environment variables

---

## Quick Reference: Required Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | **Yes** | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase anonymous (public) key |
| `VITE_FRONTEND_URL` | Recommended | Production URL for OAuth redirects |
| `VITE_GEMINI_API_KEY` | **DEPRECATED** | ~~Gemini AI API key~~ - Now uses Edge Functions |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | Optional | Google OAuth client ID |
| `VITE_GOOGLE_OAUTH_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `VITE_PDF_EXTRACTOR_URL` | Optional | PDF extraction microservice URL |
| `VITE_N8N_WEBHOOK_URL` | Optional | n8n webhook URL |
| `VITE_EVOLUTION_INSTANCE_NAME` | Optional | Evolution API instance name |

> **Note:** `VITE_GEMINI_API_KEY` has been deprecated. All Gemini API calls now go through Supabase Edge Functions (`edgeFunctionService.ts`). The API key is stored securely in Supabase secrets, not exposed to the frontend.

---

## Local Development Setup

### Step 1: Create `.env` file

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

### Step 2: Configure values

Edit `.env` with your actual credentials:

```env
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional but recommended
VITE_FRONTEND_URL=http://localhost:3000

# NOTE: VITE_GEMINI_API_KEY is no longer needed - Gemini API uses Edge Functions
```

### Step 3: Run development server

```bash
npm run dev
```

The development server will automatically load variables from `.env`.

---

## Production Build (Google Cloud Build)

### Architecture Overview

```
Cloud Build Trigger
        |
        v
+-------------------+
| cloudbuild.yaml   |
| - substitutions   |  <-- Non-sensitive values (URLs, public keys)
| - secretEnv       |  <-- Sensitive values from Secret Manager
+-------------------+
        |
        v (--build-arg)
+-------------------+
| Dockerfile        |
| - ARG VITE_*      |  <-- Receives build arguments
| - ENV VITE_*      |  <-- Converts to environment variables
| - npm run build   |  <-- Vite injects values at compile time
+-------------------+
        |
        v
+-------------------+
| /app/dist         |  <-- Static files with hardcoded values
+-------------------+
```

### Configuring Values in cloudbuild.yaml

#### Non-Sensitive Values (substitutions)

Edit `cloudbuild.yaml` to set default values:

```yaml
substitutions:
  _VITE_SUPABASE_URL: https://your-project.supabase.co
  _VITE_SUPABASE_ANON_KEY: your-anon-key-here
  _VITE_FRONTEND_URL: https://your-app.run.app
```

These values are passed to Docker via `--build-arg`:

```yaml
docker build \
  --build-arg VITE_SUPABASE_URL="${_VITE_SUPABASE_URL}" \
  ...
```

#### Sensitive Values (Secret Manager)

For sensitive values like API keys, use Google Cloud Secret Manager.

**Step 1: Create the secret**

```bash
# Create a new secret
gcloud secrets create vite-gemini-api-key \
  --replication-policy="automatic" \
  --project=YOUR_PROJECT_ID

# Add the secret value
echo -n "YOUR_ACTUAL_API_KEY" | \
  gcloud secrets versions add vite-gemini-api-key --data-file=-
```

**Step 2: Grant Cloud Build access**

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

# Grant accessor role
gcloud secrets add-iam-policy-binding vite-gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Step 3: Reference in cloudbuild.yaml**

```yaml
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/vite-gemini-api-key/versions/latest
      env: 'VITE_GEMINI_API_KEY'

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - '-c'
      - |
        docker build \
          --build-arg VITE_GEMINI_API_KEY="$$VITE_GEMINI_API_KEY" \
          ...
    secretEnv: ['VITE_GEMINI_API_KEY']
```

Note the `$$` prefix for secret environment variables.

---

## Adding a New Environment Variable

Follow these steps when adding a new `VITE_*` variable:

### 1. Update Dockerfile

Add ARG and ENV declarations:

```dockerfile
# In the builder stage, before npm run build:
ARG VITE_NEW_VARIABLE
ENV VITE_NEW_VARIABLE=$VITE_NEW_VARIABLE
```

### 2. Update cloudbuild.yaml

**For non-sensitive values:**

```yaml
substitutions:
  _VITE_NEW_VARIABLE: 'default-value'

# In the docker build command:
--build-arg VITE_NEW_VARIABLE="${_VITE_NEW_VARIABLE}"
```

**For sensitive values:**

```yaml
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/vite-new-variable/versions/latest
      env: 'VITE_NEW_VARIABLE'

# In the docker build command:
--build-arg VITE_NEW_VARIABLE="$$VITE_NEW_VARIABLE"
secretEnv: ['VITE_NEW_VARIABLE']
```

### 3. Update .env.example

Add documentation for the new variable:

```env
# Description of what this variable does
VITE_NEW_VARIABLE=example-value
```

### 4. Update src/lib/envCheck.ts (Optional)

If the variable is critical, add validation:

```typescript
// In the EnvConfig interface:
newVariable?: string;

// In the validateEnv function:
newVariable: import.meta.env.VITE_NEW_VARIABLE,

// Add validation if required:
if (!config.newVariable) {
  errors.push('VITE_NEW_VARIABLE is not configured.');
}
```

### 5. Update this documentation

Add the new variable to the Quick Reference table.

---

## Troubleshooting

### Problem: 401 Unauthorized on OAuth

**Symptom:** Login fails in production with 401 error.

**Cause:** `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is not set.

**Solution:**
1. Check browser console for "VITE_SUPABASE_URL is not configured" message
2. Verify values in `cloudbuild.yaml` substitutions
3. Trigger a new build

### Problem: "VITE_GEMINI_API_KEY not configured" warning

**Cause:** The Gemini API key secret is not accessible.

**Solution:**
1. Verify secret exists: `gcloud secrets list`
2. Check Cloud Build has access: `gcloud secrets get-iam-policy vite-gemini-api-key`
3. Verify secret name matches `cloudbuild.yaml`

### Problem: Environment variables work locally but not in production

**Cause:** Variables are not being passed during Docker build.

**Solution:**
1. Check Cloud Build logs for "Build Environment" debug output
2. Verify `--build-arg` is present for each variable
3. Ensure `ARG` and `ENV` declarations are in Dockerfile

### Debugging Production Build

The Dockerfile includes debug output during build:

```
=== Build Environment ===
VITE_SUPABASE_URL: https://xxxxx...
VITE_SUPABASE_ANON_KEY: SET
VITE_GEMINI_API_KEY: SET
VITE_FRONTEND_URL: https://...
=========================
```

Check Cloud Build logs to verify variables are set.

### Runtime Verification

Open browser console on the production site. The app logs environment status on startup:

```
[ENV] Environment Configuration Status:
  Mode: production (PRODUCTION)

  Required Variables:
    VITE_SUPABASE_URL: SET
    VITE_SUPABASE_ANON_KEY: SET
```

If you see "MISSING" for required variables, rebuild the application.

---

## Security Considerations

### What is safe to commit

- `VITE_SUPABASE_URL` - Public project URL
- `VITE_SUPABASE_ANON_KEY` - Public anonymous key (designed for client use)
- `VITE_FRONTEND_URL` - Public application URL

### What should NEVER be committed

- `VITE_GEMINI_API_KEY` - Should use Secret Manager
- `VITE_GOOGLE_OAUTH_CLIENT_SECRET` - Should use Secret Manager
- `VITE_SUPABASE_SERVICE_KEY` - Should NEVER be in frontend
- Any JWT secrets or private keys

### Verifying .gitignore

Ensure `.env` files are ignored:

```bash
git check-ignore .env
# Should output: .env
```

---

## File Reference

| File | Purpose |
|------|---------|
| `.env` | Local development variables (gitignored) |
| `.env.example` | Template with placeholder values (committed) |
| `Dockerfile` | Declares ARG/ENV for build-time injection |
| `cloudbuild.yaml` | Passes values via --build-arg |
| `src/lib/envCheck.ts` | Runtime validation and debugging |
| `vite.config.ts` | Vite configuration (uses loadEnv) |

---

## Related Documentation

- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Quick Start Deployment](./QUICK_START_DEPLOYMENT.md)
- [Google Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
