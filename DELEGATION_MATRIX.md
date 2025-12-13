# Matriz de Delegação - Loop de Autenticação

## Visão Geral

Este documento mapeia cada tarefa para o agente especialista responsável por sua execução.

---

## FASE 1: CORREÇÃO CRÍTICA (Bloqueador de Produção)

### Tarefa 1.1: Refatorar App.tsx - Adicionar Loading State

**Responsável:** `general-purpose` agent (Backend Architect role)

**Descrição Curta:**
Adicionar estado `isCheckingAuth` e garantir que App aguarda a verificação de autenticação antes de renderizar o router. Isso elimina a race condition entre o carregamento da sessão e a renderização das rotas.

**Arquivo(s) Principal(is):**
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\App.tsx` (linhas 81-187)

**Mudanças Requeridas:**
1. Adicionar novo state: `const [isCheckingAuth, setIsCheckingAuth] = useState(true)`
2. Refatorar useEffect para função assíncrona que aguarda `getSession()`
3. Condicionar render de router: `if (isCheckingAuth) return <AuthLoadingScreen />`
4. Garantir que `onAuthStateChange` listener é registrado APÓS await

**Pseudocódigo:**
```typescript
const [isCheckingAuth, setIsCheckingAuth] = useState(true);
const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  const checkAuth = async () => {
    // Aguarda sessão ANTES de continuar
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setIsCheckingAuth(false); // AGORA permite renderizar router
  };

  checkAuth();

  // Registra listener para mudanças futuras
  const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    setIsAuthenticated(!!session);
  });

  return () => subscription.unsubscribe();
}, []);

// Bloqueia router enquanto verifica
if (isCheckingAuth) {
  return <AuthLoadingScreen />;
}

// Renderiza apenas com estado verificado
return <Routes>...</Routes>;
```

**Critérios de Aceitação:**
- [ ] App declara estado `isCheckingAuth`
- [ ] `useEffect` is assíncrono e aguarda `getSession()`
- [ ] `isCheckingAuth` é `false` antes de renderizar router
- [ ] AuthLoadingScreen é renderizado enquanto `isCheckingAuth = true`
- [ ] Nenhuma mudança em comportamento de auth listeners
- [ ] Testes automatizados passam

**Tempo Estimado:** 30-45 minutos

**Prioridade:** 🔴 CRÍTICA

---

### Tarefa 1.2: Corrigir Login.tsx - Melhorar Feedback Visual

**Responsável:** `general-purpose` agent (Frontend Core role)

**Descrição Curta:**
Melhorar experiência visual durante autenticação. Mostrar spinner, desabilitar botão para múltiplos cliques, e validar redirecionamento pós-OAuth.

**Arquivo(s) Principal(is):**
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\Login.tsx`

**Mudanças Requeridas:**
1. Importar ícone de spinner (ex: `Loader` do lucide-react)
2. Melhorar renderização do botão durante `loading = true`
3. Adicionar `disabled` attribute quando `loading = true`
4. Mostrar loading text + spinner icon
5. Verificar que `redirectTo` aponta para `/` (verificar se `window.location.origin` é suficiente)

**Pseudocódigo:**
```typescript
import { Loader } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Verificado ✓
        }
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // Browser vai recarregar, então não precisa de cleanup aqui
    } catch (err) {
      setError('Erro ao conectar com Google');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="...disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader className="w-5 h-5 animate-spin mr-2" />
          Autenticando...
        </>
      ) : (
        <>
          <GoogleIcon className="w-6 h-6" />
          Entrar com Google
        </>
      )}
    </button>
  );
}
```

**Critérios de Aceitação:**
- [ ] Botão mostra spinner durante `loading`
- [ ] Texto muda para "Autenticando..." durante `loading`
- [ ] Botão fica `disabled` quando `loading = true`
- [ ] Não é possível clicar múltiplas vezes
- [ ] Erro é exibido se OAuth falhar
- [ ] Usuário pode tentar novamente após erro

