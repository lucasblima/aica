# Diagrama do Fluxo de Autenticação

## PROBLEMA ATUAL: Loop Infinito

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LANDING PAGE                                      │
│  (http://localhost:3000/)                                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ "Entrar e Começar" button                                      │ │
│  │         ↓ onClick                                              │ │
│  │ ┌──────────────────────────────────────────────────────────┐  │ │
│  │ │   LOGIN MODAL                                            │  │ │
│  │ │   "Entrar com Google"                                    │  │ │
│  │ │        ↓ onClick                                         │  │ │
│  │ │   OAuth popup abre                                       │  │ │
│  │ │   Usuário autentica com Google                           │  │ │
│  │ │        ↓                                                 │  │ │
│  │ │   [signInWithOAuth] com redirectTo = "/"               │  │ │
│  │ │        ↓                                                 │  │ │
│  │ │   Browser recarrega http://localhost:3000/             │  │ │
│  │ └────────────────────┬─────────────────────────────────────┘  │ │
│  │                      │                                          │ │
│  │        ┌─────────────┴────────────────┬──────────────┐         │ │
│  │        │                              │              │         │ │
│  │   PROBLEMA!                     Supabase.js-SDK  React     │ │
│  │   App inicia com         processa OAuth       remonta App      │ │
│  │   isAuthenticated=false  automaticamente     com state vazio   │ │
│  │        │                      │              │                 │ │
│  │        ├──────────────────────┼──────────────┤                 │ │
│  │        ↓                      ↓              ↓                 │ │
│  │   ⚠️  Router vê:        onAuthStateChange  isAuthenticated     │ │
│  │   "Não autenticado"    dispara com         ainda = false       │ │
│  │        │               SIGNED_IN            │                  │ │
│  │        │                    │               │                  │ │
│  │        └────────────────────┴───────────────┤                  │ │
│  │                                              ↓                  │ │
│  │                      ❌ <Navigate to="/landing" />            │ │
│  │                           LOOP COMEÇA                          │ │
│  │                                                                 │ │
│  └─────────────────────────────────────────────────────────────────┘
│
└─→ VOLTA PARA LANDING (Loop infinito)
```

---

## SOLUÇÃO: Aguardar Verificação de Auth ANTES de Renderizar Router

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LANDING PAGE                                      │
│  (http://localhost:3000/)                                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ "Entrar e Começar" button                                      │ │
│  │         ↓ onClick                                              │ │
│  │ ┌──────────────────────────────────────────────────────────┐  │ │
│  │ │   LOGIN MODAL                                            │  │ │
│  │ │   "Entrar com Google" [Spinner]                          │  │ │
│  │ │        ↓ onClick                                         │  │ │
│  │ │   OAuth popup abre                                       │  │ │
│  │ │   Usuário autentica com Google                           │  │ │
│  │ │        ↓                                                 │  │ │
│  │ │   [signInWithOAuth] com redirectTo = "/"               │  │ │
│  │ │        ↓                                                 │  │ │
│  │ │   Browser recarrega http://localhost:3000/             │  │ │
│  │ └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  └─────────────────────────────────────────────────────────────────┘
│
└─────────────────────────────┬─────────────────────────────────────┘
                              │
                    [Page Reload]
                              │
        ┌─────────────────────┴──────────────────────┐
        │                                            │
        ↓                                            ↓
┌──────────────────┐                      ┌──────────────────┐
│   App mounts     │                      │  Supabase.js-SDK │
│   with:          │                      │  starts:         │
│ - isCheckingAuth │                      │ - Processes OAuth│
│   = true         │                      │ - Calls          │
│ - isAuthenticated│                      │   onAuthState    │
│   = undefined    │                      │   Change         │
│                  │                      │                  │
└────────┬─────────┘                      └────────┬─────────┘
         │                                        │
         │  ✅ [NEW] Aguarda                      │
         │  getSession() completar                │
         │                                        │
         ├───────────────────────────────────────┤
         │                                       │
         ↓                                       ↓
      ✅ isCheckingAuth = false       ✅ Sessão carregada
      ✅ isAuthenticated = TRUE        ✅ setIsAuthenticated(true)
         │                                       │
         └───────────────────┬───────────────────┘
                             │
                             ↓
                    ✅ [NEW] AuthLoadingScreen
                    Mostra durante ~1 segundo
                             │
                             ↓
                    ✅ isCheckingAuth = false
                             │
                             ↓
                    ✅ Renderiza Routes
                             │
                             ├─────────────────────┐
                             │                     │
                             ↓                     ↓
                     ✅ isAuthenticated = true
                             │
                             ↓
                    ✅ <Navigate to="/" replace />
                             │
                             ↓
   ┌─────────────────────────────────────────────┐
   │              HOME/DASHBOARD                 │
   │   ✅ Usuário autenticado                    │
   │   ✅ Dados carregam corretamente            │
   │   ✅ Logout funciona                        │
   │   ✅ Refresh mantém sessão                  │
   │                                              │
   │         🎉 SUCESSO 🎉                       │
   └─────────────────────────────────────────────┘
```

---

## Sequência de Estado no App.tsx

### ANTES (Problema):

```
┌─────────────────────────────────────────┐
│ useEffect(() => {                       │
│   supabase.auth.getSession()  ← Async! │
│   .then(session => {                    │
│     setIsAuthenticated(!!session)       │
│   })                                    │
│                                         │
│   supabase.auth.onAuthStateChange(...)  │
│ }, [])                                  │
│                                         │
│ return <Routes>                         │
│   {isAuth ? App : <Navigate> }          │
│ </Routes>                               │
│                                         │
│ ⚠️ Renderiza ANTES de getSession()      │
│    completar!                           │
└─────────────────────────────────────────┘

Estado Timeline:
T0:   isAuthenticated = false (inicial)
T0+1: Router renderiza <Navigate to="/landing" />
T50ms: getSession() retorna (mas já é tarde!)
T50ms: onAuthStateChange dispara
```

### DEPOIS (Solução):

```
┌──────────────────────────────────────────────┐
│ const [isCheckingAuth, setIsCheckingAuth] =  │
│   useState(true)                             │
│                                              │
│ useEffect(() => {                            │
│   const checkAuth = async () => {            │
│     const session =                          │
│       await getSession()  ← Aguarda!         │
│     setIsAuthenticated(!!session)            │
│     setIsCheckingAuth(false) ← Permite      │
│                                  renderizar │
│   }                                          │
│   checkAuth()                                │
│ }, [])                                       │
│                                              │
│ if (isCheckingAuth) {                        │
│   return <AuthLoadingScreen />               │
│ }                                            │
│                                              │
│ return <Routes> ... </Routes>                │
│                                              │
│ ✅ Renderiza APÓS verificação completa      │
└──────────────────────────────────────────────┘

Estado Timeline:
T0:   isCheckingAuth = true
      isAuthenticated = undefined
T0+1: Mostra AuthLoadingScreen
T10ms: getSession() chamado
T50ms: getSession() retorna
      setIsAuthenticated = true
      setIsCheckingAuth = false
T60ms: Renderiza Routes com estado correto
      isAuth = true → renderiza App, não landing
```

---

## Componentes Envolvidos

```
┌─────────────────────────────────────────────────────────────┐
│                      index.tsx                               │
│                  <BrowserRouter>                             │
│                        │                                      │
│                        ↓                                      │
│                    ┌─────────────┐                            │
│                    │   App.tsx   │                            │
│                    └──────┬──────┘                            │
│                           │                                   │
│                 ┌─────────┼─────────┐                         │
│                 │         │         │                         │
│         useEffect checks Renderiza  │                         │
│         Auth State  Routes           │                         │
│                 │         │         │                         │
│                 ↓         ↓         ↓                         │
│        ┌────────────────────────────────────┐               │
│        │  isCheckingAuth = true?            │               │
│        │  ├─ YES → AuthLoadingScreen        │               │
│        │  └─ NO  → Routes                   │               │
│        │     ├─ /landing → LandingPage      │               │
│        │     │  ├─ Header (with buttons)    │               │
│        │     │  ├─ HeroSection              │               │
│        │     │  ├─ ValueProposition         │               │
│        │     │  ├─ HowItWorks               │               │
│        │     │  ├─ TrustIndicators          │               │
│        │     │  ├─ CTASection               │               │
│        │     │  └─ Login Modal              │               │
│        │     │     └─ Login.tsx             │               │
│        │     │        └─ handleGoogleLogin()│               │
│        │     │           └─ OAuth           │               │
│        │     │                              │               │
│        │     └─ /* → isAuth ? App : Landing │               │
│        │        └─ Home View, etc.          │               │
│        └────────────────────────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Checklist de Implementação por Tarefa

### Tarefa 1.1: Refatorar App.tsx

```typescript
// Antes ❌
const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  supabase.auth.getSession().then(...); // Não aguarda!
  supabase.auth.onAuthStateChange(...);
}, []);

