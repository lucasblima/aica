# Gemini File Search - Implementação Frontend

## Visão Geral

O Aica Life OS agora implementa **Retrieval Augmented Generation (RAG)** usando o **Gemini File Search API** diretamente no frontend, sem necessidade de backend Python.

### Benefícios

- ✅ **Sem backend necessário** - Tudo roda no navegador
- ✅ **Armazenamento gratuito** - File storage e embeddings são grátis
- ✅ **Busca semântica** - Não apenas keywords, mas significado contextual
- ✅ **Indexação automática** - Chunking e embeddings gerenciados pelo Gemini
- ✅ **Custo otimizado** - Paga apenas por embeddings na indexação + tokens do modelo

## Arquitetura

```
Frontend (React/TypeScript)
    │
    ├── useFileSearch Hook
    │       │
    │       └── geminiFileSearchService
    │               │
    │               ├── Gemini File Search API (indexação + busca)
    │               └── Supabase (metadata tracking)
    │
    └── Componentes UI (upload, search, results)
```

## Como Funciona

### 1. Indexação de Documentos

```typescript
import { useFileSearch } from '@/hooks/useFileSearch';

function MyComponent() {
  const { uploadDocument, isUploading } = useFileSearch();

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadDocument(
        file,
        'documents', // categoria: 'financial' | 'documents' | 'personal' | 'business' | 'grants'
        { project: 'meu-projeto', year: 2024 } // metadata opcional
      );
      console.log('Documento indexado:', result);
    } catch (error) {
      console.error('Erro no upload:', error);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {isUploading && <p>Indexando documento...</p>}
    </div>
  );
}
```

**O que acontece internamente:**
1. Cria ou reutiliza File Search Store para o usuário + categoria
2. Upload do arquivo para Gemini File Search
3. Gemini faz chunking automático (500 tokens/chunk, 50 overlap)
4. Gera embeddings e indexa
5. Metadata salva no Supabase para tracking

### 2. Busca Semântica

```typescript
import { useFileSearch } from '@/hooks/useFileSearch';

function SearchComponent() {
  const { searchDocuments, isSearching } = useFileSearch();

  const handleSearch = async () => {
    try {
      const result = await searchDocuments(
        'Qual o orçamento previsto para marketing?',
        ['financial', 'documents'], // buscar em múltiplas categorias
        { year: 2024 } // filtro opcional de metadata
      );

      console.log('Resposta:', result.answer);
      console.log('Citações:', result.citations);
    } catch (error) {
      console.error('Erro na busca:', error);
    }
  };

  return (
    <button onClick={handleSearch} disabled={isSearching}>
      {isSearching ? 'Buscando...' : 'Buscar'}
    </button>
  );
}
```

**O que acontece internamente:**
1. Busca os File Search Stores do usuário nas categorias especificadas
2. Envia query para Gemini com ferramenta File Search
3. Gemini faz busca semântica nos documentos indexados
4. Retorna resposta + citações (grounding metadata)
5. Query logada no Supabase para analytics

## Configuração

### 1. Variáveis de Ambiente

Adicione ao `.env`:

```env
VITE_GEMINI_API_KEY=sua_chave_gemini_aqui
```

**Como obter:**
1. Acesse https://aistudio.google.com/apikey
2. Crie uma API Key
3. Cole no `.env`

### 2. Tabelas Supabase

As seguintes tabelas são usadas para tracking (já devem estar criadas):

**`user_file_search_stores`**
```sql
CREATE TABLE user_file_search_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  store_name TEXT NOT NULL,           -- fileSearchStores/xxx
  store_category TEXT NOT NULL,       -- 'financial', 'documents', etc
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_category)
);
```

**`indexed_documents`**
```sql
CREATE TABLE indexed_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  store_id UUID REFERENCES user_file_search_stores(id),
  gemini_file_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  custom_metadata JSONB,
  indexing_status TEXT DEFAULT 'completed',
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`file_search_queries`**
```sql
CREATE TABLE file_search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  store_names TEXT[],
  query_text TEXT NOT NULL,
  metadata_filter TEXT,
  response_tokens INTEGER,
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API do Service

### `geminiFileSearchService`

#### `uploadAndIndexFile(file, category, metadata?)`

Upload e indexação de arquivo.

**Parâmetros:**
- `file: File` - Arquivo para indexar
- `category: FileSearchCategory` - Categoria do store
- `metadata?: Record<string, any>` - Metadata customizada (opcional)

**Retorna:**
```typescript
{
  status: 'completed',
  fileName: string
}
```

#### `searchDocuments(query, categories, filters?)`

Busca semântica em documentos indexados.

