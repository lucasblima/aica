# Como Diagnosticar o Erro do process-edital

## Erro Atual
```
Edge Function returned a non-2xx status code
```

Este é um erro genérico. Precisamos obter detalhes específicos.

---

## Passo 1: Deploy da Edge Function de Diagnóstico

```bash
npx supabase functions deploy test-process-edital --project-ref uzywajqzbdbrfammshdg
```

Aguarde ~1 minuto para o deploy completar.

---

## Passo 2: Testar a Edge Function de Diagnóstico

### Via Browser (Mais Fácil)

Abra o console do DevTools (F12) e execute:

```javascript
// Substitua pelo seu token de autenticação
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

if (!token) {
  console.error('❌ Não autenticado')
} else {
  const response = await fetch(
    'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/test-process-edital',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const result = await response.json()
  console.log('📊 Diagnóstico:', result)
}
```

### Via cURL (Alternativa)

```bash
# Obtenha seu token primeiro
# Dashboard Supabase → Settings → API → Service Role (secret)

curl -X POST \
  https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/test-process-edital \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json"
```

---

## Passo 3: Analisar o Resultado

### ✅ Resultado Esperado (Tudo OK)

```json
{
  "timestamp": "2026-01-27T...",
  "environment": {
    "SUPABASE_URL": "✅ Set",
    "SUPABASE_SERVICE_ROLE_KEY": "✅ Set",
    "GEMINI_API_KEY": "✅ Set"
  },
  "headers": {
    "authorization": "✅ Present",
    "origin": "https://aica-staging-5p22u2w6jq-rj.a.run.app"
  },
  "apiKeyValidation": {
    "geminiKeyExists": true,
    "geminiKeyLength": 39,
    "geminiKeyPrefix": "AIzaSy"
  },
  "geminiApiTest": {
    "status": 200,
    "statusText": "OK",
    "reachable": "✅ Yes"
  }
}
```

Se você vir isso ✅ = **API key está configurada corretamente!**

---

### ❌ Resultado com Problema (API Key Faltando)

```json
{
  "environment": {
    "SUPABASE_URL": "✅ Set",
    "SUPABASE_SERVICE_ROLE_KEY": "✅ Set",
    "GEMINI_API_KEY": "❌ Missing"  // ❌ PROBLEMA AQUI
  },
  "apiKeyValidation": {
    "geminiKeyExists": false,
    "geminiKeyLength": 0
  },
  "geminiApiTest": {
    "skipped": "GEMINI_API_KEY not configured"
  }
}
```

**Solução:**
1. Acesse: https://aistudio.google.com/app/apikey
2. Crie uma API key
3. Dashboard Supabase → Settings → Edge Functions → Secrets
4. Add secret: `GEMINI_API_KEY` = (sua key)

---

### ❌ API Key Inválida/Expirada

```json
{
  "geminiApiTest": {
    "status": 403,
    "reachable": "❌ No",
    "error": "API key not valid..."
  }
}
```

**Solução:**
- Gere uma nova API key em https://aistudio.google.com/app/apikey
- Substitua a antiga no Supabase Dashboard

---

### ❌ Quota Excedida

```json
{
  "geminiApiTest": {
    "status": 429,
    "error": "Quota exceeded for quota metric..."
  }
}
```

**Solução:**
- Aguarde reset diário da quota (meia-noite PST)
- Ou: Habilite billing no Google Cloud

---

## Passo 4: Copiar e Enviar Resultado

Depois de executar o teste:

1. Copie **TODO o JSON** retornado
2. Cole aqui no chat
3. Eu vou analisar e dizer exatamente qual é o problema

---

## Passo 5: Testar process-edital Original

**SOMENTE depois que test-process-edital mostrar ✅ tudo OK**

```javascript
// No console do navegador
const { data: { session } } = await supabase.auth.getSession()

// Ler PDF como base64 (exemplo simples)
const fileInput = document.createElement('input')
fileInput.type = 'file'
fileInput.accept = 'application/pdf'
fileInput.onchange = async (e) => {
  const file = e.target.files[0]
  const reader = new FileReader()
  reader.onload = async (event) => {
    const base64 = event.target.result.split(',')[1]

    const response = await fetch(
      'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/process-edital',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_data: base64,
          file_name: file.name,
          file_size: file.size
        })
      }
    )

    const result = await response.json()
    console.log('📄 Resultado:', result)
  }
  reader.readAsDataURL(file)
}
fileInput.click()
```

---

## Troubleshooting Comum

### "CORS error"
**Problema:** Origin não permitido

**Solução:** Já corrigido no código. Aguarde build (~4 min após push).

### "Authorization header required"
**Problema:** Token não sendo enviado

**Solução:**
```javascript
// Verificar se está autenticado
const { data: { session } } = await supabase.auth.getSession()
console.log('Token:', session?.access_token ? 'OK' : 'Missing')
```

### "Method not allowed"
**Problema:** Usando GET ao invés de POST

**Solução:** Use `method: 'POST'` no fetch.

---

## Comandos Úteis

```bash
# Ver logs em tempo real (pode não funcionar localmente)
npx supabase functions logs test-process-edital --tail

# Deploy novamente se fizer alterações
npx supabase functions deploy test-process-edital --project-ref uzywajqzbdbrfammshdg

# Verificar secrets (lista nomes, não valores)
# Via Dashboard: Settings → Edge Functions → Secrets
```

---

## Próximo Passo

**Rode o test-process-edital e me envie o resultado completo.**

Baseado no output, vou:
1. Identificar exatamente qual secret está faltando
2. Corrigir o problema específico
3. Validar que process-edital funciona
4. Liberar implementação do WhatsApp RAG
