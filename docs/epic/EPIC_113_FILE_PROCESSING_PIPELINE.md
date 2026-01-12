# Epic #113 - File Processing Pipeline
## Plano de Implementacao Completo

**Data:** 2026-01-12
**Autor:** Master Architect & Planner Agent
**Status:** PLANEJAMENTO

---

## 1. Visao Geral da Arquitetura

```
+-------------------+     +-------------------+     +-------------------+
|    INPUT LAYER    |     |  PROCESSING LAYER |     |   OUTPUT LAYER    |
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| WhatsApp (#118)   |     | process-document  |     | Embeddings (RAG)  |
| Evolution API     +---->+ Edge Function     +---->+ pgvector (#116)   |
|                   |     | Gemini 2.0 Flash  |     |                   |
| Web Upload (#114) |     +--------+----------+     | Semantic Search   |
| Drag & Drop       +---->+        |               +---->+ Query API         |
|                   |     |        v               |     |                   |
+-------------------+     | +------+--------+     | +-------------------+
                          | | Classification |     |                   |
                          | | & Linking      |     | HTML -> PDF       |
                          | | (#115)         |     | Generator (#117)  |
                          | +----------------+     | Puppeteer         |
                          +-------------------+     +-------------------+
```

---

## 2. Sub-Issues e Dependencias

| Issue | Titulo | Dependencias | Prioridade |
|-------|--------|--------------|------------|
| #114 | Upload e extracao de conteudo | - | P0 (Base) |
| #115 | Classificacao automatica | #114 | P1 |
| #116 | Embeddings e busca semantica | #114, #115 | P1 |
| #117 | Gerador de apresentacoes | #116 | P2 |
| #118 | WhatsApp como canal input | #114, #115 | P2 |

### Grafo de Dependencias

```
#114 (Upload/Extracao)
  |
  +---> #115 (Classificacao)
  |       |
  |       +---> #116 (Embeddings/RAG)
  |               |
  |               +---> #117 (HTML->PDF Generator)
  |
  +---> #118 (WhatsApp Input)
```

---

## 3. Sprints Planejados

### Sprint 1: Fundacao (Semana 1-2)
**Foco:** Infraestrutura de upload e extracao de conteudo

#### Issue #114 - Upload e Extracao
**Estimativa:** 5-7 dias
**Complexidade:** Alta

##### Tarefas Backend

- [ ] **DB-1**: Criar tabela `processed_documents`
  - Agente: `backend-architect-supabase`
  - Skill: `/api-integrations`
  - Campos: id, user_id, original_filename, mime_type, storage_path, extracted_text, extraction_method, page_count, metadata, created_at, updated_at
  - RLS: user_id = auth.uid()

- [ ] **DB-2**: Criar tabela `document_chunks`
  - Agente: `backend-architect-supabase`
  - Campos: id, document_id, chunk_index, content, embedding (vector(768)), token_count, created_at

- [ ] **DB-3**: Habilitar extensao pgvector
  - Agente: `backend-architect-supabase`
  - SQL: `CREATE EXTENSION IF NOT EXISTS vector;`

- [ ] **EF-1**: Criar Edge Function `process-document`
  - Agente: `gemini-integration-specialist`
  - Skill: `/ai-integration`
  - Acoes:
    1. Receber arquivo (base64 ou URL Storage)
    2. Detectar tipo (PDF, PPTX, DOCX, imagem)
    3. Extrair texto conforme tipo
    4. Retornar texto estruturado + metadata

##### Implementacao de Extratores

```typescript
// Arquivo: supabase/functions/process-document/extractors.ts

interface ExtractionResult {
  text: string;
  pages: number;
  metadata: Record<string, any>;
  method: 'pdf-parse' | 'pptx' | 'mammoth' | 'gemini-vision';
}

// PDF: pdf-parse (Deno-compatible)
// PPTX: pptx (Deno-compatible)
// DOCX: mammoth (Deno-compatible)
// Images: Gemini Vision API
```

##### Tarefas Frontend

- [ ] **FE-1**: Criar componente `DocumentUploader`
  - Agente: `ux-design-guardian`
  - Skill: `/component-patterns`
  - Features: Drag & drop, progress bar, preview thumbnail

- [ ] **FE-2**: Criar hook `useDocumentUpload`
  - Skill: `/aica-development`
  - Features: Upload para Supabase Storage, trigger Edge Function

