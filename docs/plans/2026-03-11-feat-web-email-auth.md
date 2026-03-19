# Web Email/Password Auth UX — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add email+password login, magic link login, and password reset to the AICA web app so Telegram users can access via browser.

**Architecture:** Expand existing `Login` component with email/password form below Google OAuth button. Add auth methods to `useAuth` hook. Create standalone `/reset-password` page for password recovery.

**Tech Stack:** React 18, TypeScript, Supabase Auth (`signInWithPassword`, `signInWithOtp`, `resetPasswordForEmail`, `updateUser`), Framer Motion, Ceramic Design System.

---

### Task 1: Add email auth methods to useAuth hook

**Files:**
- Modify: `src/hooks/useAuth.ts`
- Test: `src/hooks/__tests__/useAuth.test.ts` (create if needed)

**Step 1: Write failing tests**

```typescript
// src/hooks/__tests__/useAuth.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock supabase
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/services/authCacheService', () => ({
  invalidateAuthCache: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { supabase } from '@/services/supabaseClient';

describe('useAuth email methods', () => {
  it('signInWithEmail calls signInWithPassword', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { session: { user: { id: '1' } } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    // Wait for initialization
    await act(async () => {});

    await act(async () => {
      const res = await result.current.signInWithEmail('test@example.com', 'password123');
      expect(res.error).toBeNull();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('sendMagicLink calls signInWithOtp', async () => {
    (supabase.auth.signInWithOtp as any).mockResolvedValue({
      data: {},
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {});

    await act(async () => {
      const res = await result.current.sendMagicLink('test@example.com');
      expect(res.error).toBeNull();
    });

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { emailRedirectTo: expect.stringContaining('/') },
    });
  });

  it('sendPasswordReset calls resetPasswordForEmail', async () => {
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({
      data: {},
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {});

    await act(async () => {
      const res = await result.current.sendPasswordReset('test@example.com');
      expect(res.error).toBeNull();
    });

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      { redirectTo: expect.stringContaining('/reset-password') }
    );
  });

  it('signInWithEmail returns error on failure', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {});

    await act(async () => {
      const res = await result.current.signInWithEmail('bad@example.com', 'wrong');
      expect(res.error).toBe('Invalid login credentials');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useAuth.test.ts`
Expected: FAIL — `signInWithEmail`, `sendMagicLink`, `sendPasswordReset` don't exist on return type.

**Step 3: Implement the methods in useAuth**

Add three new methods to `src/hooks/useAuth.ts`:

```typescript
// After the existing signOut callback (~line 222), add:

const signInWithEmail = useCallback(async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}, []);

const sendMagicLink = useCallback(async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  return { error: error?.message ?? null };
}, []);

const sendPasswordReset = useCallback(async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error: error?.message ?? null };
}, []);
```

Update the `returnValue` useMemo to include the new methods:

```typescript
const returnValue = useMemo(() => ({
  user,
  session,
  isLoading,
  isAuthenticated: !!user,
  signOut,
  signInWithEmail,
  sendMagicLink,
  sendPasswordReset,
}), [user, session, isLoading, signOut, signInWithEmail, sendMagicLink, sendPasswordReset]);
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useAuth.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useAuth.ts src/hooks/__tests__/useAuth.test.ts
git commit -m "feat(auth): add signInWithEmail, sendMagicLink, sendPasswordReset to useAuth hook"
```

---

### Task 2: Add email/password form to Login component (sheet variant)

**Files:**
- Modify: `src/components/layout/Login.tsx`

**Context:** The Login component has two variants: `sheet` (for AuthSheet modal) and `full-page`. Both need the email form, but we implement sheet first since it's used in the main login flow.

**Step 1: Write failing test**