**Parâmetros:**
- `query: string` - Pergunta/consulta
- `categories: FileSearchCategory[]` - Categorias para buscar
- `filters?: Record<string, any>` - Filtros de metadata (opcional)

**Retorna:**
```typescript
{
  answer: string,
  citations: Array<{ uri?: string; title?: string }>,
  model: 'gemini-2.0-flash-exp'
}
```

#### `listStores(userId)`

Lista todos os File Search Stores do usuário.

**Retorna:**
```typescript
Array<{
  id: string,
  user_id: string,
  store_name: string,
  store_category: FileSearchCategory,
  display_name: string,
  created_at: string
}>
```

#### `deleteStore(storeName)`

Deleta um File Search Store (do Gemini e do Supabase).

**Parâmetros:**
- `storeName: string` - Nome do store (ex: `fileSearchStores/abc123`)

## Categorias de Stores

Cada usuário pode ter múltiplos stores organizados por categoria:

- **`financial`** - Documentos financeiros (planilhas, relatórios)
- **`documents`** - Documentos gerais
- **`personal`** - Documentos pessoais
- **`business`** - Documentos de negócios
- **`grants`** - Editais e propostas (módulo Grants)

Um usuário tem **no máximo 1 store por categoria**, criado automaticamente no primeiro upload.

## Tipos TypeScript

```typescript
// Categorias disponíveis
type FileSearchCategory = 'financial' | 'documents' | 'personal' | 'business' | 'grants';

// Resultado de busca
interface FileSearchResult {
  answer: string;
  citations?: Array<{
    uri?: string;
    title?: string;
  }>;
  model: string;
}

// Info do File Search Store
interface FileSearchStoreInfo {
  id: string;
  user_id: string;
  store_name: string;
  store_category: FileSearchCategory;
  display_name: string;
  created_at: string;
}
```

## Exemplos de Uso

### Upload de Edital (Módulo Grants)

```typescript
const { uploadDocument } = useFileSearch();

const handleEditalUpload = async (file: File, projectId: string) => {
  await uploadDocument(
    file,
    'grants',
    {
      project_id: projectId,
      document_type: 'edital',
      year: 2024
    }
  );
};
```

### Busca Multi-Categoria

```typescript
const { searchDocuments } = useFileSearch();

const result = await searchDocuments(
  'Quais são os requisitos técnicos e orçamento?',
  ['grants', 'financial'], // buscar em editais E finanças
  { year: 2024 }
);
```

### Listar Documentos Indexados

```typescript
const { data: { user } } = await supabase.auth.getUser();
const stores = await geminiFileSearchService.listStores(user.id);

console.log('Stores do usuário:', stores);
```

## Custos

### O que é GRÁTIS:
- ✅ Armazenamento de arquivos
- ✅ Embeddings no momento da query (busca)
- ✅ Manutenção dos File Search Stores

### O que é PAGO:
- 💰 Embeddings na **indexação inicial** (embedding model cost)
- 💰 Tokens de input/output do modelo Gemini na busca

**Modelo de embedding usado:** `text-embedding-004` (automático)

**Exemplo de custo:**
- Indexar 100 documentos de 10 páginas cada = ~$0.50
- 1000 queries de busca = ~$2.00 (tokens do modelo)

## Limitações

- **Tamanho máximo do arquivo:** Depende do plano Gemini (geralmente 20MB)
- **Formatos suportados:** PDF, TXT, MD, DOCX, HTML, etc
- **Stores por usuário:** Ilimitados (mas recomenda-se 1 por categoria)
- **Timeout de indexação:** 5 minutos

## Troubleshooting

### Erro: "VITE_GEMINI_API_KEY não configurada"

**Solução:**
```env
# Adicione ao .env
VITE_GEMINI_API_KEY=sua_chave_aqui
```

Reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

### Erro: "Timeout: indexação excedeu 5 minutos"

**Causa:** Arquivo muito grande ou API lenta

**Solução:**
1. Divida arquivos grandes em partes menores
2. Tente novamente (pode ser instabilidade temporária da API)

### Citações não aparecem

**Causa:** Nem todas as respostas do Gemini incluem grounding metadata

**Solução:** Normal. Citações aparecem quando o modelo usa trechos específicos dos documentos.

### "Store already exists" error

**Causa:** Tentando criar store que já existe

**Solução:** Use `getOrCreateStore()` que verifica antes de criar.

## Próximos Passos

- [ ] Implementar UI de gerenciamento de stores
- [ ] Dashboard de documentos indexados
- [ ] Analytics de queries mais comuns
- [ ] Cache de respostas frequentes
- [ ] Suporte a OCR para imagens/PDFs escaneados
- [ ] Filtros avançados de metadata