- [ ] **FE-3**: Criar componente `DocumentPreview`
  - Skill: `/component-patterns`
  - Features: Visualizar PDF inline, preview de imagens

##### Tarefas de Teste

- [ ] **TEST-1**: E2E teste upload PDF
  - Agente: `testing-qa-playwright`
  - Cenarios: Upload sucesso, arquivo invalido, arquivo grande

---

### Sprint 2: Inteligencia (Semana 3-4)
**Foco:** Classificacao automatica e embeddings

#### Issue #115 - Classificacao Automatica
**Estimativa:** 3-4 dias
**Complexidade:** Media

##### Tarefas

- [ ] **AI-1**: Criar prompt de classificacao
  - Agente: `gemini-integration-specialist`
  - Skill: `/ai-integration`
  - Categorias: `financial`, `legal`, `personal`, `business`, `podcast`, `grants`

```typescript
const CLASSIFICATION_PROMPT = `
Analise o seguinte documento e classifique-o:

TEXTO DO DOCUMENTO:
{document_text}

CATEGORIAS DISPONIVEIS:
- financial: Extratos bancarios, faturas, notas fiscais
- legal: Contratos, termos, procuracoes
- personal: Documentos pessoais, curriculos
- business: Propostas, relatorios, apresentacoes
- podcast: Roteiros, pautas, transcricoes
- grants: Editais, projetos de financiamento

RESPONDA EM JSON:
{
  "primary_category": "categoria principal",
  "secondary_categories": ["outras categorias relevantes"],
  "confidence": 0.0-1.0,
  "suggested_tags": ["tag1", "tag2"],
  "entities_detected": {
    "dates": [],
    "amounts": [],
    "names": [],
    "organizations": []
  },
  "summary": "Resumo em 2-3 frases"
}
`;
```

- [ ] **DB-4**: Adicionar colunas de classificacao em `processed_documents`
  - Agente: `backend-architect-supabase`
  - Campos: primary_category, secondary_categories (array), confidence_score, suggested_tags, entities_json, ai_summary

- [ ] **AI-2**: Implementar vinculacao automatica
  - Skill: `/ai-integration`
  - Logica: Se categoria = 'podcast' e detectar nome de episodio -> vincular a podcast_episodes
  - Logica: Se categoria = 'financial' e detectar valores -> vincular a finance module

#### Issue #116 - Embeddings e RAG
**Estimativa:** 4-5 dias
**Complexidade:** Alta

##### Tarefas

- [ ] **AI-3**: Implementar chunking inteligente
  - Agente: `gemini-integration-specialist`
  - Estrategia: Chunks de ~500 tokens com overlap de 50 tokens
  - Preservar contexto de paragrafos/secoes

```typescript
// Arquivo: supabase/functions/process-document/chunker.ts

interface ChunkConfig {
  maxTokens: number;       // 500
  overlapTokens: number;   // 50
  preserveParagraphs: boolean;
  includeMetadata: boolean;
}

function chunkDocument(text: string, config: ChunkConfig): DocumentChunk[] {
  // Implementar chunking semantico
}
```

- [ ] **AI-4**: Gerar embeddings com text-embedding-004
  - Agente: `gemini-integration-specialist`
  - Modelo: `text-embedding-004` (768 dimensoes)
  - Batch processing para eficiencia

- [ ] **DB-5**: Criar indice HNSW para busca vetorial
  - Agente: `backend-architect-supabase`
  - SQL:
  ```sql
  CREATE INDEX idx_document_chunks_embedding
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);
  ```

- [ ] **DB-6**: Criar funcao de busca semantica
  - Agente: `backend-architect-supabase`
  - SQL:
  ```sql
  CREATE OR REPLACE FUNCTION search_documents(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    p_user_id uuid DEFAULT auth.uid()
  ) RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    content text,
    similarity float
  ) LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    RETURN QUERY
    SELECT
      dc.id as chunk_id,
      dc.document_id,
      dc.content,
      1 - (dc.embedding <=> query_embedding) as similarity
    FROM document_chunks dc
    JOIN processed_documents pd ON dc.document_id = pd.id
    WHERE pd.user_id = p_user_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;
  ```

