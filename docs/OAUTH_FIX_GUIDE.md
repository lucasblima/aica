# OAuth PKCE Authentication Error - Quick Fix Guide

**Issue**: 401 Unauthorized during Google OAuth login
**Cause**: Multiple conflicting `code_verifier` cookies from different Supabase projects
**Impact**: Users cannot log in with Google OAuth

---

## 🚨 Immediate Fix (2 minutes)

### Option 1: Use Diagnostics Page (Recommended)

1. **Navigate to Diagnostics**:
   ```
   http://localhost:3000/diagnostics
   ```

2. **Click "🍪 Verificar Cookies"**
   - Look for errors mentioning `your-project` or old project IDs
   - Check for multiple `code-verifier` cookies

3. **Click "🧹 Limpar Cookies Auth"**
   - This clears ALL Supabase auth cookies
   - Includes old project cookies that cause conflicts

4. **Refresh the page** (Ctrl+R)

5. **Try logging in again**

### Option 2: Browser Console (Quick Fix)

1. **Open browser console**: Press F12 or Ctrl+Shift+I

2. **Run cleanup command**:
   ```javascript
   // Delete all Supabase cookies
   document.cookie.split(';').forEach(c => {
     const name = c.trim().split('=')[0];
     if (name.includes('sb-') || name.includes('supabase')) {
       document.cookie = `${name}=; Max-Age=0; Path=/`;
       console.log('Deleted:', name);
     }
   });

   // Refresh page
   location.reload();
   ```

3. **Try logging in again**

### Option 3: Clear Browser Data

1. **Open browser settings**: Ctrl+Shift+Delete

2. **Select**:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
   - Time range: **Last hour** (or All time for thorough cleanup)

3. **Clear data**

4. **Try logging in again**

---

## 🔍 Root Cause Analysis

The console logs show **two conflicting code_verifier cookies**:

```
sb-your-project-auth-token-code-verifier       ❌ OLD PLACEHOLDER
sb-uzywajqzbdbrfammshdg-auth-token-code-verifier  ✅ CORRECT
```

**Why this causes 401 errors**:

1. Supabase PKCE flow generates a `code_verifier` before OAuth redirect
2. Browser has MULTIPLE code_verifiers from different projects/attempts
3. After Google redirects back, Supabase tries to match the code with verifier
4. **Wrong verifier is used** → Token exchange fails → 401 Unauthorized

---

## 🛠️ Prevention (For Developers)

### 1. Always Use Single Supabase Client

```typescript
// ✅ CORRECT - Single instance in supabaseClient.ts
export const supabase = createBrowserClient(...)

// ❌ WRONG - Multiple instances create multiple cookies
const supabase1 = createBrowserClient(...)
const supabase2 = createBrowserClient(...)
```

### 2. Clean Cookies on Project Switch

When switching between Supabase projects:

```typescript
// Clear old project cookies before initializing new client
document.cookie.split(';').forEach(c => {
  const name = c.trim().split('=')[0];
  if (name.startsWith('sb-')) {
    document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
});
```

### 3. Use Consistent Project IDs

Avoid placeholders like `your-project` in `.env` files:

```bash
# ❌ BAD - Placeholder creates cookies with wrong project ID
VITE_SUPABASE_URL=https://your-project.supabase.co

# ✅ GOOD - Real project ID
VITE_SUPABASE_URL=https://uzywajqzbdbrfammshdg.supabase.co
```

### 4. Verify Redirect URIs

Ensure redirect URI in Google Console matches **exactly**:

**Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs:

```
http://localhost:3000          ← Local development
https://your-domain.com        ← Production
```

**Supabase Dashboard** → Authentication → URL Configuration → Redirect URLs:

```
http://localhost:3000/**       ← Wildcard for local dev
https://your-domain.com/**     ← Wildcard for production
```

---

## 📊 Verification Steps

After cleanup, verify OAuth is working:

1. **Check cookies** (Browser DevTools → Application → Cookies):
   - Should see only `uzywajqzbdbrfammshdg` cookies
   - NO `your-project` or old project cookies

2. **Test login**:
   - Click "Login with Google"
   - Should redirect to Google OAuth consent screen
   - After consent, should redirect back and log in successfully
   - Console should show: `✅ Login bem-sucedido!`

3. **Check session**:
   - Run in console: `await supabase.auth.getSession()`
   - Should return session with user data
   - No 401 errors in Network tab

---

## 🚀 Permanent Fix (Code Changes)

### Auto-cleanup on app start

Add to `src/main.tsx` or `src/App.tsx`:

```typescript
import { cleanupStaleOAuthCookies } from '@/utils/cleanupOAuthCookies';

// Run cleanup on app load (development only)
if (import.meta.env.DEV) {
  cleanupStaleOAuthCookies();
}
```

### Function to add:

```typescript
// src/utils/cleanupOAuthCookies.ts
export function cleanupStaleOAuthCookies() {
  const currentProjectId = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];

  if (!currentProjectId) return;

  document.cookie.split(';').forEach(c => {
    const name = c.trim().split('=')[0];

    // Delete cookies from wrong projects or placeholders
    if (name.startsWith('sb-') && !name.includes(currentProjectId)) {
      document.cookie = `${name}=; Max-Age=0; Path=/`;
      console.log('[OAuth Cleanup] Deleted stale cookie:', name);
    }
  });
}
```

---

## 📝 Additional Debugging

### Check cookie storage in browser:

1. Open DevTools → Application → Storage → Cookies
2. Filter by `sb-`
3. Verify only `uzywajqzbdbrfammshdg` project cookies exist

### Check Supabase auth logs:

```typescript
// Enable debug mode in supabaseClient.ts
auth: {
  debug: true,  // Shows detailed auth flow in console
}
```

### Check Network requests:

1. DevTools → Network tab
2. Filter: `/auth/v1/token`
3. Look for 401 responses
4. Check Request Payload for `code_verifier`

---

## ✅ Success Criteria

After fix, you should see:

- ✅ No 401 errors in console
- ✅ Only one `code_verifier` cookie (current project)
- ✅ Successful OAuth redirect and login
- ✅ Session persists across page refreshes
- ✅ Console log: `[Supabase Auth] ✅ Login bem-sucedido!`

---

## 🆘 Still Having Issues?

1. **Try incognito mode**: Ctrl+Shift+N (clean slate, no cached cookies)
2. **Check Google OAuth Console**: Verify redirect URIs are correct
3. **Check Supabase Dashboard**: Authentication → Providers → Google is enabled
4. **Check .env.local**: `VITE_GOOGLE_OAUTH_CLIENT_ID` is set correctly
5. **Contact support**: Provide console logs and network tab screenshots

---

**Last Updated**: 2026-01-09
**Related Files**:
- `src/services/supabaseClient.ts`
- `src/lib/supabase/cookieStorageAdapter.ts`
- `src/pages/DiagnosticsPage.tsx`
- `src/utils/cleanupOAuthCookies.ts` (new)