```typescript
// src/components/layout/__tests__/Login.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';

// Mock hooks
const mockSignInWithEmail = vi.fn();
const mockSendMagicLink = vi.fn();
const mockSendPasswordReset = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signInWithEmail: mockSignInWithEmail,
    sendMagicLink: mockSendMagicLink,
    sendPasswordReset: mockSendPasswordReset,
  }),
}));

vi.mock('@/hooks/useGoogleAuth', () => ({
  useGoogleAuth: () => ({
    login: vi.fn(),
    error: null,
    loading: false,
    clearError: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Login email form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    render(<Login variant="sheet" onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('seu@email.com')).toBeDefined();
    expect(screen.getByPlaceholderText('Sua senha')).toBeDefined();
  });

  it('renders email login button', () => {
    render(<Login variant="sheet" onLogin={vi.fn()} />);
    expect(screen.getByText('Entrar com email')).toBeDefined();
  });

  it('renders magic link and forgot password links', () => {
    render(<Login variant="sheet" onLogin={vi.fn()} />);
    expect(screen.getByText('Entrar com magic link')).toBeDefined();
    expect(screen.getByText('Esqueci minha senha')).toBeDefined();
  });

  it('calls signInWithEmail on form submit', async () => {
    mockSignInWithEmail.mockResolvedValue({ error: null });
    render(<Login variant="sheet" onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sua senha'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Entrar com email'));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error on failed login', async () => {
    mockSignInWithEmail.mockResolvedValue({ error: 'Email ou senha incorretos' });
    render(<Login variant="sheet" onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'bad@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sua senha'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('Entrar com email'));

    await waitFor(() => {
      expect(screen.getByText('Email ou senha incorretos')).toBeDefined();
    });
  });

  it('sends magic link when clicking magic link button', async () => {
    mockSendMagicLink.mockResolvedValue({ error: null });
    render(<Login variant="sheet" onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByText('Entrar com magic link'));

    await waitFor(() => {
      expect(mockSendMagicLink).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('sends password reset when clicking forgot password', async () => {
    mockSendPasswordReset.mockResolvedValue({ error: null });
    render(<Login variant="sheet" onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByText('Esqueci minha senha'));

    await waitFor(() => {
      expect(mockSendPasswordReset).toHaveBeenCalledWith('test@example.com');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/Login.test.tsx`
Expected: FAIL — email fields don't exist yet.

**Step 3: Implement email form in Login component**

Modify `src/components/layout/Login.tsx`:

1. Import `useAuth` and add state for email form:
```typescript
import { useAuth } from '@/hooks/useAuth';

// Inside the component, add:
const { signInWithEmail, sendMagicLink, sendPasswordReset } = useAuth();
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [emailLoading, setEmailLoading] = useState(false);
const [emailError, setEmailError] = useState<string | null>(null);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
```

2. Add handler functions:
```typescript
const handleEmailLogin = async () => {
  if (!email.trim()) return;
  setEmailError(null);
  setSuccessMessage(null);
  setEmailLoading(true);
  const { error } = await signInWithEmail(email, password);
  setEmailLoading(false);
  if (error) {
    setEmailError(error === 'Invalid login credentials' ? 'Email ou senha incorretos' : error);
  }
};

const handleMagicLink = async () => {
  if (!email.trim()) {
    setEmailError('Digite seu email primeiro');
    return;
  }
  setEmailError(null);
  setEmailLoading(true);
  const { error } = await sendMagicLink(email);
  setEmailLoading(false);
  if (error) {
    setEmailError(error);
  } else {
    setSuccessMessage('Link enviado! Verifique seu email.');
  }
};

const handleForgotPassword = async () => {
  if (!email.trim()) {
    setEmailError('Digite seu email primeiro');
    return;
  }
  setEmailError(null);
  setEmailLoading(true);
  const { error } = await sendPasswordReset(email);
  setEmailLoading(false);
  if (error) {
    setEmailError(error);
  } else {
    setSuccessMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
  }
};
```

3. Add JSX for email form in the **sheet variant** (after the Google button, before the footer):

```tsx
{/* Divider */}
<div className="flex items-center gap-3 my-6">
  <div className="flex-1 h-px bg-ceramic-border" />
  <span className="text-xs text-ceramic-text-secondary">ou</span>
  <div className="flex-1 h-px bg-ceramic-border" />
</div>

{/* Email/Password Form */}
{successMessage ? (
  <div className="text-center">
    <p className="text-sm text-ceramic-success mb-3">{successMessage}</p>
    <button
      type="button"
      onClick={() => setSuccessMessage(null)}
      className="text-sm text-ceramic-text-secondary hover:underline"
    >
      Voltar
    </button>
  </div>
) : (
  <div className="space-y-3">
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="seu@email.com"
      className="w-full px-4 py-3 bg-ceramic-base border border-ceramic-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-ceramic-text-primary text-sm"
    />
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Sua senha"
      className="w-full px-4 py-3 bg-ceramic-base border border-ceramic-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-ceramic-text-primary text-sm"
      onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
    />

    {emailError && (
      <p className="text-sm text-ceramic-error">{emailError}</p>
    )}

    <button
      type="button"
      onClick={handleEmailLogin}
      disabled={emailLoading || !email.trim()}
      className="w-full bg-ceramic-cool text-ceramic-text-primary py-3 rounded-xl font-medium text-sm disabled:opacity-50 hover:bg-ceramic-border transition-colors"
    >
      {emailLoading ? 'Entrando...' : 'Entrar com email'}
    </button>

    <div className="flex justify-between text-xs">
      <button
        type="button"
        onClick={handleForgotPassword}
        className="text-ceramic-text-secondary hover:underline"
      >
        Esqueci minha senha
      </button>
      <button
        type="button"
        onClick={handleMagicLink}
        className="text-amber-600 hover:underline"
      >
        Entrar com magic link
      </button>
    </div>
  </div>
)}
```