- [ ] **FE-4**: Criar componente `SemanticSearch`
  - Skill: `/component-patterns`
  - Features: Input de busca, resultados com highlighting, filtros por categoria

- [ ] **FE-5**: Criar hook `useSemanticSearch`
  - Skill: `/aica-development`
  - Features: Debounce, cache de resultados, paginacao

---

### Sprint 3: Canais e Output (Semana 5-6)
**Foco:** WhatsApp input e geracao de apresentacoes

#### Issue #118 - WhatsApp como Canal de Input
**Estimativa:** 3-4 dias
**Complexidade:** Media

##### Tarefas

- [ ] **WA-1**: Estender webhook Evolution para documentos
  - Skill: `/api-integrations`
  - Arquivo: `supabase/functions/webhook-evolution/index.ts`
  - Adicionar handler para `documentMessage`

```typescript
// Adicionar em webhook-evolution/index.ts

async function handleDocumentMessage(
  supabase: SupabaseClient,
  userId: string,
  messageData: MessageData
): Promise<void> {
  const docInfo = messageData.message?.documentMessage;
  if (!docInfo) return;

  // 1. Baixar documento do Evolution API
  const documentUrl = docInfo.url;
  const filename = docInfo.fileName || 'document.pdf';
  const mimetype = docInfo.mimetype;

  // 2. Salvar no Supabase Storage
  const storagePath = `${userId}/whatsapp/${Date.now()}_${filename}`;

  // 3. Trigger process-document Edge Function
  await supabase.functions.invoke('process-document', {
    body: { storagePath, userId, source: 'whatsapp' }
  });

  // 4. Enviar confirmacao via WhatsApp
  await sendWhatsAppMessage(
    instanceName,
    messageData.key.remoteJid,
    `Documento "${filename}" recebido e processado!`
  );
}
```

- [ ] **WA-2**: Criar mensagens de feedback
  - Skill: `/ai-integration`
  - Mensagens: Confirmacao de recebimento, status de processamento, resumo do documento

- [ ] **TEST-2**: E2E teste fluxo WhatsApp -> documento
  - Agente: `testing-qa-playwright`

#### Issue #117 - Gerador de Apresentacoes HTML -> PDF
**Estimativa:** 5-6 dias
**Complexidade:** Alta

##### Tarefas

- [ ] **GEN-1**: Criar templates HTML para apresentacoes
  - Skill: `/component-patterns`
  - Templates: Pitch Deck, Relatorio, Proposta Comercial

```typescript
// Arquivo: src/modules/presentations/templates/index.ts

export const PRESENTATION_TEMPLATES = {
  pitch_deck: {
    name: 'Pitch Deck',
    slides: ['cover', 'problem', 'solution', 'market', 'business_model', 'team', 'financials', 'ask'],
    defaultColors: { primary: '#1a365d', accent: '#3182ce' }
  },
  report: {
    name: 'Relatorio',
    slides: ['cover', 'executive_summary', 'findings', 'analysis', 'recommendations', 'next_steps'],
    defaultColors: { primary: '#234e52', accent: '#38a169' }
  },
  proposal: {
    name: 'Proposta Comercial',
    slides: ['cover', 'about_us', 'understanding', 'solution', 'timeline', 'pricing', 'terms'],
    defaultColors: { primary: '#44337a', accent: '#805ad5' }
  }
};
```

- [ ] **GEN-2**: Criar componente `PresentationBuilder`
  - Agente: `ux-design-guardian`
  - Skill: `/component-patterns`
  - Features: Editor WYSIWYG, preview em tempo real, selecao de template

- [ ] **GEN-3**: Implementar RAG para contexto de slides
  - Agente: `gemini-integration-specialist`
  - Skill: `/ai-integration`
  - Logica: Buscar documentos relevantes, injetar contexto no prompt de geracao

```typescript
// Arquivo: src/modules/presentations/services/ragContextService.ts

export async function getSlideContext(
  slideType: string,
  userPrompt: string,
  userId: string
): Promise<string> {
  // 1. Gerar embedding do prompt
  const queryEmbedding = await generateEmbedding(userPrompt);

  // 2. Buscar chunks relevantes
  const relevantChunks = await supabase.rpc('search_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5,
    p_user_id: userId
  });

  // 3. Montar contexto
  return relevantChunks.map(c => c.content).join('\n\n---\n\n');
}
```

