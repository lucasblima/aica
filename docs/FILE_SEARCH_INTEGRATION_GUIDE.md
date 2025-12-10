# Guia de Integração: File Search para Novos Módulos

Este guia completo ensina como integrar **File Search** (busca semântica com Gemini Corpora API) em qualquer módulo novo do Aica Life OS.

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Pré-requisitos](#pré-requisitos)
3. [Passo 1: Criar Hook Especializado](#passo-1-criar-hook-especializado)
4. [Passo 2: Criar Serviço de Indexação](#passo-2-criar-serviço-de-indexação)
5. [Passo 3: Criar UI de Busca](#passo-3-criar-ui-de-busca)
6. [Passo 4: Integrar com Workflow](#passo-4-integrar-com-workflow)
7. [Passo 5: Testar](#passo-5-testar)
8. [Exemplos Práticos](#exemplos-práticos)
9. [Troubleshooting](#troubleshooting)

---

## Visão Geral da Arquitetura

O File Search no Aica Life OS segue uma arquitetura modular de 4 camadas:

```
┌─────────────────────────────────────────────────────────┐
│                     UI LAYER                            │
│  - SearchPanel (componente de busca)                    │
│  - ResultsList (exibição de resultados)                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    HOOK LAYER                           │
│  - use[Module]FileSearch (hook especializado)           │
│    ↳ Extende useModuleFileSearch                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  SERVICE LAYER                          │
│  - [entity]IndexingService (auto-indexação)             │
│  - fileSearchApiClient (comunicação com backend)        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  BACKEND LAYER                          │
│  - FastAPI (backend/main.py)                            │
│  - Gemini Corpora API                                   │
│  - Supabase (file_search_corpora, file_search_documents)│
└─────────────────────────────────────────────────────────┘
```

### Conceitos Chave

- **Corpus**: Coleção de documentos relacionados (ex: todos os documentos de um projeto)
- **Document**: Arquivo individual indexado (PDF, markdown, texto, etc.)
- **Module-Aware**: Filtragem por `module_type` e `module_id` para isolamento de dados
- **Auto-Indexação**: Indexação automática após criação/atualização de conteúdo

---

## Pré-requisitos

Antes de começar, certifique-se de que:

1. ✅ **Database**: Migrations aplicadas (`file_search_corpora`, `file_search_documents`)
2. ✅ **Backend**: FastAPI rodando em `http://localhost:8000`
3. ✅ **Module Type**: Seu módulo está listado no constraint `chk_corpora_module_type`:
   - `'grants'`, `'podcast'`, `'finance'`, `'journey'`, `'atlas'`, `'chat'`
   - Se não estiver, adicione à migration!

4. ✅ **Service Layer**: `fileSearchApiClient.ts` existe em `src/services/`

---

## Passo 1: Criar Hook Especializado

### 1.1. Criar arquivo do hook

Crie `src/modules/[seu-modulo]/hooks/use[Modulo]FileSearch.ts`:

```typescript
/**
 * Hook especializado para File Search no módulo [Modulo]
 */

import { useCallback, useEffect, useState } from 'react';
import { useModuleFileSearch } from '../../../hooks/useFileSearch';
import type {
  FileSearchCorpus,
  FileSearchDocument,
  FileSearchResult,
} from '../../../types/fileSearch';
import type { [TipoEntidade] } from '../types';

export interface Use[Modulo]FileSearchOptions {
  /** ID do usuário (module_id) */
  userId?: string;
  /** ID da entidade específica */
  entityId?: string;
  /** Auto-carregar corpora ao montar */
  autoLoad?: boolean;
}

export function use[Modulo]FileSearch(options: Use[Modulo]FileSearchOptions = {}) {
  const { userId, entityId, autoLoad = true } = options;

  // Base hook com filtro de módulo
  const baseHook = useModuleFileSearch('[nome-do-modulo]', userId || entityId);

  // Estados específicos
  const [corpus, setCorpus] = useState<FileSearchCorpus | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  /**
   * Carrega ou cria corpus
   */
  const ensureCorpus = useCallback(async (): Promise<FileSearchCorpus> => {
    try {
      if (!userId && !entityId) {
        throw new Error('userId or entityId is required');
      }

      // Tentar carregar corpus existente
      const existingCorpora = await baseHook.loadCorpora();
      const existingCorpus = existingCorpora.find(
        (c) =>
          c.module_type === '[nome-do-modulo]' &&
          (userId ? c.module_id === userId : c.module_id === entityId)
      );

      if (existingCorpus) {
        setCorpus(existingCorpus);
        return existingCorpus;
      }

      // Criar novo corpus
      const id = userId || entityId!;
      const corpusName = `[modulo]-${id}`;
      const displayName = `[Modulo] - ${id}`;

      const newCorpus = await baseHook.createNewCorpus(corpusName, displayName);
      setCorpus(newCorpus);
      return newCorpus;
    } catch (error) {
      console.error('[use[Modulo]FileSearch] ensureCorpus error:', error);
      throw error;
    }
  }, [userId, entityId, baseHook]);

  /**
   * Indexa uma entidade
   */
  const indexEntity = useCallback(
    async (
      entity: [TipoEntidade],
      metadata?: Record<string, any>
    ): Promise<FileSearchDocument> => {
      try {
        setIsIndexing(true);

        // Validar que há conteúdo
        if (!entity.content || entity.content.trim().length < 10) {
          throw new Error('Entidade não tem conteúdo suficiente');
        }

        // Garantir corpus
        const targetCorpus = await ensureCorpus();

        // Criar conteúdo enriquecido
        const enrichedContent = `
# [Título da Entidade]

${entity.content}

[Adicione metadados relevantes aqui]
        `.trim();

        // Criar arquivo virtual
        const contentBlob = new Blob([enrichedContent], { type: 'text/markdown' });
        const contentFile = new File(
          [contentBlob],
          `entity_${entity.id}.md`,
          { type: 'text/markdown' }
        );

        // Indexar documento
        const document = await baseHook.uploadDocument({
          file: contentFile,
          corpus_id: targetCorpus.id,
          display_name: `[Nome da Entidade] - ${entity.id}`,
          module_type: '[nome-do-modulo]',
          module_id: userId || entity.id,
          custom_metadata: {
            document_type: '[tipo-documento]',
            entity_id: entity.id,
            ...metadata,
          },
        });

        console.log('[use[Modulo]FileSearch] Entidade indexada:', document.id);
        return document;
      } catch (error) {
        console.error('[use[Modulo]FileSearch] indexEntity error:', error);
        throw error;
      } finally {
        setIsIndexing(false);
      }
    },
    [userId, ensureCorpus, baseHook]
  );

  /**
   * Busca semântica
   */
  const search = useCallback(
    async (query: string, resultCount: number = 5): Promise<FileSearchResult[]> => {
      try {
        if (!corpus) {
          throw new Error('Nenhum corpus disponível. Indexe uma entidade primeiro.');
        }

        const results = await baseHook.search({
          corpus_id: corpus.id,
          query,
          result_count: resultCount,
        });

        return results;
      } catch (error) {
        console.error('[use[Modulo]FileSearch] search error:', error);
        throw error;
      }
    },
    [corpus, baseHook]
  );

  /**
   * Auto-load ao montar
   */
  useEffect(() => {
    if (autoLoad && (userId || entityId)) {
      ensureCorpus().catch((error) => {
        console.warn('[use[Modulo]FileSearch] Auto-load failed:', error);
      });
    }
  }, [autoLoad, userId, entityId, ensureCorpus]);

  return {
    // Estados
    corpus,
    documents: baseHook.documents,
    searchResults: baseHook.searchResults,
    isLoading: baseHook.isLoading,
    isSearching: baseHook.isSearching,
    isIndexing,
    error: baseHook.error,

    // Ações
    indexEntity,
    search,
    ensureCorpus,
    clearSearchResults: baseHook.clearSearchResults,
    clearError: baseHook.clearError,

    // Metadados
    userId,
    entityId,
    moduleType: '[nome-do-modulo]' as const,
  };
}
```

### 1.2. Adicionar funções de busca especializadas

Adicione funções que fazem sentido para o seu domínio:

```typescript
/**
 * Busca por categoria (exemplo)
 */
const findByCategory = useCallback(
  async (category: string, resultCount: number = 10): Promise<FileSearchResult[]> => {
    const query = `Encontre todos os documentos da categoria "${category}"`;
    return await search(query, resultCount);
  },
  [search]
);

/**
 * Busca por período (exemplo)
 */
const findByPeriod = useCallback(
  async (startDate: Date, endDate: Date, resultCount: number = 10): Promise<FileSearchResult[]> => {
    const start = startDate.toLocaleDateString('pt-BR');
    const end = endDate.toLocaleDateString('pt-BR');
    const query = `Mostre documentos entre ${start} e ${end}`;
    return await search(query, resultCount);
  },
  [search]
);
```

---

## Passo 2: Criar Serviço de Indexação

### 2.1. Criar arquivo do serviço

Crie `src/modules/[seu-modulo]/services/[entidade]IndexingService.ts`:

```typescript
/**
 * [Entidade] Indexing Service
 *
 * Serviço para indexação automática de [entidades] usando File Search.
 */

import { supabase } from '../../../services/supabaseClient';
import type { FileSearchDocument } from '../../../types/fileSearch';
import type { [TipoEntidade] } from '../types';

/**
 * Interface do hook (evita importação circular)
 */
interface [Modulo]FileSearchHook {
  indexEntity: (
    entity: [TipoEntidade],
    metadata?: Record<string, any>
  ) => Promise<FileSearchDocument>;
}

/**
 * Indexa uma entidade no File Search
 */
export async function index[Entidade](
  entity: [TipoEntidade],
  fileSearchHook: [Modulo]FileSearchHook
): Promise<FileSearchDocument> {
  console.log('[IndexingService] Starting indexation for:', entity.id);

  try {
    // Validar conteúdo
    if (!entity.content || entity.content.trim().length < 10) {
      throw new Error('Entidade não tem conteúdo suficiente');
    }

    // Indexar
    const indexed = await fileSearchHook.indexEntity(entity);

    console.log('[IndexingService] Indexation complete:', indexed.id);
    return indexed;
  } catch (error) {
    console.error('[IndexingService] Indexation failed:', error);
    throw error;
  }
}

/**
 * Auto-indexa após criação
 */
export async function autoIndexAfterCreate(
  entity: [TipoEntidade],
  fileSearchHook: [Modulo]FileSearchHook
): Promise<FileSearchDocument> {
  console.log('[IndexingService] Auto-indexing after create:', entity.id);

  try {
    if (!entity.content || entity.content.trim().length < 10) {
      console.warn('[IndexingService] Insufficient content, skipping');
      throw new Error('Conteúdo insuficiente');
    }

    return await index[Entidade](entity, fileSearchHook);
  } catch (error) {
    console.error('[IndexingService] Auto-indexing failed:', error);
    throw error;
  }
}

/**
 * Re-indexa entidades existentes
 */
export async function reindexExisting[Entidades](
  userId: string,
  fileSearchHook: [Modulo]FileSearchHook,
  limit: number = 100
): Promise<FileSearchDocument[]> {
  console.log('[IndexingService] Starting bulk re-indexation for user:', userId);

  try {
    // Buscar entidades
    const { data: entities, error } = await supabase
      .from('[tabela_entidades]')
      .select('*')
      .eq('user_id', userId)
      .not('content', 'is', null)
      .limit(limit);

    if (error) throw new Error(`Failed to fetch: ${error.message}`);
    if (!entities || entities.length === 0) {
      console.log('[IndexingService] No entities to re-index');
      return [];
    }

    console.log(`[IndexingService] Found ${entities.length} entities`);

    const results: FileSearchDocument[] = [];
    for (const entity of entities) {
      try {
        const indexed = await index[Entidade](entity as [TipoEntidade], fileSearchHook);
        results.push(indexed);
      } catch (entityError) {
        console.error(`[IndexingService] Failed to re-index ${entity.id}:`, entityError);
      }
    }

    console.log(`[IndexingService] Complete: ${results.length}/${entities.length}`);
    return results;
  } catch (error) {
    console.error('[IndexingService] Bulk re-indexation failed:', error);
    throw error;
  }
}
```

---

## Passo 3: Criar UI de Busca

### 3.1. Criar componente SearchPanel

Crie `src/modules/[seu-modulo]/components/[Modulo]SearchPanel.tsx`:

```typescript
/**
 * [Modulo] Search Panel
 *
 * UI para busca semântica no módulo [Modulo]
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FileSearchResult } from '../../../types/fileSearch';

export interface [Modulo]SearchPanelProps {
  onSearch: (query: string) => Promise<FileSearchResult[]>;
  results?: FileSearchResult[];
  isSearching?: boolean;
  hasDocuments?: boolean;
}

export const [Modulo]SearchPanel: React.FC<[Modulo]SearchPanelProps> = ({
  onSearch,
  results = [],
  isSearching = false,
  hasDocuments = false,
}) => {
  const [query, setQuery] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      await onSearch(query.trim());
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🔍</span>
        <h3 className="text-lg font-semibold text-gray-900">Busca Semântica</h3>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite sua pergunta..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!hasDocuments || isSearching}
          />
          <button
            type="submit"
            disabled={!hasDocuments || isSearching || !query.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {results.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-blue-50 rounded-lg p-4 border border-blue-100"
              >
                <p className="text-sm text-gray-700">{result.text}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Confiança: {(result.score * 100).toFixed(1)}%
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!hasDocuments && (
        <div className="text-center py-8 text-gray-400">
          <p>Nenhum documento indexado ainda</p>
        </div>
      )}
    </div>
  );
};
```

---

## Passo 4: Integrar com Workflow

### 4.1. Integrar no fluxo de criação

Em `src/modules/[seu-modulo]/services/[entidade]Service.ts`:

```typescript
import { autoIndexAfterCreate } from './[entidade]IndexingService';
import { use[Modulo]FileSearch } from '../hooks/use[Modulo]FileSearch';

/**
 * Cria entidade e auto-indexa
 */
export async function createEntityWithIndexing(
  entityData: CreateEntityData,
  userId: string
): Promise<[TipoEntidade]> {
  // 1. Criar entidade no banco
  const { data: entity, error } = await supabase
    .from('[tabela_entidades]')
    .insert({
      ...entityData,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Auto-indexar (em background, não bloqueia)
  try {
    const fileSearchHook = use[Modulo]FileSearch({ userId });
    await autoIndexAfterCreate(entity, fileSearchHook);
  } catch (indexError) {
    console.error('Auto-indexing failed (não-crítico):', indexError);
    // Não falha a operação principal
  }

  return entity;
}
```

### 4.2. Integrar na UI

Em `src/modules/[seu-modulo]/views/[Modulo]View.tsx`:

```typescript
import { use[Modulo]FileSearch } from '../hooks/use[Modulo]FileSearch';
import { [Modulo]SearchPanel } from '../components/[Modulo]SearchPanel';

export const [Modulo]View: React.FC = () => {
  const userId = useAuth().user?.id;

  const {
    search,
    searchResults,
    isSearching,
    documents,
  } = use[Modulo]FileSearch({ userId, autoLoad: true });

  const handleSearch = async (query: string) => {
    const results = await search(query, 5);
    return results;
  };

  return (
    <div className="p-6">
      {/* Conteúdo principal do módulo */}

      {/* Search Panel */}
      {documents.length > 0 && (
        <div className="mt-6">
          <[Modulo]SearchPanel
            onSearch={handleSearch}
            results={searchResults}
            isSearching={isSearching}
            hasDocuments={documents.length > 0}
          />
        </div>
      )}
    </div>
  );
};
```

---

## Passo 5: Testar

### 5.1. Testar Indexação

```typescript
// Em um teste ou console
const hook = use[Modulo]FileSearch({ userId: 'user-123' });

const entity: [TipoEntidade] = {
  id: 'test-1',
  content: 'Este é um conteúdo de teste para indexação',
  // ... outros campos
};

const indexed = await hook.indexEntity(entity);
console.log('Indexado:', indexed.id);
```

### 5.2. Testar Busca

```typescript
const results = await hook.search('conteúdo de teste', 5);
console.log('Resultados:', results);
```

### 5.3. Verificar no Supabase

```sql
-- Verificar corpus criados
SELECT * FROM file_search_corpora
WHERE module_type = '[nome-do-modulo]';

-- Verificar documentos indexados
SELECT * FROM file_search_documents
WHERE module_type = '[nome-do-modulo]';
```

---

## Exemplos Práticos

### Exemplo 1: Módulo "Atlas" (Tarefas)

```typescript
// Hook: useAtlasFileSearch.ts
export function useAtlasFileSearch(options: UseAtlasFileSearchOptions = {}) {
  const baseHook = useModuleFileSearch('atlas', options.userId);

  const indexTask = useCallback(async (
    task: Task,
    metadata?: Record<string, any>
  ): Promise<FileSearchDocument> => {
    const enrichedContent = `
# Tarefa: ${task.title}

**Descrição**: ${task.description}
**Categoria**: ${task.category}
**Prioridade**: ${task.priority}

${task.notes ? `## Notas\n\n${task.notes}` : ''}
    `.trim();

    const contentBlob = new Blob([enrichedContent], { type: 'text/markdown' });
    const contentFile = new File([contentBlob], `task_${task.id}.md`);

    return await baseHook.uploadDocument({
      file: contentFile,
      corpus_id: targetCorpus.id,
      display_name: task.title,
      module_type: 'atlas',
      module_id: options.userId || task.id,
      custom_metadata: {
        document_type: 'task',
        task_id: task.id,
        category: task.category,
        priority: task.priority,
        ...metadata,
      },
    });
  }, [baseHook, options.userId]);

  const findByPriority = useCallback(async (
    priority: 'low' | 'medium' | 'high',
    resultCount: number = 10
  ): Promise<FileSearchResult[]> => {
    const query = `Encontre todas as tarefas com prioridade ${priority}`;
    return await search(query, resultCount);
  }, [search]);

  return {
    indexTask,
    findByPriority,
    // ... outros métodos
  };
}
```

---

## Troubleshooting

### ❌ Erro: "module_type not allowed"

**Solução**: Adicione seu módulo ao constraint na migration:

```sql
ALTER TABLE public.file_search_corpora
  DROP CONSTRAINT IF EXISTS chk_corpora_module_type;

ALTER TABLE public.file_search_corpora
  ADD CONSTRAINT chk_corpora_module_type
  CHECK (module_type IN ('grants', 'podcast', 'finance', 'journey', 'atlas', 'chat', '[seu-modulo]'));
```

### ❌ Erro: "Corpus not found"

**Solução**: Chame `ensureCorpus()` antes de indexar ou buscar:

```typescript
await ensureCorpus();
await indexEntity(entity);
```

### ❌ Erro: "Backend connection refused"

**Solução**: Certifique-se de que o FastAPI está rodando:

```bash
cd backend
python main.py
```

### ❌ Búscas não retornam resultados

**Solução**: Verifique se os documentos estão com status `'active'`:

```sql
SELECT indexing_status, COUNT(*)
FROM file_search_documents
WHERE module_type = '[seu-modulo]'
GROUP BY indexing_status;
```

---

## ✅ Checklist Final

- [ ] Hook `use[Modulo]FileSearch` criado
- [ ] Serviço `[entidade]IndexingService` criado
- [ ] UI `[Modulo]SearchPanel` criado
- [ ] Integrado com workflow de criação
- [ ] Testes de indexação passando
- [ ] Testes de busca passando
- [ ] Documentos com status `'active'` no Supabase
- [ ] Analytics exibindo estatísticas do módulo

---

## 📚 Referências

- **Hooks Existentes**: Veja `useGrantsFileSearch.ts`, `useFinanceFileSearch.ts`, `useJourneyFileSearch.ts`
- **Serviços Existentes**: Veja `statementIndexingService.ts`, `momentIndexingService.ts`
- **UI Existente**: Veja `FinanceSearchPanel.tsx`, `TranscriptSearchPanel.tsx`
- **Database Schema**: `supabase/migrations/20251209180000_file_search_module_aware.sql`

---

🎉 **Pronto!** Seu módulo agora tem busca semântica completa com File Search!
