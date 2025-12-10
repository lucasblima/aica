# 🔍 Plano de Implementação - Gemini File Search Unificado

**Objetivo:** Implementar arquitetura unificada de File Search que permita TODOS os módulos do Aica indexar e buscar documentos de forma consistente, segura e eficiente.

**Status Atual:** ⚠️ Implementação fragmentada, sem uso real de File Search
**Status Desejado:** ✅ Arquitetura unificada, todos os módulos integrados

---

## 📊 Visão Geral das Fases

| Fase | Nome | Duração | Dependências | Prioridade |
|------|------|---------|--------------|------------|
| 1 | Service Layer Unificado | 2-3 dias | Nenhuma | 🔴 CRÍTICA |
| 2 | Migration Module-Aware | 1 dia | Fase 1 | 🔴 CRÍTICA |
| 3 | Integração Grants | 2 dias | Fases 1-2 | 🟠 ALTA |
| 4 | Integração Podcast | 1-2 dias | Fases 1-2 | 🟡 MÉDIA |
| 5 | Integração Finance | 1 dia | Fases 1-2 | 🟡 MÉDIA |
| 6 | Integração Journey | 1 dia | Fases 1-2 | 🟢 BAIXA |
| 7 | Dashboard Analytics | 1 dia | Fases 1-3 | 🟢 BAIXA |
| 8 | Documentação | 1 dia | Todas | 🟢 BAIXA |
| 9 | Testes E2E | 1-2 dias | Fases 1-6 | 🟡 MÉDIA |
| 10 | Deploy e Otimização | Contínuo | Todas | 🟡 MÉDIA |

**Total Estimado:** 12-15 dias de trabalho

---

## 📋 FASE 1: Service Layer Unificado (CRÍTICA)

### Objetivos
- Centralizar todas as operações de File Search em um service layer único
- Remover dependência direta da API Gemini no frontend
- Implementar tracking automático de custos
- Criar abstrações reutilizáveis para todos os módulos

### Tarefas

#### 1.1 Criar `src/types/fileSearch.ts`

```typescript
/**
 * Types para File Search unificado
 */

export interface FileSearchCorpus {
  id: string;
  user_id: string;
  name: string;
  display_name: string;
  created_at: string;
  document_count: number;
}

export interface FileSearchDocument {
  id: string;
  corpus_id: string;
  user_id: string;
  gemini_file_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  module_type?: 'grants' | 'podcast' | 'journey' | 'finance' | 'atlas';
  module_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface FileSearchQuery {
  corpus_id: string;
  query: string;
  result_count?: number;
  module_type?: string;
  module_id?: string;
}

export interface FileSearchResult {
  document_id: string;
  file_name: string;
  relevant_chunks: Array<{
    text: string;
    score: number;
  }>;
  metadata?: Record<string, any>;
}

export interface IndexDocumentRequest {
  file: File;
  corpus_id: string;
  module_type?: string;
  module_id?: string;
  metadata?: Record<string, any>;
}
```

#### 1.2 Criar `src/services/fileSearchApiClient.ts`

```typescript
/**
 * File Search API Client
 *
 * Wrapper unificado para operações de File Search via backend.
 * Substitui chamadas diretas à API Gemini.
 */

import type {
  FileSearchCorpus,
  FileSearchDocument,
  FileSearchQuery,
  FileSearchResult,
  IndexDocumentRequest
} from '../types/fileSearch';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Lista todos os corpora do usuário
 */
export async function listCorpora(): Promise<FileSearchCorpus[]> {
  const response = await fetch(`${API_BASE_URL}/api/file-search/corpora`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Failed to list corpora: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Cria um novo corpus
 */
export async function createCorpus(
  name: string,
  displayName: string
): Promise<FileSearchCorpus> {
  const response = await fetch(`${API_BASE_URL}/api/file-search/corpora`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, display_name: displayName })
  });

  if (!response.ok) {
    throw new Error(`Failed to create corpus: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Indexa um documento no File Search
 */