- [ ] **GEN-4**: Implementar export PDF com Puppeteer
  - Skill: `/cloud-run-deployment`
  - Opcao A: Edge Function com Puppeteer (limitado)
  - Opcao B: Cloud Run service dedicado (recomendado)

```typescript
// Arquivo: services/pdf-generator/index.ts (Cloud Run)

import puppeteer from 'puppeteer';

export async function generatePDF(htmlContent: string, options: PDFOptions): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
  });

  await browser.close();
  return pdf;
}
```

- [ ] **TEST-3**: E2E teste geracao de PDF
  - Agente: `testing-qa-playwright`
  - Cenarios: Geracao simples, com RAG context, download

---

## 4. Mapeamento de Agentes por Tarefa

| Tarefa | Agente Principal | Agentes de Suporte |
|--------|------------------|-------------------|
| DB-1 a DB-6 | `backend-architect-supabase` | `security-privacy-auditor` |
| EF-1, AI-1 a AI-4 | `gemini-integration-specialist` | - |
| FE-1 a FE-5 | `ux-design-guardian` | - |
| WA-1, WA-2 | `gemini-integration-specialist` | `backend-architect-supabase` |
| GEN-1 a GEN-4 | `ux-design-guardian` | `gemini-integration-specialist` |
| TEST-1 a TEST-3 | `testing-qa-playwright` | - |

---

## 5. Mapeamento de Skills por Tipo de Trabalho

| Tipo de Trabalho | Skill Principal | Uso |
|------------------|-----------------|-----|
| Criar tabelas/migrations | `/api-integrations` | Supabase schema |
| Implementar AI features | `/ai-integration` | Gemini, embeddings |
| Criar componentes React | `/component-patterns` | UI patterns |
| Desenvolver features Aica | `/aica-development` | Hooks, services |
| Deploy Cloud Run | `/cloud-run-deployment` | PDF service |
| Documentacao | `/documentation-standards` | READMEs, guides |

---

## 6. Estrategia de Branches

### Naming Convention
```
feature/epic-113-{sub-issue}-{descricao-curta}
```

### Branches Planejadas

| Branch | Issue | Merge Target |
|--------|-------|--------------|
| `feature/epic-113-114-document-upload` | #114 | main |
| `feature/epic-113-115-classification` | #115 | main |
| `feature/epic-113-116-embeddings-rag` | #116 | main |
| `feature/epic-113-117-pdf-generator` | #117 | main |
| `feature/epic-113-118-whatsapp-input` | #118 | main |

### Estrategia de Merge

1. **Sprint 1:** #114 merge direto para main (feature flag: `ENABLE_DOCUMENT_PROCESSING`)
2. **Sprint 2:** #115 e #116 podem ser desenvolvidas em paralelo, merge sequencial
3. **Sprint 3:** #117 e #118 independentes, podem mergear em qualquer ordem

---

## 7. Distribuicao de Contexto por Sessao

### Sessao Tipo A: Backend/Database (150K tokens estimados)
**Arquivos a carregar:**
- CLAUDE.md (~4K)
- backend-architect-supabase.md (~2K)
- Migrations existentes (~5K)
- Types relevantes (~3K)

**Tarefas ideais:** DB-1 a DB-6

### Sessao Tipo B: AI/Gemini (200K tokens estimados)
**Arquivos a carregar:**
- CLAUDE.md (~4K)
- gemini-integration-specialist.md (~2K)
- ai-integration SKILL.md (~10K)
- Edge Functions existentes (~15K)

**Tarefas ideais:** EF-1, AI-1 a AI-4

### Sessao Tipo C: Frontend/UI (180K tokens estimados)
**Arquivos a carregar:**
- CLAUDE.md (~4K)
- component-patterns SKILL.md (~5K)
- Componentes existentes similares (~10K)

**Tarefas ideais:** FE-1 a FE-5, GEN-1 a GEN-3

### Sessao Tipo D: Integracao/WhatsApp (120K tokens estimados)
**Arquivos a carregar:**
- CLAUDE.md (~4K)
- webhook-evolution/index.ts (~10K)
- whatsappService.ts (~8K)

**Tarefas ideais:** WA-1, WA-2

### Recomendacoes de Uso de Contexto