**Tempo Estimado:** 15-20 minutos

**Prioridade:** 🔴 CRÍTICA

---

### Tarefa 1.3: Corrigir redirectTo OAuth - Validar e Documentar

**Responsável:** `general-purpose` agent (Backend Architect role)

**Descrição Curta:**
Verificar que ambos os locais onde OAuth é iniciado (`Login.tsx` e `googleAuthService.ts`) usam `redirectTo` correto. Deve apontar para raiz `/` da aplicação.

**Arquivo(s) Principal(is):**
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\Login.tsx` (linha 16)
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\services\googleAuthService.ts` (linha 51)

**Mudanças Requeridas:**
1. Verificar `Login.tsx` linha 16: `redirectTo: window.location.origin`
2. Verificar `googleAuthService.ts` linha 51: `redirectTo: window.location.origin`
3. Documentar por que `window.location.origin` é correto (é a raiz da app)
4. Adicionar comentário explicativo se houver lógica especial

**Verificação:**
```typescript
// VERIFICAR em Login.tsx
const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
        redirectTo: window.location.origin, // ✓ Correto
    }
});

// VERIFICAR em googleAuthService.ts
await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
        redirectTo: window.location.origin, // ✓ Correto
    }
});

// window.location.origin é:
// Dev: http://localhost:3000
// Prod: https://aicalife.com
// Sempre aponta para raiz, que é exatamente o que queremos
```

**Critérios de Aceitação:**
- [ ] `Login.tsx` usa `window.location.origin` como redirectTo
- [ ] `googleAuthService.ts` usa `window.location.origin` como redirectTo
- [ ] Ambos estão sincronizados
- [ ] Comentários explicativos adicionados se necessário
- [ ] Nenhuma hardcoding de URLs

**Tempo Estimado:** 5-10 minutos

**Prioridade:** 🔴 CRÍTICA

---

### Tarefa 1.4: Criar AuthLoadingScreen Component

**Responsável:** `general-purpose` agent (Frontend Core role)

**Descrição Curta:**
Novo componente que exibe um loading screen amigável enquanto App.tsx verifica a autenticação. Deve ser rápido (desaparece em ~1 segundo em casos normais) e não bloqueador.

**Arquivo(s) Principal(is):**
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\AuthLoadingScreen.tsx` (NOVO)

**Localização:** `src/components/AuthLoadingScreen.tsx`

**Template de Implementação:**
```typescript
import React from 'react';
import { Loader } from 'lucide-react';

export function AuthLoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-ceramic-base">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-ceramic-base to-ceramic-inset opacity-50 pointer-events-none" />

      {/* Loading Container */}
      <div className="relative z-10 text-center space-y-4">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-ceramic-inset rounded-2xl flex items-center justify-center">
            <Loader className="w-8 h-8 text-ceramic-text-primary animate-spin" />
          </div>
        </div>

        {/* Text */}
        <div>
          <h1 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Carregando Aica
          </h1>
          <p className="text-sm text-ceramic-text-secondary">
            Preparando sua vida em ordem...
          </p>
        </div>

        {/* Progress indicator (opcional) */}
        <div className="mt-6 w-32 h-1 bg-ceramic-inset rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-ceramic-accent animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default AuthLoadingScreen;
```

**Integração em App.tsx:**
```typescript
import { AuthLoadingScreen } from './components/AuthLoadingScreen';

// Dentro do componente App:
if (isCheckingAuth) {
  return <AuthLoadingScreen />;
}
```

**Critérios de Aceitação:**
- [ ] Componente renderiza loading screen
- [ ] Usa design consistent com resto da app (ceramic design system)
- [ ] Mostra spinner animado
- [ ] Mostra mensagem amigável
- [ ] Bloqueia interação (pointer-events-none no background)
- [ ] Responsivo em mobile/tablet/desktop
- [ ] Pode ser integrado em App.tsx sem erros

**Tempo Estimado:** 20-30 minutos

**Prioridade:** 🔴 CRÍTICA

---

## FASE 2: VALIDAÇÃO E TESTES (QA)

### Tarefa 2.1: Testes E2E - Fluxo Completo de Autenticação

**Responsável:** `testing-qa` agent (Testing & QA Agent)

**Descrição Curta:**
Implementar testes E2E que validam o fluxo completo de login: usuário clica em "Entrar", autentica com Google, é redirecionado para Home (não landing), e pode interagir com a app.

**Arquivo(s) Principal(is):**
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\tests\e2e\auth.spec.ts`