return <Routes>...</Routes>; // Renderiza logo

// Depois ✅
const [isCheckingAuth, setIsCheckingAuth] = useState(true);
const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  const checkAuth = async () => {
    const session = await supabase.auth.getSession();
    setIsAuthenticated(!!session.data.session);
    setIsCheckingAuth(false); // Permite renderizar
  };

  checkAuth();

  const { subscription } = supabase.auth.onAuthStateChange(...);
  return () => subscription.unsubscribe();
}, []);

if (isCheckingAuth) {
  return <AuthLoadingScreen />;
}

return <Routes>...</Routes>; // Renderiza com estado correto
```

### Tarefa 1.4: Criar AuthLoadingScreen

```typescript
// src/components/AuthLoadingScreen.tsx
export function AuthLoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-ceramic-base">
      <div className="text-center">
        <div className="mb-4 animate-spin">
          <LoadingSpinner />
        </div>
        <p className="text-ceramic-text-secondary">
          Carregando Aica...
        </p>
      </div>
    </div>
  );
}
```

### Tarefa 1.2: Melhorar Login.tsx

```typescript
// Antes ❌
<button onClick={handleGoogleLogin} disabled={loading}>
  {loading ? 'Entrando...' : 'Entrar com Google'}
</button>

// Depois ✅
<button
  onClick={handleGoogleLogin}
  disabled={loading}
  className="...disabled:opacity-50"
