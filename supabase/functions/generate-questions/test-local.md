# Teste Local: generate-questions Edge Function

Este guia explica como testar a Edge Function `generate-questions` localmente antes do deploy.

---

## Pré-requisitos

1. **Deno instalado:**
   ```bash
   # Windows (via Scoop)
   scoop install deno

   # macOS/Linux (via curl)
   curl -fsSL https://deno.land/x/install/install.sh | sh
   ```

2. **Supabase CLI configurado:**
   ```bash
   npx supabase start  # Inicia Supabase local
   ```

3. **Secrets configurados:**
   ```bash
   # Criar arquivo .env.local em supabase/functions/generate-questions/
   SUPABASE_URL=http://localhost:54321
   SUPABASE_SERVICE_ROLE_KEY=<service_role_key_from_supabase_start>
   GEMINI_API_KEY=<your_gemini_api_key>
   ```

---

## Teste 1: Validação de Schema

Verifica se as tabelas necessárias existem.

```bash
# Rodar diagnostic SQL
npx supabase db execute -f supabase/migrations/DIAGNOSTIC_GENERATE_QUESTIONS_TABLES.sql --local
```

**Esperado:**
```
✅ user_question_context_bank EXISTS
✅ daily_questions EXISTS
✅ question_responses EXISTS
✅ check_should_generate_questions FUNCTION EXISTS
✅ increment_generation_count FUNCTION EXISTS
```

---

## Teste 2: Servir Edge Function Localmente

```bash
# Terminal 1: Servir a função
npx supabase functions serve generate-questions --env-file supabase/functions/generate-questions/.env.local

# Aguardar:
# Serving functions on http://localhost:54321/functions/v1
```

---

## Teste 3: Chamar a Edge Function

### 3A. Sem autenticação (deve falhar com 401)

```bash
curl -i -X POST http://localhost:54321/functions/v1/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 3,
    "force_regenerate": true
  }'
```

**Esperado:**
```json
HTTP/1.1 401 Unauthorized
{
  "success": false,
  "error": "Authorization required"
}
```

### 3B. Com token válido (deve gerar perguntas)

```bash
# 1. Obter token de um usuário autenticado
# Via Supabase Dashboard → Authentication → Users → copiar Access Token

# 2. Chamar com token
curl -i -X POST http://localhost:54321/functions/v1/generate-questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -d '{
    "batch_size": 3,
    "force_regenerate": true,
    "categories": ["reflection", "gratitude"]
  }'
```

**Esperado:**
```json
HTTP/1.1 200 OK
{
  "success": true,
  "questions_generated": 3,
  "questions": [
    {
      "question_text": "Qual momento hoje te fez sentir mais presente?",
      "category": "reflection",
      "relevance_score": 0.75,
      "context_factors": ["presence", "mindfulness"]
    },
    ...
  ],
  "context_updated": true,
  "inferred_context": {
    "emotions": ["curiosidade", "reflexão"],
    "themes": ["autoconhecimento", "crescimento pessoal"]
  },
  "processing_time_ms": 2341
}
```

### 3C. Teste de CORS preflight

```bash
curl -i -X OPTIONS http://localhost:54321/functions/v1/generate-questions \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

**Esperado:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

---

## Teste 4: Validar Análise de Contexto

### 4A. Usuário novo (sem respostas)

**Esperado no response:**
```json
"inferred_context": {
  "emotions": ["curiosidade", "reflexão"],
  "themes": ["autoconhecimento", "crescimento pessoal"]
}
```

### 4B. Usuário com respostas (contexto inferido)

```bash
# 1. Inserir respostas de teste
npx supabase db execute --local <<SQL
INSERT INTO question_responses (user_id, question_id, response_text)
VALUES
  ('user-uuid', 'question-uuid-1', 'Hoje me senti muito feliz e grato por estar com minha família'),
  ('user-uuid', 'question-uuid-2', 'O trabalho está corrido mas aprendi muito sobre liderança');
SQL