**Testes Requeridos:**

1. **Happy Path - Novo Usuário Login**
```typescript
test('novo usuário pode fazer login com Google', async ({ page }) => {
  // Ir para landing page
  await page.goto('/landing');

  // Clicar em "Entrar e Começar"
  await page.click('button:has-text("Entrar e Começar")');

  // Modal deve aparecer
  const modal = await page.locator('text=Entrar com Google');
  await expect(modal).toBeVisible();

  // Clicar em "Entrar com Google" (vai abrir OAuth)
  // [NOTA: OAuth real pode ser mockado com Playwright fixtures]
  await page.click('button:has-text("Entrar com Google")');

  // Spinner deve aparecer
  await expect(page.locator('svg.animate-spin')).toBeVisible();

  // Após OAuth callback, AuthLoadingScreen aparece
  await expect(page.locator('text=Carregando Aica')).toBeVisible();

  // AuthLoadingScreen desaparece
  await expect(page.locator('text=Carregando Aica')).not.toBeVisible();

  // Home page renderiza
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Minha Vida')).toBeVisible();
});
```

2. **Logout e Volta para Landing**
```typescript
test('logout redireciona para landing', async ({ page, context }) => {
  // Fazer login primeiro
  // ...

  // Clicar em logout (hamburger menu ou profile button)
  await page.click('[aria-label="Menu Perfil"]');
  await page.click('text=Sair');

  // Deve voltar para landing
  await expect(page).toHaveURL('/landing');
  await expect(page.locator('text=Entrar e Começar')).toBeVisible();
});
```

3. **Refresh Após Login - Mantém Sessão**
```typescript
test('refresh após login mantém sessão autenticada', async ({ page }) => {
  // Fazer login
  // ...

  // Refresh
  await page.reload();

  // AuthLoadingScreen aparece e desaparece
  await expect(page.locator('text=Carregando Aica')).toBeVisible();
  await page.waitForTimeout(2000); // Aguarda loading completar

  // Ainda em home, não em landing
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Minha Vida')).toBeVisible();
});
```

**Critérios de Aceitação:**
- [ ] Testes passam em dev environment
- [ ] Testes passam em staging
- [ ] Happy path funciona completamente
- [ ] Logout funciona
- [ ] Refresh mantém sessão
- [ ] Erro OAuth é tratado

**Tempo Estimado:** 1-2 horas

**Prioridade:** 🟠 ALTA

---

### Tarefa 2.2: Testes E2E - Race Conditions

**Responsável:** `testing-qa` agent

**Descrição Curta:**
Testes que simulam delays e race conditions para garantir que a solução é robusta.

**Testes Requeridos:**

1. **Simular getSession() Lento**
```typescript
test('suporta getSession() lento sem causar race condition', async ({ page }) => {
  // Mock getSession para retornar após 500ms
  // Clicar em "Entrar"
  // Verificar que AuthLoadingScreen aparece
  // Verificar que router não renderiza até getSession() completar
  // Verificar que app renderiza com isAuthenticated = true
});
```

2. **Múltiplos onAuthStateChange Events**
```typescript
test('múltiplos onAuthStateChange events não causam loops', async ({ page }) => {
  // Simular 3 eventos consecutivos de SIGNED_IN
  // Verificar que router renderiza apenas uma vez
  // Verificar que não há loops de navegação
});
```

**Critérios de Aceitação:**
- [ ] Testes com delays passam
- [ ] Testes com múltiplos eventos passam
- [ ] Nenhuma race condition é encontrada

