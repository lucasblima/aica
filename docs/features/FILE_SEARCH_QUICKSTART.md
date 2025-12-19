# File Search - Guia Rápido de Uso

## Status: FASE 1 COMPLETA ✅

A infraestrutura básica de File Search está funcionando! Este guia mostra como usar o sistema.

---

## Arquitetura Implementada

### Backend (Python FastAPI)
**Arquivo:** `backend/main.py` (780 linhas)

**6 Endpoints REST:**
```python
POST   /api/file-search/corpora           # Criar corpus
GET    /api/file-search/corpora           # Listar corpora
POST   /api/file-search/documents         # Indexar documento
GET    /api/file-search/documents         # Listar documentos
DELETE /api/file-search/documents/{id}    # Deletar documento
POST   /api/file-search/query              # Buscar documentos
```

**Tracking de Custos Integrado:**
- Indexação: $0.00015 por documento
- Query: $0.05 por busca
- Registrado automaticamente em `ai_usage_tracking`

---

### Frontend (TypeScript React)

**Types:** `src/types/fileSearch.ts` (292 linhas)
- FileSearchCorpus, FileSearchDocument, FileSearchQuery
- FileSearchResult, IndexDocumentRequest
- ModuleType union ('grants' | 'podcast' | 'finance' | etc.)

**Service Layer:** `src/services/fileSearchApiClient.ts` (189 linhas)
- Funções para comunicação com backend
- Error handling completo
- Autenticação automática (cookies de sessão)

**Hook React:** `src/hooks/useFileSearch.ts` (292 linhas)
- `useFileSearch()` - Hook genérico com gerenciamento de estado
- `useModuleFileSearch(module_type, module_id)` - Hook especializado

---

## Como Usar

### 1. Uso Básico - Hook Genérico

```tsx
import { useFileSearch } from '../hooks/useFileSearch';

function MyComponent() {
  const {
    corpora,
    createNewCorpus,
    uploadDocument,
    search,
    searchResults,
    isLoading,
    isSearching,
    error
  } = useFileSearch();

  // Criar um corpus
  const handleCreateCorpus = async () => {
    const corpus = await createNewCorpus(
      'my-corpus',
      'Meu Corpus de Documentos',
      'grants',      // module_type (opcional)
      'project-123'  // module_id (opcional)
    );
    console.log('Corpus criado:', corpus);
  };

  // Indexar um documento
  const handleUpload = async (file: File) => {
    const doc = await uploadDocument({
      file: file,
      corpus_id: corpora[0].id,
      module_type: 'grants',
      module_id: 'project-123',
      metadata: { category: 'edital', year: 2024 }
    });
    console.log('Documento indexado:', doc);
  };

  // Buscar
  const handleSearch = async () => {
    const results = await search({
      corpus_id: corpora[0].id,
      query: 'Como fazer orçamento?',
      result_count: 10,
      module_type: 'grants',
      module_id: 'project-123'
    });
    console.log('Resultados:', results);
  };

  return (
    <div>
      <button onClick={handleCreateCorpus}>Criar Corpus</button>
      <input type="file" onChange={(e) => handleUpload(e.target.files![0])} />
      <button onClick={handleSearch}>Buscar</button>
      {isSearching && <p>Buscando...</p>}
      {searchResults.map(result => (
        <div key={result.document_id}>
          <h3>{result.file_name}</h3>
          {result.relevant_chunks.map((chunk, i) => (
            <p key={i}>{chunk.text}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

### 2. Uso Avançado - Hook Especializado por Módulo

```tsx
import { useModuleFileSearch } from '../hooks/useFileSearch';

function GrantsComponent({ projectId }: { projectId: string }) {
  // Hook automaticamente filtra apenas documentos do módulo Grants
  const grantsSearch = useModuleFileSearch('grants', projectId);

  // Todas as operações já incluem module_type e module_id
  const handleCreateCorpus = async () => {
    const corpus = await grantsSearch.createNewCorpus(
      'grants-edital-001',
      'Edital de Pesquisa 2024'
      // module_type e module_id são adicionados automaticamente
    );
  };

  const handleSearch = async () => {
    const results = await grantsSearch.search({
      corpus_id: 'corpus-123',
      query: 'requisitos de elegibilidade',
      result_count: 5
      // module_type e module_id são adicionados automaticamente
    });
  };

  return (
    <div>
      <p>Módulo: {grantsSearch.module_type}</p>
      <p>Projeto: {grantsSearch.module_id}</p>
      {/* ... UI ... */}
    </div>
  );
}
```

---

## Próximos Passos (FASE 2)

### Migration Module-Aware
Antes de usar em produção, aplicar a migration da Fase 2:
- Adicionar `module_type` e `module_id` às tabelas
- Criar índices para queries filtradas
- Atualizar RLS policies

### Integração em Módulos
- **FASE 3:** Grants (indexação de editais + busca)
- **FASE 4:** Podcast (transcrições)
- **FASE 5:** Finance (relatórios)
- **FASE 6:** Journey (memórias)

---

## Custos

| Operação | Custo | Tracking |
|----------|-------|----------|
| Indexar documento | $0.00015/doc | ✅ Automático |
| Busca semântica | $0.05/query | ✅ Automático |

**Monitoramento:** Dashboard de AI Cost Tracking disponível em Settings → Custos de IA

---

## Troubleshooting

### Backend não está rodando
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Variáveis de ambiente faltando
Verificar `.env`:
```env
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_JWT_SECRET=...
```

### CORS error
Adicionar frontend URL em `backend/main.py`:
```python
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    # adicionar sua URL aqui
]
```

---

**Última atualização:** 2025-12-09
**Status:** FASE 1 COMPLETA - Sistema pronto para migration e integrações