# 2. Gerar perguntas novamente
curl -i -X POST http://localhost:54321/functions/v1/generate-questions \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -d '{"batch_size": 3, "force_regenerate": true}'
```

**Esperado no response:**
```json
"inferred_context": {
  "emotions": ["feliz", "grato"],
  "themes": ["trabalho", "crescimento"]
}
```

**Validar no prompt Gemini:**
- Logs devem mostrar: `"Dominant emotions: feliz, grato (inferido das respostas)"`
- Perguntas geradas devem ser relevantes para trabalho/crescimento

---

## Teste 5: Validar Armazenamento no Context Bank

```bash
# Após gerar perguntas, verificar se context bank foi atualizado
npx supabase db execute --local <<SQL
SELECT
  user_id,
  dominant_emotions,
  recurring_themes,
  generation_count,
  last_generation_at
FROM user_question_context_bank
WHERE user_id = 'user-uuid';
SQL
```

**Esperado:**
```
dominant_emotions: {feliz,grato}
recurring_themes: {trabalho,crescimento}
generation_count: 1
last_generation_at: 2026-01-29T...
```

---

## Teste 6: Validar Rate Limiting

```bash
# 1. Gerar perguntas pela primeira vez
curl -X POST http://localhost:54321/functions/v1/generate-questions \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"force_regenerate": true}'

# 2. Tentar gerar novamente imediatamente (sem force_regenerate)
curl -X POST http://localhost:54321/functions/v1/generate-questions \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{}'
```

**Esperado na 2ª chamada:**
```json
{
  "success": true,
  "questions_generated": 0,
  "message": "Generation not needed yet",
  "status": {
    "unanswered_count": 5,
    "hours_since_last": 0.001,
    "daily_count": 1
  }
}
```

---

## Troubleshooting

### Erro: "GEMINI_API_KEY not configured"

**Causa:** `.env.local` não criado ou key inválida

**Fix:**
```bash
# Criar arquivo
echo "GEMINI_API_KEY=AIza..." > supabase/functions/generate-questions/.env.local
```

### Erro: "Failed to parse generated questions"

**Causa:** Gemini retornou resposta fora do formato JSON esperado

**Debug:**
```bash
# Ver logs da Edge Function
# Os logs mostrarão o texto exato retornado pelo Gemini
```

**Fix:** Ajustar parsing de JSON (linhas 399-410 do index.ts)

### Erro: "error TS2304: Cannot find name 'btoa'"

**Causa:** Deno não tem `btoa` nativo (é Web API)

**Fix:** Adicionar import no index.ts:
```typescript
// No topo do arquivo
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

// Substituir (linha 619):
const promptHash = btoa(prompt.substring(0, 100)).substring(0, 32)
// Por:
const promptHash = base64Encode(prompt.substring(0, 100)).substring(0, 32)
```

### Erro: "relation user_question_context_bank does not exist"

**Causa:** Migration não aplicada

**Fix:**
```bash
npx supabase migration up --local
```

---

## Métricas de Performance

| Métrica | Target | Como medir |
|---------|--------|------------|
| Response time | < 3s | `processing_time_ms` no response |
| Gemini latency | < 2s | Logs: tempo entre "Calling Gemini" e "Successfully parsed" |
| Questions generated | 5 | `questions_generated` no response |
| Context inference | 100% | `inferred_context.emotions.length > 0` |
| Uniqueness | 90%+ | Comparar `generated` vs `stored` (filter uniqueness) |

---

## Deploy para Staging

Após validação local:

```bash
# Commit e push (deploy automático)
git add supabase/functions/generate-questions/index.ts
git add supabase/migrations/20260129000001_add_increment_generation_count.sql
git commit -m "fix(journey): Resolve 'not yet identified' emotion context in generate-questions Edge Function"
git push origin main

# Aguardar build (~4 min)
gcloud builds list --limit=5 --region=southamerica-east1

# Verificar logs em produção
npx supabase functions logs generate-questions --project-ref uzywajqzbdbrfammshdg --tail
```

---

## Referências

**Arquivos:**
- `supabase/functions/generate-questions/index.ts` - Edge Function corrigida
- `supabase/migrations/20260129000001_add_increment_generation_count.sql` - RPC function
- `docs/implementation/FIX_GENERATE_QUESTIONS_EDGE_FUNCTION.md` - Documentação completa

**Issues:**
- #162 - Generate Questions Edge Function fixes
