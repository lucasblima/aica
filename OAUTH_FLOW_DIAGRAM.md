# OAuth PKCE Flow - Where the 401 Error Occurs

## Complete OAuth Flow Diagram

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Clicks "Login with Google"
       ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend (Aica Life OS)                                │
│  https://aica-5562559893.southamerica-east1.run.app     │
├─────────────────────────────────────────────────────────┤
│  - Generates code_verifier (random 128 chars)           │
│  - Calculates code_challenge = SHA256(code_verifier)    │
│  - Stores code_verifier in cookie                       │
│  - Redirects to Google OAuth                            │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 2. Redirect to Google with:
       │    - client_id
       │    - redirect_uri = https://aica-5562559893...
       │    - code_challenge
       ▼
┌─────────────────────────────────────────────────────────┐
│  Google OAuth Server                                    │
├─────────────────────────────────────────────────────────┤
│  - Shows consent screen                                 │
│  - User approves                                        │
│  - Generates authorization code                         │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 3. Redirects back with authorization code
       │    https://aica-5562559893.../auth/callback?code=XXX
       ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend (Aica Life OS)                                │
├─────────────────────────────────────────────────────────┤
│  - Reads code_verifier from cookie                      │
│  - Calls Supabase Auth API with code + code_verifier    │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 4. POST /auth/v1/token?grant_type=pkce
       │    Body: { code, code_verifier }
       ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase Auth Backend                                  │
│  https://uzywajqzbdbrfammshdg.supabase.co              │
├─────────────────────────────────────────────────────────┤
│  - Receives code + code_verifier from frontend          │
│  - Prepares to exchange code for tokens                 │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 5. POST https://oauth2.googleapis.com/token
       │    Body:
       │      grant_type: authorization_code
       │      code: XXX
       │      redirect_uri: https://uzywajqzbdbrfammshdg.supabase.co/auth/v1/callback  ← KEY!
       │      client_id: 5562559893-1ufv0knok8k4679kr35p7aqdhp55drg0.apps.googleusercontent.com
       │      client_secret: REDACTED_OAUTH_SECRET
       │      code_verifier: [from cookie]
       ▼
┌─────────────────────────────────────────────────────────┐
│  Google OAuth Token Endpoint                            │
├─────────────────────────────────────────────────────────┤
│  VALIDATION CHECKS:                                     │
│  ✓ client_id matches registered client                  │
│  ✓ client_secret is correct                             │
│  ✓ code is valid and not expired                        │
│  ✓ code_verifier matches original code_challenge        │
│  ❌ redirect_uri is in authorized list?  ← 401 HERE!    │
│                                                          │
│  IF redirect_uri NOT in authorized list:                │
│    → Return 401 Unauthorized                            │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 6. 401 Unauthorized
       ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase Auth Backend                                  │
├─────────────────────────────────────────────────────────┤
│  - Receives 401 from Google                             │
│  - Returns 401 to frontend                              │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 7. POST /auth/v1/token 401 (Unauthorized)
       ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend (Aica Life OS)                                │
├─────────────────────────────────────────────────────────┤
│  - Receives 401 error                                   │
│  - Shows in console:                                    │
│    ❌ POST .../auth/v1/token?grant_type=pkce 401        │
│  - Auth state: SIGNED_OUT                               │
└─────────────────────────────────────────────────────────┘
```

## Root Cause

**The 401 happens at Step 5** when Google validates Supabase's token exchange request.

Google rejects the request because:
```
redirect_uri = "https://uzywajqzbdbrfammshdg.supabase.co/auth/v1/callback"
```

is **NOT** in the "Authorized redirect URIs" list in Google OAuth Console.

## The Fix

Add this exact URL to Google OAuth Console → Credentials → OAuth 2.0 Client IDs → Edit → Authorized redirect URIs:

```
https://uzywajqzbdbrfammshdg.supabase.co/auth/v1/callback
```

## Why This Wasn't Obvious

1. The initial OAuth redirect (Step 2) uses your app's URL, which IS authorized
2. The error only happens during token exchange (Step 5) when Supabase uses its own callback URL
3. The error message "401 Unauthorized" doesn't specify which validation failed
4. Cookie handling was working correctly, creating a red herring

## Verification

After adding the URL, the flow should complete successfully:

```
Step 5: POST https://oauth2.googleapis.com/token
        ✅ client_id: valid
        ✅ client_secret: valid
        ✅ code: valid
        ✅ code_verifier: matches code_challenge
        ✅ redirect_uri: NOW IN AUTHORIZED LIST

Step 6: 200 OK
        Returns: { access_token, refresh_token, expires_in }

Step 7: Frontend receives tokens
        ✅ [useAuth] Auth state changed: SIGNED_IN
```

## Required URLs in Google OAuth Console

For complete Aica Life OS OAuth support:

```
Authorized redirect URIs:
1. https://uzywajqzbdbrfammshdg.supabase.co/auth/v1/callback  ← CRITICAL for Supabase Auth
2. https://aica-5562559893.southamerica-east1.run.app         ← Production frontend
3. http://localhost:5173                                       ← Local dev (Vite default)
4. http://localhost:3000                                       ← Local dev (alternative)
```

## References

- [Supabase Auth with Google Provider](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [OAuth 2.0 PKCE Flow](https://datatracker.ietf.org/doc/html/rfc7636)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