4. Add the same email form to the **full-page variant** (after the Google button, before the footer), using the full-page styling (hardcoded colors, neumorphic inputs).

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/layout/__tests__/Login.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/layout/Login.tsx src/components/layout/__tests__/Login.test.tsx
git commit -m "feat(auth): add email/password + magic link form to Login component"
```

---

### Task 3: Create ResetPasswordPage

**Files:**
- Create: `src/pages/ResetPasswordPage.tsx`
- Modify: `src/router/AppRouter.tsx` — add `/reset-password` route

**Context:** User arrives via Supabase recovery email. The URL contains a recovery token that Supabase processes automatically via `detectSessionInUrl: true`. The page just needs to call `supabase.auth.updateUser({ password })`.

**Step 1: Write failing test**

```typescript
// src/pages/__tests__/ResetPasswordPage.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: '1' } } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock('@/services/authCacheService', () => ({
  invalidateAuthCache: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
  }),
}));

import ResetPasswordPage from '../ResetPasswordPage';
import { supabase } from '@/services/supabaseClient';

describe('ResetPasswordPage', () => {
  it('renders password fields', () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeDefined();
    expect(screen.getByPlaceholderText('Repita a senha')).toBeDefined();
  });

  it('shows error when passwords do not match', async () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a senha'), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByText('Salvar nova senha'));

    await waitFor(() => {
      expect(screen.getByText('As senhas não coincidem.')).toBeDefined();
    });
  });

  it('shows error when password too short', async () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: '12345' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a senha'), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByText('Salvar nova senha'));

    await waitFor(() => {
      expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeDefined();
    });
  });

  it('calls updateUser on valid submit', async () => {
    (supabase.auth.updateUser as any).mockResolvedValue({ error: null });
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'newpassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a senha'), {
      target: { value: 'newpassword' },
    });
    fireEvent.click(screen.getByText('Salvar nova senha'));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword' });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/ResetPasswordPage.test.tsx`
Expected: FAIL — module not found.

**Step 3: Create ResetPasswordPage**

```tsx
// src/pages/ResetPasswordPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabaseClient'
import { Logo } from '@/components/ui'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError('Erro ao redefinir senha. Tente novamente.')
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-ceramic-base flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss text-center">
          <div className="flex justify-center mb-4">
            <Logo variant="default" width={64} className="rounded-2xl" />
          </div>
          <h2 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Senha redefinida!
          </h2>
          <p className="text-ceramic-text-secondary mb-6">
            Sua nova senha está ativa. Você já pode acessar a AICA.
          </p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-4 py-3 transition-colors"
          >
            Ir para o painel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ceramic-base flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss">
        <div className="flex justify-center mb-4">
          <Logo variant="default" width={64} className="rounded-2xl" />
        </div>
        <h2 className="text-xl font-bold text-ceramic-text-primary mb-2 text-center">
          Redefinir senha
        </h2>
        <p className="text-ceramic-text-secondary mb-6 text-sm text-center">
          Escolha uma nova senha para sua conta AICA.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Nova senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 bg-ceramic-base border border-ceramic-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-ceramic-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              className="w-full px-3 py-2 bg-ceramic-base border border-ceramic-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-ceramic-text-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-ceramic-error">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-3 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>

          <button
            onClick={() => navigate('/landing', { replace: true })}
            className="w-full text-ceramic-text-secondary text-sm hover:underline"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Add route to AppRouter**

In `src/router/AppRouter.tsx`:

1. Add lazy import at top (near line 30-50, with other lazy imports):
```typescript
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
```

2. Add route after `/welcome` route (~line 766):
```tsx
{/* Reset Password - Public route for password recovery via email link */}
<Route
  path="/reset-password"
  element={
    <Suspense fallback={<LoadingScreen message="Carregando..." />}>
      <ResetPasswordPage />
    </Suspense>
  }
