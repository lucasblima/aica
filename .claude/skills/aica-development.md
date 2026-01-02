# AICA Development Skill

Skill para desenvolvimento do projeto AICA - Life OS, incluindo estrutura do projeto, padrões de código, criação de componentes e integrações.

---

## Quando Usar Esta Skill

Use quando precisar:
- Entender a estrutura do projeto AICA
- Criar novos componentes ou features
- Seguir padrões de código estabelecidos
- Integrar com APIs externas (Supabase, n8n, Gemini)

---

## Estrutura do Projeto

### Visão Geral

```
Aica_frontend/
├── src/
│   ├── components/        # Componentes compartilhados
│   ├── contexts/          # React Contexts (auth, navigation)
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilitários e configurações
│   ├── modules/           # Módulos de features
│   │   ├── finance/       # Módulo financeiro
│   │   ├── grants/        # Módulo de editais
│   │   ├── journey/       # Módulo de jornada pessoal
│   │   ├── onboarding/    # Landing e onboarding
│   │   ├── podcast/       # Módulo de podcast
│   │   └── studio/        # Módulo studio
│   ├── pages/             # Páginas principais
│   ├── router/            # Configuração de rotas
│   ├── services/          # Serviços e APIs
│   └── types/             # Tipos TypeScript
├── public/                # Assets estáticos
├── supabase/              # Migrations e Edge Functions
├── docs/                  # Documentação
└── tests/                 # Testes (unit, integration, e2e)
```

### Stack Tecnológico

```markdown
## Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS 4 (styling)
- Framer Motion (animações)
- React Router 7 (navegação)
- TanStack Query (data fetching)

## Backend/Services
- Supabase (auth, database, storage)
- Google Gemini (AI features)
- n8n (automações)
- Evolution API (WhatsApp)

## Testing
- Vitest (unit/integration)
- Playwright (e2e)
- Testing Library (componentes)
```

---

## Padrões de Código

### Estrutura de Componentes

```typescript
// src/components/Example/ExampleComponent.tsx

import React from 'react';
import { motion } from 'framer-motion';

/**
 * ExampleComponent - Descrição breve do componente
 *
 * @description Descrição mais detalhada do propósito
 * @example
 * <ExampleComponent title="Hello" onAction={() => {}} />
 */
interface ExampleComponentProps {
  /** Título exibido no componente */
  title: string;
  /** Callback quando ação é executada */
  onAction?: () => void;
  /** Classe CSS adicional */
  className?: string;
}

export function ExampleComponent({
  title,
  onAction,
  className = ''
}: ExampleComponentProps) {
  return (
    <motion.div
      className={`ceramic-card p-4 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h3 className="text-lg font-semibold text-ceramic-text-primary">
        {title}
      </h3>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-ceramic-accent text-white rounded-lg"
        >
          Action
        </button>
      )}
    </motion.div>
  );
}

export default ExampleComponent;
```

### Estrutura de Hooks

```typescript
// src/hooks/useExample.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

interface UseExampleOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseExampleReturn {
  data: any[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * useExample - Hook para gerenciar [funcionalidade]
 *
 * @param options - Opções de configuração
 * @returns Estado e métodos para interação
 */
export function useExample(options: UseExampleOptions = {}): UseExampleReturn {
  const { autoFetch = true, refreshInterval } = options;

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('table')
        .select('*');

      if (error) throw error;
      setData(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}
```

### Estrutura de Services

```typescript
// src/services/exampleService.ts

import { supabase } from './supabaseClient';

/**
 * ExampleService - Serviço para gerenciar [recurso]
 */

export interface ExampleItem {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Busca todos os items
 */
export async function getItems(): Promise<ExampleItem[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getItems] Erro:', error);
    throw error;
  }

  return data || [];
}

/**
 * Cria novo item
 */
export async function createItem(
  item: Omit<ExampleItem, 'id' | 'created_at'>
): Promise<ExampleItem> {
  const { data, error } = await supabase
    .from('items')
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error('[createItem] Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza item existente
 */
export async function updateItem(
  id: string,
  updates: Partial<ExampleItem>
): Promise<ExampleItem> {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateItem] Erro:', error);
    throw error;
  }

  return data;
}

/**
 * Remove item
 */
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteItem] Erro:', error);
    throw error;
  }
}
```

---

## Design System - Digital Ceramic

### Classes CSS Principais

```css
/* Backgrounds */
.bg-ceramic-base        /* Fundo principal creme */
.bg-ceramic-surface     /* Superfície elevada */

/* Textos */
.text-ceramic-text-primary    /* Texto principal escuro */
.text-ceramic-text-secondary  /* Texto secundário */

/* Cards */
.ceramic-card           /* Card com sombra suave */
.ceramic-inset          /* Área rebaixada */
.ceramic-concave        /* Efeito côncavo */

/* Accent */
.bg-ceramic-accent      /* Cor de destaque (amber) */
.text-ceramic-accent    /* Texto em cor de destaque */
```

### Componentes de UI

```tsx
// Card padrão
<div className="ceramic-card p-6 rounded-2xl">
  <h3 className="text-lg font-semibold text-ceramic-text-primary">
    Título
  </h3>
  <p className="text-sm text-ceramic-text-secondary">
    Descrição
  </p>
