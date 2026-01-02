# Supabase Authentication Skill

Skill para autenticação com Supabase, incluindo OAuth, PKCE, SSR, e troubleshooting de erros comuns.

---

## Quando Usar Esta Skill

Use quando precisar:
- Configurar autenticação Supabase
- Implementar OAuth com PKCE
- Resolver erros 401/403 de autenticação
- Configurar SSR com @supabase/ssr
- Gerenciar sessões e cookies

---

## Fluxo PKCE Explicado

### O que é PKCE?

PKCE (Proof Key for Code Exchange) é uma extensão do OAuth 2.0 que protege contra ataques de interceptação de código.

```
┌──────────┐                              ┌──────────┐
│  Client  │                              │ Supabase │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │ 1. Gera code_verifier (random string)   │
     │ 2. Gera code_challenge = SHA256(verifier)
     │                                         │
     │ 3. Redirect para OAuth ───────────────▶│
     │    (com code_challenge)                 │
     │                                         │
     │◀─────────────── 4. Callback ───────────│
     │    (com authorization code)             │
     │                                         │
     │ 5. Troca code por tokens ─────────────▶│
     │    (com code_verifier)                  │
     │                                         │
     │◀─────────────── 6. Tokens ─────────────│
     │                                         │
```

### Fluxo no Supabase

```typescript
// 1. Iniciar OAuth (frontend)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});

// 2. Callback route (server-side ou client-side)
// O Supabase SDK gerencia code_verifier automaticamente via cookies
```

---

## Configuração @supabase/ssr

### Instalação

```bash
npm install @supabase/ssr @supabase/supabase-js
```

### Client-Side Setup

```typescript
// src/services/supabaseClient.ts

import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Server-Side Setup (para SSR/SSG)

```typescript
// src/services/supabaseServer.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // ou equivalente do seu framework

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

### Para SPA (Vite/React)

```typescript
// src/services/supabaseClient.ts

import { createClient } from '@supabase/supabase-js';

// Para SPAs, usar createClient padrão
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
```

---

## Cookies e Session Management

### Estrutura de Cookies do Supabase

```markdown
Cookies criados pelo Supabase Auth:

1. sb-<project-ref>-auth-token
   - Contém: access_token, refresh_token, user
   - HttpOnly: false (precisa ser acessível pelo JS)
   - Secure: true (em produção)
   - SameSite: Lax

2. sb-<project-ref>-auth-token-code-verifier
   - Contém: code_verifier para PKCE
   - HttpOnly: false
   - Temporário (deletado após troca)
```

### Verificando Cookies

```javascript
// No browser console
document.cookie.split(';').filter(c => c.includes('supabase'));

// Ou via DevTools > Application > Cookies
```

### Problemas Comuns com Cookies

```markdown
## Cookie não sendo salvo

Causas:
1. SameSite=Strict com redirect cross-origin
2. Secure=true em localhost HTTP
3. Domain incorreto

Soluções:
1. Usar SameSite=Lax
2. Usar HTTPS mesmo em dev (vite --https)
3. Verificar domain do cookie
```

---

## OAuth Providers

### Configuração Google OAuth

```typescript
// Iniciar login Google
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'email profile', // Escopos básicos
    queryParams: {
      access_type: 'offline', // Para refresh token
      prompt: 'consent',      // Forçar consent screen
    },
  },
});
```

### Configuração no Supabase Dashboard

```markdown
1. Acessar: Authentication > Providers > Google
2. Habilitar Google provider
3. Adicionar:
   - Client ID: do Google Cloud Console
   - Client Secret: do Google Cloud Console
4. Redirect URL: copiar e adicionar no Google Cloud Console
```

### Redirect URIs

```markdown
## Configurar no Google Cloud Console

Authorized redirect URIs:
- https://<project-ref>.supabase.co/auth/v1/callback
- http://localhost:3000/auth/callback (dev)
- https://seu-dominio.com/auth/callback (prod)

## Configurar no Supabase Dashboard

Site URL: https://seu-dominio.com
Redirect URLs:
- http://localhost:3000/**
- https://seu-dominio.com/**
```

---

## Callback Handling

### Client-Side Callback

```typescript
// src/pages/auth/callback.tsx ou similar

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase detecta automaticamente o code na URL
      // e troca pelo token usando o code_verifier do cookie
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=callback_failed');
        return;
      }

      if (data.session) {
        // Sucesso! Redirecionar para app
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate]);

  return <div>Processando login...</div>;
}
```

### Handling Hash Fragment

```typescript
// Para OAuth implicit flow (não recomendado, mas ainda usado)
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Login bem-sucedido
        navigate('/dashboard');
      }
    }
  );

  return () => {
    authListener.subscription.unsubscribe();
  };
}, []);
```