/>
```

Note: This route is **public** (no AuthGuard) — the recovery token in the URL provides auth context. Supabase processes it via `detectSessionInUrl: true`.

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/pages/__tests__/ResetPasswordPage.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/ResetPasswordPage.tsx src/pages/__tests__/ResetPasswordPage.test.tsx src/router/AppRouter.tsx
git commit -m "feat(auth): add ResetPasswordPage and /reset-password route"
```

---

### Task 4: Add email form to full-page Login variant

**Files:**
- Modify: `src/components/layout/Login.tsx`

**Context:** Task 2 adds the email form to the sheet variant. This task adds the same form to the full-page variant with matching neumorphic styling.

**Step 1: Verify sheet variant tests still pass**

Run: `npx vitest run src/components/layout/__tests__/Login.test.tsx`
Expected: PASS

**Step 2: Add email form to full-page variant**

In the full-page section of Login.tsx (after the Google button around line 229, before the footer):

- Same form structure as sheet variant
- Use full-page styling: `bg-[#EBE9E4]` for inputs, neumorphic inset shadow, `text-[#5C554B]` colors
- Same handler functions (shared)

```tsx
{/* Divider */}
<div className="flex items-center gap-3 my-6">
  <div className="flex-1 h-px bg-[#D5D0C7]" />
  <span className="text-xs text-[#948D82]">ou</span>
  <div className="flex-1 h-px bg-[#D5D0C7]" />
</div>

{/* Email Form (full-page styling) */}
{successMessage ? (
  <div className="text-center">
    <p className="text-sm text-ceramic-success mb-3">{successMessage}</p>
    <button type="button" onClick={() => setSuccessMessage(null)}
      className="text-sm text-[#948D82] hover:underline">
      Voltar
    </button>
  </div>
) : (
  <div className="space-y-3">
    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
      placeholder="seu@email.com"
      className="w-full px-4 py-3 bg-[#EBE9E4] rounded-xl text-[#5C554B] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      style={{ boxShadow: 'inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff' }}
    />
    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
      placeholder="Sua senha"
      className="w-full px-4 py-3 bg-[#EBE9E4] rounded-xl text-[#5C554B] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      style={{ boxShadow: 'inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff' }}
      onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
    />

    {emailError && <p className="text-sm text-ceramic-error">{emailError}</p>}

    <button type="button" onClick={handleEmailLogin}
      disabled={emailLoading || !email.trim()}
      className="w-full bg-[#F0EFE9] text-[#5C554B] py-4 rounded-2xl font-bold text-sm disabled:opacity-50"
      style={{ boxShadow: '5px 5px 10px #c5c5c5, -5px -5px 10px #ffffff' }}>
      {emailLoading ? 'Entrando...' : 'Entrar com email'}
    </button>

    <div className="flex justify-between text-xs">
      <button type="button" onClick={handleForgotPassword}
        className="text-[#948D82] hover:underline">
        Esqueci minha senha
      </button>
      <button type="button" onClick={handleMagicLink}
        className="text-amber-600 hover:underline">
        Entrar com magic link
      </button>
    </div>
  </div>
)}
```

**Step 3: Run tests**

Run: `npx vitest run src/components/layout/__tests__/Login.test.tsx`
Expected: PASS

**Step 4: Run build + typecheck**

```bash
npm run build && npm run typecheck
```
Expected: exit 0

**Step 5: Commit**

```bash
git add src/components/layout/Login.tsx
git commit -m "feat(auth): add email/password form to full-page Login variant"
```

---

### Task 5: Verify and final build

**Step 1: Run full test suite**

```bash
npm run test
```

**Step 2: Run build + typecheck**

```bash
npm run build && npm run typecheck
```

**Step 3: Verify all routes**

Confirm in browser:
- `/landing` → AuthSheet opens with Google + email form
- `/reset-password` → Reset password page renders
- Email login form shows inline errors
- Magic link shows success message
- Forgot password shows success message

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(auth): address integration issues from email auth feature"
```
