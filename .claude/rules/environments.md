# Environments & URLs

## Staging
- **Domain:** https://dev.aica.guru
- **Cloud Run:** `aica-dev` in `us-central1` (Iowa)
- **Supabase:** https://uzywajqzbdbrfammshdg.supabase.co

## Production
- **Domain:** https://aica.guru
- **Cloud Run:** `aica` in `southamerica-east1` (Sao Paulo)
- **Firebase Hosting:** `aica-guru` (edge proxy → Cloud Run)
- **Supabase:** same as staging

## Agents Backend
- **Cloud Run:** `aica-agents` in `southamerica-east1`

## DNS

- `dev` CNAME → `ghs.googlehosted.com.`
- `@`/`www` → Firebase Hosting
- Cloud Run domain mappings NOT supported in `southamerica-east1` — Firebase acts as edge proxy

## OAuth

- Google OAuth redirect URIs must include both `https://aica.guru/auth/callback` and `https://dev.aica.guru/auth/callback`
- Supabase Dashboard Auth > URL Configuration: Site URL = `https://aica.guru`
- PKCE flow has issues with Cloud Run stateless — use staging for OAuth testing

## Common Fixes

When fixes don't work, use `superpowers:systematic-debugging` instead of trying random solutions.

### Import errors
```bash
rm -rf node_modules/.vite && npm install && npm run dev
```

### OAuth redirect issues
1. Check Supabase Dashboard → Authentication → URL Configuration
2. Verify Google OAuth Console allowed origins
3. Ensure single Supabase client instance across app

### Migration fails
```bash
npx supabase db reset --local
npx supabase migration repair
```

### Build verification
```bash
npm run build && npm run typecheck
```