>
  {loading ? (
    <>
      <Spinner className="animate-spin mr-2" />
      Autenticando com Google...
    </>
  ) : (
    'Entrar com Google'
  )}
</button>
```

### Tarefa 1.3: Validar redirectTo

```typescript
// Verificar em:
// 1. src/components/Login.tsx (linha 16)
// 2. src/services/googleAuthService.ts (linha 51)

const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/`, // Deve apontar para raiz
  }
});
```

---

## Status dos Componentes

```
CRÍTICO - Precisa Ajuste:
├─ src/App.tsx
│  ├─ Adicionar isCheckingAuth state
│  ├─ Aguardar getSession() no useEffect
│  └─ Condicionar render de Routes
│
├─ src/components/Login.tsx
│  ├─ Melhorar feedback visual (spinner)
│  └─ Verificar redirectTo
│
├─ src/components/AuthLoadingScreen.tsx [NOVO]
│  └─ Criar componente
│
└─ src/services/googleAuthService.ts
   └─ Verificar redirectTo (provavelmente OK)

OK - Sem Mudanças Necessárias:
├─ src/modules/onboarding/components/LandingPage.tsx
├─ src/services/supabaseClient.ts
├─ src/hooks/useAuth.ts
└─ index.tsx
```

---

## Testes Necessários

```
E2E Tests (Fase 2):

1. Happy Path
   ✓ Novo usuário clica em "Entrar e Começar"
   ✓ Modal abre
   ✓ Autentica com Google
   ✓ Browser recarrega
   ✓ AuthLoadingScreen aparece
   ✓ Desaparece quando auth é verificado
   ✓ Home page renderiza (não landing)
   ✓ Dados carregam

2. Error Handling
   ✓ Erro de OAuth mostra mensagem
   ✓ Usuário pode tentar novamente
   ✓ Logout funciona

3. Edge Cases
   ✓ Refresh durante loading não causa erro
   ✓ Múltiplos cliques em "Entrar" não causam oauth múltiplos
   ✓ Navegador back/forward funciona

4. Browser Compatibility
   ✓ Chrome
   ✓ Firefox
   ✓ Safari
   ✓ Edge
```

---

**Diagrama Completo de Fluxo de Autenticação**
Preparado para uso durante implementação e testes.