---

## Debug de Erros

### Erro 401 Unauthorized

```markdown
## Causas Comuns

1. **Token expirado**
   - Verificar: `session.expires_at < Date.now()`
   - Solução: `supabase.auth.refreshSession()`

2. **Token inválido**
   - Verificar formato JWT no jwt.io
   - Verificar se é do projeto correto

3. **code_verifier não encontrado**
   - Cookie foi deletado antes do callback
   - Verificar cookies estão sendo salvos

4. **Redirect URI mismatch**
   - URL de callback não está autorizada
   - Verificar no Google Cloud Console E Supabase

## Debug Steps

```javascript
// 1. Verificar sessão atual
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data.session);
console.log('Error:', error);

// 2. Verificar cookies
console.log('Cookies:', document.cookie);

// 3. Verificar URL params
console.log('URL:', window.location.href);
const params = new URLSearchParams(window.location.search);
console.log('Code:', params.get('code'));
console.log('Error:', params.get('error'));

// 4. Verificar token
if (data.session) {
  const decoded = JSON.parse(atob(data.session.access_token.split('.')[1]));
  console.log('Token payload:', decoded);
  console.log('Expires:', new Date(decoded.exp * 1000));
}
```
```

### Erro 403 Forbidden

```markdown
## Causas Comuns

1. **RLS Policy bloqueando**
   - Verificar policies na tabela
   - Testar query no SQL Editor

2. **Escopo insuficiente**
   - OAuth não solicitou escopo necessário
   - Re-autorizar com escopos corretos

3. **Anon key em vez de service key**
   - Para operações admin, usar service role key
   - NUNCA expor service key no frontend

## Debug

```sql
-- Verificar RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'sua_tabela';

-- Testar como usuário específico
SET request.jwt.claims = '{"sub": "user-uuid-aqui"}';
SELECT * FROM sua_tabela;
```
```

### Erro PKCE

```markdown
## "invalid PKCE code verifier"

Causa: code_verifier não corresponde ao code_challenge

Debug:
1. Verificar cookie `sb-*-auth-token-code-verifier` existe
2. Verificar não há redirect intermediário deletando cookies
3. Verificar SameSite do cookie permite o fluxo

Solução:
```typescript
// Forçar novo fluxo PKCE
await supabase.auth.signOut();
// Limpar cookies manualmente se necessário
document.cookie.split(";").forEach(c => {
  if (c.includes('supabase')) {
    document.cookie = c.split("=")[0] + '=;expires=Thu, 01 Jan 1970';
  }
});
// Tentar login novamente
```
```

---

## Session Refresh

### Auto Refresh

```typescript
// Configuração no cliente
const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,      // Refresh automático
    persistSession: true,         // Persistir em storage
    detectSessionInUrl: true,     // Detectar tokens na URL
  },
});
```

### Manual Refresh

```typescript
// Forçar refresh do token
const { data, error } = await supabase.auth.refreshSession();

if (error) {
  console.error('Refresh failed:', error);
  // Redirecionar para login
  await supabase.auth.signOut();
  window.location.href = '/login';
}
```

### Interceptor para API Calls

```typescript
// Adicionar interceptor para refresh automático
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed:', session?.access_token);
  }

  if (event === 'SIGNED_OUT') {
    // Limpar estado local
    // Redirecionar para login
  }
});
```

---

## Hooks de Autenticação

### useAuth Hook

```typescript
// src/hooks/useAuth.ts

import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Escutar mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
  };
}
```

### useRequireAuth Hook

```typescript
// src/hooks/useRequireAuth.ts

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  return { isLoading };
}
```

---

## Troubleshooting Checklist

```markdown
## Antes de Debug

- [ ] Supabase URL está correto
- [ ] Anon key está correta
- [ ] Provider está habilitado no Dashboard
- [ ] Redirect URLs estão configuradas
- [ ] Client ID/Secret estão corretos

## Durante Debug

- [ ] Console não mostra erros
- [ ] Network tab mostra requests corretos
- [ ] Cookies estão sendo salvos
- [ ] URL de callback recebe code
- [ ] Session é criada após callback

## Após Login

- [ ] getSession() retorna sessão válida
- [ ] Token não está expirado
- [ ] RLS permite queries do usuário
- [ ] Provider token está disponível (se necessário)
```

---

## Links Úteis

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase SSR Package](https://supabase.com/docs/guides/auth/server-side)
- [PKCE RFC](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 for SPAs](https://oauth.net/2/browser-based-apps/)
- [JWT Debugger](https://jwt.io)
