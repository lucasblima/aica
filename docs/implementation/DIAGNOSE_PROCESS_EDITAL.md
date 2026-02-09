# Diagnóstico: process-edital Edge Function Error

## Erro Reportado
```json
{
  "action": "process_edital",
  "fileName": "Edital_FAPERJ_Nº_32_2025_–_Programa_Nacional_de_Apoio_à_Inovação_Tecnológica_–_TECNOVA_III.pdf",
  "error": "Edge Function returned a non-2xx status code",
  "latencyMs": 4910
}
```

**Latência**: ~5 segundos (falha antes do timeout de 120s do waitForFileActive)

---

## Causas Prováveis (em ordem de probabilidade)

### 1. GEMINI_API_KEY não configurado ⚠️ **MAIS PROVÁVEL**
**Como verificar:**
```bash
# Supabase Dashboard
# Settings → Edge Functions → Secrets
# Verificar se existe: GEMINI_API_KEY
```

**Como corrigir:**
```bash
# Via CLI (se tiver acesso)
npx supabase secrets set GEMINI_API_KEY=sua_api_key_aqui --project-ref uzywajqzbdbrfammshdg

# Via Dashboard
# Settings → Edge Functions → Secrets → Add secret
# Name: GEMINI_API_KEY
# Value: (sua key do Google AI Studio)
```

**Obter Gemini API Key:**
1. Acesse: https://aistudio.google.com/app/apikey
2. Clique "Create API Key"
3. Copie a key gerada

---

### 2. Quota Gemini Excedida
**Sintomas:**
- Erro 429 (Too Many Requests)
- Erro 403 (Quota exceeded)

**Como verificar:**
```bash
# Google Cloud Console → IAM & Admin → Quotas
# Ou: Google AI Studio → Usage
```

**Como corrigir:**
- Aguardar reset diário da quota
- Ou: Habilitar billing no Google Cloud

---

### 3. CORS Issue
**Sintomas:**
- Erro no console do navegador: "CORS policy blocked"
- Network tab mostra preflight OPTIONS request falhando

**Já corrigido no commit atual:**
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5562559893.southamerica-east1.run.app',  // ✅ Staging
  'https://aica-life-os.web.app',  // ✅ Production
]
```

---

### 4. Authentication Token Inválido
**Sintomas:**
- Status 401
- Erro: "Invalid or expired authentication token"

**Como diagnosticar:**
```typescript
// No frontend, verificar se token está sendo enviado:
const { data: { session } } = await supabase.auth.getSession()
console.log('Auth token:', session?.access_token ? 'Present' : 'Missing')
```

---

## Checklist de Diagnóstico

Execute os passos abaixo em ordem:

### Passo 1: Verificar Secrets (CRÍTICO)
- [ ] Acessar Supabase Dashboard → Project Settings → Edge Functions → Secrets
- [ ] Confirmar que `GEMINI_API_KEY` existe e está preenchido
- [ ] Se ausente, adicionar secret com key do Google AI Studio

### Passo 2: Deploy da Edge Function Corrigida
```bash
# Deploy com fixes de logging
npx supabase functions deploy process-edital --project-ref uzywajqzbdbrfammshdg

# Aguardar ~1 min para deploy completar
```

### Passo 3: Testar Upload Novamente
1. Acessar Aica Staging: https://aica-staging-5562559893.southamerica-east1.run.app/
2. Navegar para Módulo Captação
3. Tentar upload do PDF novamente
4. Abrir DevTools (F12) → Network tab
5. Verificar request para `process-edital`:
   - Status code (200 = sucesso, 500 = erro)
   - Response body (deve conter erro detalhado agora)

### Passo 4: Verificar Logs da Edge Function
```bash
# Via CLI (pode não funcionar localmente)
npx supabase functions logs process-edital --limit 50

# Via Dashboard (RECOMENDADO)
# Supabase Dashboard → Edge Functions → process-edital → Logs
```

**O que procurar nos logs:**
- `[ERROR] GEMINI_API_KEY not configured` → Adicionar secret
- `[ERROR] Google Files API error` → Problema de quota/billing
- `[ERROR] Authentication failed` → Token inválido
- `[ERROR] Failed to parse` → Resposta do Gemini malformada

---

## Melhorias Aplicadas no Commit

### 1. Logs Detalhados
Adicionados logs DEBUG em cada etapa:
```typescript
log('DEBUG', 'File decoded', { sizeBytes: blob.size })
log('DEBUG', 'Sending upload request to Google Files API')
log('INFO', 'File uploaded to Google Files API', { geminiFileName, state: result.file.state })
```

### 2. Validação de API Key
```typescript
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured')
}
```

### 3. Error Handling Melhorado
```typescript
// Antes: erro genérico "Internal server error"
// Depois: erro específico por tipo
if (err.message.includes('GEMINI_API_KEY')) {
  statusCode = 500
  errorMessage = 'Server configuration error: Gemini API key not configured'
}
```

### 4. Response com Detalhes
```typescript
{
  "success": false,
  "error": "User-friendly message",
  "details": "Technical error for debugging"
}
```

---

## Próximos Passos Após Correção

Quando `process-edital` estiver funcionando:

1. **Usar para WhatsApp RAG** (Task #3):
   ```typescript
   // Reutilizar lógica de upload + File Search
   // Adicionar suporte para images (OCR) e audio (Whisper)
   ```

2. **Melhorias Futuras**:
   - Adicionar retry logic (3 tentativas)
   - Implementar queue para processamento assíncrono
   - Cache de editais já processados

---

## Comandos Úteis

```bash
# Deploy Edge Function
npx supabase functions deploy process-edital --project-ref uzywajqzbdbrfammshdg

# Ver logs (via Dashboard é melhor)
# Supabase Dashboard → Edge Functions → process-edital → Logs

# Testar localmente (se configurado)
npx supabase functions serve process-edital

# Verificar status do projeto
npx supabase status --project-ref uzywajqzbdbrfammshdg
```

---

## Contato para Suporte

Se o erro persistir após seguir este guia:
1. Copiar logs completos da Edge Function
2. Copiar Network tab do DevTools (request/response completos)
3. Enviar para análise detalhada