</div>

// Botão primário
<button className="px-6 py-3 bg-ceramic-accent text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
  Ação
</button>

// Botão secundário
<button className="px-6 py-3 ceramic-card text-ceramic-text-primary font-semibold rounded-xl hover:scale-[1.02] transition-transform">
  Ação Secundária
</button>

// Input
<input
  className="w-full px-4 py-3 ceramic-inset rounded-xl text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
  placeholder="Digite aqui..."
/>
```

---

## Criando Novos Módulos

### Estrutura de Módulo

```
src/modules/[nome-modulo]/
├── components/           # Componentes do módulo
│   ├── [Nome]Card.tsx
│   └── [Nome]List.tsx
├── hooks/               # Hooks específicos
│   └── use[Nome].ts
├── views/               # Views/páginas do módulo
│   └── [Nome]View.tsx
├── services/            # Services do módulo (opcional)
│   └── [nome]Service.ts
├── context/             # Context do módulo (se necessário)
│   └── [Nome]Context.tsx
├── types/               # Tipos do módulo
│   └── index.ts
└── index.ts             # Barrel export
```

### Template de Módulo

```typescript
// src/modules/novo-modulo/index.ts
export { NovoModuloView } from './views/NovoModuloView';
export { useNovoModulo } from './hooks/useNovoModulo';
export type { NovoModuloItem } from './types';

// src/modules/novo-modulo/types/index.ts
export interface NovoModuloItem {
  id: string;
  title: string;
  // ...
}

// src/modules/novo-modulo/views/NovoModuloView.tsx
import React from 'react';
import { useNovoModulo } from '../hooks/useNovoModulo';

export function NovoModuloView() {
  const { items, isLoading } = useNovoModulo();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-ceramic-base p-6">
      <h1 className="text-2xl font-bold text-ceramic-text-primary">
        Novo Módulo
      </h1>
      {/* Conteúdo */}
    </div>
  );
}
```

### Registrando Rota

```typescript
// src/router/AppRouter.tsx

// 1. Importar lazy
const NovoModuloView = lazy(() =>
  import('../modules/novo-modulo').then(m => ({ default: m.NovoModuloView }))
);

// 2. Adicionar rota
<Route
  path="/novo-modulo"
  element={
    isAuthenticated ? <NovoModuloView /> : <Navigate to="/landing" />
  }
/>
```

---

## Integração com APIs

### Supabase

```typescript
// Configuração
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Query
const { data, error } = await supabase
  .from('tabela')
  .select('*')
  .eq('user_id', userId);

// Insert
const { data, error } = await supabase
  .from('tabela')
  .insert({ campo: valor })
  .select()
  .single();

// Realtime
const subscription = supabase
  .channel('tabela_changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'tabela' },
    (payload) => console.log(payload)
  )
  .subscribe();
```

### Google Gemini

```typescript
// src/lib/gemini/client.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function generateContent(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Com streaming
export async function* streamContent(prompt: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
```

### n8n Webhooks

```typescript
// src/services/n8nService.ts

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export async function triggerWebhook(data: any): Promise<any> {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }

  return response.json();
}
```

---

## Comandos de Desenvolvimento

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor dev (porta 3000)
npm run build            # Build de produção
npm run preview          # Preview do build

# Testes
npm run test             # Rodar todos os testes
npm run test:unit        # Apenas unit tests
npm run test:integration # Apenas integration tests
npm run test:e2e         # Testes e2e (Playwright)
npm run test:coverage    # Cobertura de testes

# Utilitários
npm run update-docs      # Atualizar documentação
npm run validate-schema  # Validar schema Supabase
```

---

## Convenções de Nomenclatura

```markdown
## Arquivos
- Componentes: PascalCase.tsx (UserCard.tsx)
- Hooks: camelCase.ts (useAuth.ts)
- Services: camelCase.ts (supabaseService.ts)
- Types: camelCase.ts ou index.ts
- Utils: camelCase.ts

## Código
- Componentes: PascalCase (function UserCard)
- Hooks: camelCase com "use" (function useAuth)
- Funções: camelCase (async function fetchUsers)
- Constantes: UPPER_SNAKE_CASE
- Tipos/Interfaces: PascalCase (interface UserData)

## CSS Classes
- BEM-like com Tailwind
- Prefixo ceramic- para design system
```

---

## Dicas e Boas Práticas

### Performance

```typescript
// Lazy loading de módulos
const Module = lazy(() => import('./Module'));

// Memoização de componentes pesados
const HeavyComponent = memo(({ data }) => { ... });

// useMemo para cálculos pesados
const computed = useMemo(() => heavyCalculation(data), [data]);

// useCallback para funções em deps
const handleClick = useCallback(() => { ... }, [deps]);
```

### Error Handling

```typescript
// Componente de erro
function ErrorBoundary({ children }) {
  return (
    <ErrorBoundaryComponent
      fallback={<ErrorFallback />}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}

// Try-catch em async
try {
  const data = await fetchData();
} catch (error) {
  console.error('[Context] Erro:', error);
  setError(error.message);
}
```

### TypeScript

```typescript
// Tipos utilitários
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

// Props com children
interface Props {
  children: React.ReactNode;
}

// Event handlers
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {};
```