export async function indexDocument(
  request: IndexDocumentRequest
): Promise<FileSearchDocument> {
  const formData = new FormData();
  formData.append('file', request.file);
  formData.append('corpus_id', request.corpus_id);

  if (request.module_type) {
    formData.append('module_type', request.module_type);
  }

  if (request.module_id) {
    formData.append('module_id', request.module_id);
  }

  if (request.metadata) {
    formData.append('metadata', JSON.stringify(request.metadata));
  }

  const response = await fetch(`${API_BASE_URL}/api/file-search/documents`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to index document: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Realiza query semântica no File Search
 */
export async function queryFileSearch(
  query: FileSearchQuery
): Promise<FileSearchResult[]> {
  const response = await fetch(`${API_BASE_URL}/api/file-search/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(query)
  });

  if (!response.ok) {
    throw new Error(`Failed to query file search: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Lista documentos de um corpus
 */
export async function listDocuments(
  corpusId: string,
  filters?: { module_type?: string; module_id?: string }
): Promise<FileSearchDocument[]> {
  const params = new URLSearchParams({ corpus_id: corpusId });

  if (filters?.module_type) {
    params.append('module_type', filters.module_type);
  }

  if (filters?.module_id) {
    params.append('module_id', filters.module_id);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/file-search/documents?${params}`,
    {
      method: 'GET',
      credentials: 'include'
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list documents: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Remove um documento do corpus
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/file-search/documents/${documentId}`,
    {
      method: 'DELETE',
      credentials: 'include'
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete document: ${response.statusText}`);
  }
}
```

#### 1.3 Expandir `backend/main.py` - Endpoints Completos

```python
# Adicionar ao backend/main.py

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from typing import Optional, List
import google.generativeai as genai
from pydantic import BaseModel

# ... código existente ...

class CreateCorpusRequest(BaseModel):
    name: str
    display_name: str

class QueryRequest(BaseModel):
    corpus_id: str
    query: str
    result_count: Optional[int] = 5
    module_type: Optional[str] = None
    module_id: Optional[str] = None

@app.post("/api/file-search/corpora")
async def create_corpus(
    request: CreateCorpusRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Cria um novo corpus no Gemini File Search"""
    try:
        # Criar corpus no Gemini
        corpus = genai.create_corpus(
            name=request.name,
            display_name=request.display_name
        )

        # Salvar no Supabase
        result = supabase.table('file_search_corpora').insert({
            'user_id': user_id,
            'gemini_corpus_id': corpus.name,
            'name': request.name,
            'display_name': request.display_name
        }).execute()

        return result.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/file-search/documents")
async def index_document(
    file: UploadFile = File(...),
    corpus_id: str = Form(...),
    module_type: Optional[str] = Form(None),
    module_id: Optional[str] = Form(None),
    metadata: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id)
):
    """Indexa um documento no File Search"""
    try:
        # Upload para Supabase Storage
        file_bytes = await file.read()
        storage_path = f"{user_id}/file-search/{file.filename}"

        supabase.storage.from_('user-documents').upload(
            storage_path,
            file_bytes,
            file_options={'content-type': file.content_type}
        )

        # Upload para Gemini File API
        gemini_file = genai.upload_file(
            file_bytes,
            mime_type=file.content_type,
            display_name=file.filename
        )

        # Adicionar ao corpus
        corpus = genai.get_corpus(corpus_id)
        document = corpus.create_document(
            name=file.filename,
            display_name=file.filename
        )
        document.add_file(gemini_file)

        # Salvar metadata no Supabase
        result = supabase.table('file_search_documents').insert({
            'corpus_id': corpus_id,
            'user_id': user_id,
            'gemini_file_id': gemini_file.name,
            'file_name': file.filename,
            'mime_type': file.content_type,
            'file_size': len(file_bytes),
            'storage_path': storage_path,
            'module_type': module_type,
            'module_id': module_id,
            'metadata': json.loads(metadata) if metadata else None
        }).execute()

        # Track AI usage
        await track_ai_usage(
            user_id=user_id,
            operation_type='file_indexing',
            ai_model='gemini-file-search',
            total_cost_usd=0.00015,  # $0.15 per 1000 docs
            module_type=module_type,
            module_id=module_id
        )

        return result.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/file-search/query")
async def query_file_search(
    request: QueryRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Realiza query semântica no File Search"""
    try:
        # Buscar no Gemini
        corpus = genai.get_corpus(request.corpus_id)

        # Filtrar por módulo se especificado
        # (isso requer metadata no Gemini ou filtro pós-query)

        results = corpus.query(
            query=request.query,
            results_count=request.result_count
        )

        # Track AI usage
        await track_ai_usage(
            user_id=user_id,
            operation_type='file_search_query',
            ai_model='gemini-file-search',
            total_cost_usd=0.05,  # $0.05 per query
            module_type=request.module_type,
            module_id=request.module_id
        )

        # Formatar resultados
        formatted_results = []
        for result in results:
            formatted_results.append({
                'document_id': result.document.name,
                'file_name': result.document.display_name,
                'relevant_chunks': [
                    {'text': chunk.text, 'score': chunk.score}
                    for chunk in result.chunks
                ],
                'metadata': result.document.metadata
            })

        return formatted_results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### 1.4 Criar `src/hooks/useFileSearch.ts`

```typescript
/**
 * Hook genérico para File Search
 */

import { useState, useCallback } from 'react';
import {
  queryFileSearch,
  indexDocument,
  listDocuments,
  deleteDocument
} from '../services/fileSearchApiClient';
import type {
  FileSearchQuery,
  FileSearchResult,
  FileSearchDocument,
  IndexDocumentRequest
} from '../types/fileSearch';

export function useFileSearch(corpusId: string) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FileSearchResult[]>([]);
  const [documents, setDocuments] = useState<FileSearchDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, filters?: {
    module_type?: string;
    module_id?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const searchQuery: FileSearchQuery = {
        corpus_id: corpusId,
        query,
        ...filters
      };

      const searchResults = await queryFileSearch(searchQuery);
      setResults(searchResults);

      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('[useFileSearch] Search error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [corpusId]);

  const uploadAndIndex = useCallback(async (
    file: File,
    options?: {
      module_type?: string;
      module_id?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);

      const request: IndexDocumentRequest = {
        file,
        corpus_id: corpusId,
        ...options
      };

      const document = await indexDocument(request);

      // Refresh document list
      await loadDocuments();

      return document;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Indexing failed';
      setError(errorMessage);
      console.error('[useFileSearch] Index error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [corpusId]);

  const loadDocuments = useCallback(async (filters?: {
    module_type?: string;
    module_id?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const docs = await listDocuments(corpusId, filters);
      setDocuments(docs);

      return docs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Load failed';
      setError(errorMessage);
      console.error('[useFileSearch] Load error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [corpusId]);

  const removeDocument = useCallback(async (documentId: string) => {
    try {
      setLoading(true);
      setError(null);

      await deleteDocument(documentId);

      // Refresh document list
      await loadDocuments();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      console.error('[useFileSearch] Delete error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [corpusId, loadDocuments]);

  return {
    loading,
    results,
    documents,
    error,
    search,
    uploadAndIndex,
    loadDocuments,
    removeDocument
  };
}
```

### Critérios de Sucesso Fase 1
- ✅ Service layer criado e testado
- ✅ Backend endpoints implementados
- ✅ Tracking de custos funcionando
- ✅ Hook genérico funcional
- ✅ Testes unitários passando

---

## 📋 FASE 2: Migration Module-Aware (CRÍTICA)

### Objetivos
- Adicionar campos `module_type` e `module_id` ao schema
- Criar índices para queries filtradas
- Atualizar RLS policies para isolamento

### Tarefa 2.1: Criar Migration

```sql
-- supabase/migrations/20251209_file_search_module_tracking.sql

-- Adicionar colunas de módulo a file_search_documents
ALTER TABLE public.file_search_documents
ADD COLUMN IF NOT EXISTS module_type TEXT,
ADD COLUMN IF NOT EXISTS module_id UUID;

-- Adicionar constraint de module_type
ALTER TABLE public.file_search_documents
ADD CONSTRAINT check_module_type CHECK (
  module_type IS NULL OR
  module_type IN ('grants', 'podcast', 'journey', 'finance', 'atlas', 'chat')
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_file_search_documents_module
ON public.file_search_documents(module_type, module_id)
WHERE module_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_file_search_documents_user_module
ON public.file_search_documents(user_id, module_type, module_id);

-- Atualizar RLS policy para isolamento por módulo
DROP POLICY IF EXISTS "Users can view own documents" ON public.file_search_documents;

CREATE POLICY "Users can view own documents"
ON public.file_search_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
ON public.file_search_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
ON public.file_search_documents FOR DELETE
USING (auth.uid() = user_id);

-- Comentários
COMMENT ON COLUMN public.file_search_documents.module_type IS
'Module that owns this document (grants, podcast, journey, finance, atlas)';

COMMENT ON COLUMN public.file_search_documents.module_id IS
'ID of the entity within the module (project_id, episode_id, etc)';
```

### Critérios de Sucesso Fase 2
- ✅ Migration aplicada sem erros
- ✅ Índices criados
- ✅ RLS policies funcionando
- ✅ Schema validado

---

## 📋 FASE 3: Integração Grants (ALTA PRIORIDADE)

### Objetivos
- Indexar PDFs de editais automaticamente
- Busca semântica em EditalDetailView
- Substituir extração local por File Search

### Tarefas

#### 3.1 Criar `src/modules/grants/hooks/useGrantsFileSearch.ts`

```typescript
import { useFileSearch } from '../../../hooks/useFileSearch';
import { useEffect } from 'react';

const GRANTS_CORPUS_ID = 'grants-corpus'; // TODO: Get from config

export function useGrantsFileSearch(projectId?: string) {
  const {
    loading,
    results,
    documents,
    error,
    search,
    uploadAndIndex,
    loadDocuments,
    removeDocument
  } = useFileSearch(GRANTS_CORPUS_ID);

  // Load documents for this project
  useEffect(() => {
    if (projectId) {
      loadDocuments({
        module_type: 'grants',
        module_id: projectId
      });
    }
  }, [projectId, loadDocuments]);

  const searchInProject = async (query: string) => {
    return search(query, {
      module_type: 'grants',
      module_id: projectId
    });
  };

  const indexEditalPDF = async (file: File, editalId: string) => {
    return uploadAndIndex(file, {
      module_type: 'grants',
      module_id: editalId,
      metadata: {
        entity_type: 'edital',
        edital_id: editalId
      }
    });
  };

  return {
    loading,
    results,
    documents,
    error,
    searchInProject,
    indexEditalPDF,
    removeDocument
  };
}
```

#### 3.2 Modificar `documentService.ts`

```typescript
// Adicionar auto-indexing após upload de PDF

import { indexDocument } from '../../../services/fileSearchApiClient';

export async function uploadEditalPDF(
  projectId: string,
  file: File
): Promise<void> {
  // Upload existente para storage
  const storageResult = await uploadToStorage(file);

  // NOVO: Auto-index no File Search
  try {
    await indexDocument({
      file,
      corpus_id: 'grants-corpus',
      module_type: 'grants',
      module_id: projectId,
      metadata: {
        entity_type: 'edital',
        project_id: projectId
      }
    });

    console.log('[Grants] PDF auto-indexed in File Search');
  } catch (err) {
    // Não falhar upload se indexing falhar
    console.error('[Grants] File Search indexing failed:', err);
  }
}
```

#### 3.3 Criar Componente de Busca

```typescript
// src/modules/grants/components/EditalSearchBar.tsx

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useGrantsFileSearch } from '../hooks/useGrantsFileSearch';

export function EditalSearchBar({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState('');
  const { searchInProject, loading, results } = useGrantsFileSearch(projectId);

  const handleSearch = async () => {
    if (!query.trim()) return;
    await searchInProject(query);
  };

  return (
    <div className="ceramic-card p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar no edital..."
          className="flex-1 ceramic-inset px-4 py-2 rounded-xl"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="ceramic-button px-4 py-2 rounded-xl"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((result, idx) => (
            <div key={idx} className="ceramic-inset p-3 rounded-lg">
              <p className="text-sm font-bold">{result.file_name}</p>
              {result.relevant_chunks.map((chunk, chunkIdx) => (
                <p key={chunkIdx} className="text-xs mt-1">
                  {chunk.text}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Critérios de Sucesso Fase 3
- ✅ PDFs indexados automaticamente
- ✅ Busca semântica funcional
- ✅ UI integrada em EditalDetailView
- ✅ Testes E2E passando

---

## 📋 FASES 4-6: Integração Outros Módulos

*(Similar à Fase 3, adaptado para cada módulo)*

### Fase 4: Podcast
- Hook `usePodcastFileSearch`
- Auto-index transcrições
- Busca por tópicos

### Fase 5: Finance
- Hook `useFinanceFileSearch`
- Index relatórios
- Busca por categorias

### Fase 6: Journey
- Hook `useJourneyFileSearch`
- Index memórias
- Busca temporal

---

## 📋 FASE 7-10: Finalização

### Fase 7: Dashboard Analytics
- Estatísticas de indexação
- Top queries
- Custos por módulo

### Fase 8: Documentação
- Atualizar PRD.md
- Guia de integração
- API docs

### Fase 9: Testes E2E
- Cross-module search
- RLS validation
- Performance tests

### Fase 10: Deploy
- Monitoramento de custos
- Otimização de cache
- Performance tuning

---

## 📊 Métricas de Sucesso

| Métrica | Antes | Meta | Como Medir |
|---------|-------|------|------------|
| **Custo por query** | N/A (não usa FS) | <$0.10 | Dashboard tracking |
| **Tempo de indexação** | N/A | <30s por PDF | Backend logs |
| **Precisão de busca** | 0% (sem busca) | >80% relevância | Testes E2E |
| **Módulos integrados** | 0 | 5 | Code coverage |
| **Documentos indexados** | 0 | >100 | DB query |

---

## 🚀 Como Começar

**Opção 1: Implementação Sequencial (Recomendado)**
```bash
# Semana 1
1. FASE 1: Service Layer (2-3 dias)
2. FASE 2: Migration (1 dia)
3. FASE 3: Grants Integration (2 dias)

# Semana 2
4. FASE 4: Podcast Integration (1-2 dias)
5. FASE 5: Finance Integration (1 dia)
6. Testes e ajustes
```

**Opção 2: MVP Rápido (Grants Only)**
```bash
# 3-4 dias
1. FASE 1 (simplificada): Service layer básico
2. FASE 2: Migration
3. FASE 3: Grants integration
4. Validar com usuários reais
```

**Opção 3: Paralela (Team)**
```bash
# Dev 1: Backend (Fase 1 backend + tracking)
# Dev 2: Frontend (Fase 1 frontend + hooks)
# Dev 3: Grants (Fase 3)
# Merge e integração: 1 semana
```

---

## ✅ Checklist Final

Antes de considerar completo:

- [ ] Todas as 31 tarefas marcadas como concluídas
- [ ] Testes E2E passando em todos os módulos
- [ ] Documentação completa publicada
- [ ] Zero chamadas diretas à API Gemini no frontend
- [ ] Tracking de custos em 100% das operações
- [ ] RLS validado (usuários isolados)
- [ ] Performance <2s para queries típicas
- [ ] Budget alerts configurados
- [ ] Rollback plan documentado
- [ ] Equipe treinada no uso

---

**Última atualização:** 2025-12-09
**Status:** 📋 Planejamento completo, pronto para execução
**Próximo passo:** Começar FASE 1 - Service Layer Unificado