**Tempo Estimado:** 45-60 minutos

**Prioridade:** 🟠 ALTA

---

### Tarefa 2.3: Testes E2E - Browser Compatibility

**Responsável:** `testing-qa` agent

**Descrição Curta:**
Validar que o fluxo funciona em múltiplos navegadores e dispositivos.

**Navegadores a Testar:**
- Chrome (desktop + mobile)
- Firefox (desktop + mobile)
- Safari (desktop + mobile)
- Edge (desktop)

**Testes Requeridos:**
- Happy path em cada navegador
- Loading screen aparece/desaparece
- Logout funciona

**Critérios de Aceitação:**
- [ ] Testes passam em Chrome
- [ ] Testes passam em Firefox
- [ ] Testes passam em Safari
- [ ] Testes passam em Edge
- [ ] Mobile viewport funciona

**Tempo Estimado:** 1-1.5 horas

**Prioridade:** 🟠 ALTA

---

## FASE 3: MELHORIAS (Opcional)

### Tarefa 3.1: Adicionar Loading States em LandingPage

**Responsável:** `general-purpose` agent (Frontend Core)

**Descrição Curta:**
Melhorar LandingPage para desabilitar botões e mostrar loading durante OAuth.

**Tempo Estimado:** 20 minutos
**Prioridade:** 🟡 MÉDIA

### Tarefa 3.2: Adicionar Error Boundary

**Responsável:** `general-purpose` agent (Frontend Core)

**Descrição Curta:**
Adicionar Error Boundary ao redor de Router para capturar e tratar erros de autenticação graciosamente.

**Tempo Estimado:** 30 minutos
**Prioridade:** 🟡 MÉDIA

### Tarefa 3.3: Documentação de Fluxo de Auth

**Responsável:** `general-purpose` agent

**Descrição Curta:**
Criar documentação explicando o fluxo de autenticação para futuros desenvolvedores.

**Tempo Estimado:** 30 minutos
**Prioridade:** 🟡 MÉDIA

---

## Timeline Recomendado

```
Dia 1 (4 horas):
├─ 0:00-0:45: Tarefa 1.1 (Refatorar App.tsx)
├─ 0:45-1:00: Tarefa 1.4 (AuthLoadingScreen) - Paralelo
├─ 1:00-1:20: Tarefa 1.2 (Login.tsx)
├─ 1:20-1:30: Tarefa 1.3 (Validar redirectTo)
└─ 1:30-4:00: Testes manuais e validação

Dia 2 (3.5 horas):
├─ 0:00-1:00: Tarefa 2.1 (E2E Happy Path)
├─ 1:00-2:00: Tarefa 2.2 (Race Conditions)
├─ 2:00-3:30: Tarefa 2.3 (Browser Compatibility)
└─ Validação final

Dia 3 (1 hora - Opcional):
├─ Tarefa 3.1 (Loading States)
├─ Tarefa 3.2 (Error Boundary)
└─ Tarefa 3.3 (Documentação)
```

---

## Checklist de Início

Antes de começar as implementações:

- [ ] Todo desenvolvedor leu `ARCHITECTURE_AUTH_LOOP_FIX.md`
- [ ] Todo desenvolvedor entende o diagrama em `AUTH_FLOW_DIAGRAM.md`
- [ ] Ambiente de desenvolvimento está funcionando
- [ ] Testes automatizados estão passando (antes das mudanças)
- [ ] Supabase está configurado corretamente com OAuth

---

## Contato e Escalação

- **Arquiteto:** Master Architect Claude
- **Perguntas sobre design:** Ver `ARCHITECTURE_AUTH_LOOP_FIX.md`
- **Perguntas sobre implementação:** Verificar `AUTH_FLOW_DIAGRAM.md`
- **Bloqueadores:** Escaldar imediatamente

---

**Status:** PRONTO PARA DELEGAÇÃO
**Atualizado:** 2025-12-13