1. **Evitar carregar tudo de uma vez** - Dividir por dominio
2. **Reutilizar sessoes** - Manter sessao aberta para tarefas relacionadas
3. **Usar `--resume`** - Retomar sessoes anteriores quando possivel
4. **Documentar decisoes inline** - Reduz necessidade de recarregar contexto

---

## 8. Riscos e Mitigacoes

### Risco 1: Performance de Busca Vetorial
**Probabilidade:** Media
**Impacto:** Alto
**Mitigacao:**
- Usar indice HNSW em vez de IVFFlat
- Limitar busca a documentos do usuario (RLS)
- Cache de queries frequentes
- Monitorar tempo de resposta e ajustar `match_threshold`

### Risco 2: Custo de API Gemini
**Probabilidade:** Alta
**Impacto:** Medio
**Mitigacao:**
- Usar `gemini-2.0-flash` para classificacao (mais barato)
- Batch processing de embeddings
- Cache de embeddings (documentos nao mudam)
- Implementar rate limiting no frontend

### Risco 3: Limites de Tamanho de Arquivo
**Probabilidade:** Media
**Impacto:** Medio
**Mitigacao:**
- Limite de 10MB por arquivo no upload
- Chunking progressivo para arquivos grandes
- Feedback visual de progresso
- Opcao de processamento assincrono

### Risco 4: Puppeteer em Cloud Run
**Probabilidade:** Alta
**Impacto:** Medio
**Mitigacao:**
- Usar imagem Docker com Chrome pre-instalado
- Configurar memory adequada (min 1GB)
- Timeout generoso (60s)
- Fallback para servico externo se necessario

### Risco 5: Integracao WhatsApp/Media
**Probabilidade:** Baixa
**Impacto:** Alto
**Mitigacao:**
- Testar download de documentos antes de processar
- Retry logic para downloads falhos
- Validacao de mimetype antes de processar
- Mensagem de erro amigavel para usuario

---

## 9. Metricas de Sucesso

| Metrica | Target | Medicao |
|---------|--------|---------|
| Tempo de upload + processamento | < 30s para PDF 10 paginas | Logs Edge Function |
| Acuracia de classificacao | > 90% | Feedback do usuario |
| Relevancia de busca semantica | > 80% resultados uteis | Feedback do usuario |
| Tempo de geracao PDF | < 15s | Logs Cloud Run |
| Taxa de sucesso WhatsApp | > 95% | Webhook logs |

---

## 10. Checklist de Conclusao por Issue

### Issue #114
- [ ] Tabela `processed_documents` criada com RLS
- [ ] Tabela `document_chunks` criada com RLS
- [ ] Edge Function `process-document` deployada
- [ ] Extratores PDF, PPTX, DOCX, Imagem funcionando
- [ ] Componente `DocumentUploader` criado
- [ ] Componente `DocumentPreview` criado
- [ ] E2E tests passando

### Issue #115
- [ ] Prompt de classificacao validado
- [ ] Colunas de classificacao adicionadas
- [ ] Vinculacao automatica implementada
- [ ] UI de revisao de classificacao criada

### Issue #116
- [ ] pgvector habilitado
- [ ] Chunking inteligente implementado
- [ ] Embeddings sendo gerados
- [ ] Indice HNSW criado
- [ ] Funcao `search_documents` funcionando
- [ ] Componente `SemanticSearch` criado
- [ ] E2E tests passando

### Issue #117
- [ ] Templates HTML criados
- [ ] Componente `PresentationBuilder` criado
- [ ] RAG context service funcionando
- [ ] PDF generator Cloud Run deployado
- [ ] E2E tests passando

### Issue #118
- [ ] Webhook estendido para documentos
- [ ] Mensagens de feedback configuradas
- [ ] E2E tests passando

---

## 11. Proximos Passos Imediatos

1. **Criar branch `feature/epic-113-114-document-upload`**
2. **Iniciar sessao Tipo A** - Criar migrations DB-1, DB-2, DB-3
3. **Apos migrations:** Iniciar sessao Tipo B - Criar Edge Function EF-1
4. **Apos Edge Function:** Iniciar sessao Tipo C - Criar componentes FE-1, FE-2, FE-3
5. **Ao final Sprint 1:** PR para main com feature flag

---

**Documento criado por:** Master Architect & Planner Agent
**Data de criacao:** 2026-01-12
**Ultima atualizacao:** 2026-01-12
