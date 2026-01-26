# Issue: WhatsApp Disconnect não deleta instância da Evolution API

**Criado em:** 2026-01-26
**Prioridade:** 🔴 Alta
**Labels:** `bug`, `whatsapp`, `evolution-api`, `issue-87-followup`
**Epic:** #122 - Multi-Instance WhatsApp Architecture
**Related:** Issue #87 - WhatsApp Pairing Code

---

## 📋 Resumo

A funcionalidade de **desconectar WhatsApp** (`disconnect-whatsapp` Edge Function) apenas faz logout da instância na Evolution API usando `DELETE /instance/logout/{instanceName}`, mas **não deleta a instância**. Isso causa conflito ao tentar reconectar, pois a instância antiga ainda existe e está em estado inconsistente.

**Comportamento Atual:**
1. Usuário clica "Desconectar"
2. Edge Function chama `logoutInstance()` → Evolution API `/instance/logout`
3. Status no banco muda para `disconnected`
4. Instância permanece na Evolution API (em estado "close" ou "connecting")

**Problema:**
- Ao tentar reconectar (via Pairing Code ou QR Code), não consegue gerar novo código
- Instância antiga interfere com criação de nova instância
- WhatsApp Monitor mostra instância em estado inconsistente

---

## 🐛 Bug Encontrado Durante Testes

### Cenário de Reprodução

**Passos:**
1. WhatsApp conectado e funcionando
2. Clicar em **"Desconectar"** no WhatsApp Analytics
3. Status muda para "Desconectado" ✅
4. Tentar reconectar via **"Gerar código"** (Pairing Code)
5. ❌ **Código de pareamento NÃO é gerado**

**Erro Observado:**
- Geração de pairing code falha
- WhatsApp Monitor mostra instância antiga ainda presente
- Estado inconsistente entre banco de dados (disconnected) e Evolution API (instance existe)

**Workaround Usado:**
- WhatsApp continuou conectado (verificado via WhatsApp Monitor)
- Usuário não conseguiu completar fluxo de reconexão

---

## 🔍 Análise da Causa Raiz

### Arquitetura Atual

**Edge Function:** `disconnect-whatsapp/index.ts`

```typescript
// Linha 134-135
const logoutResult = await logoutInstance(session.instance_name)
// Apenas faz logout, NÃO deleta instância
```

**Evolution API Endpoints:**
- ✅ **`DELETE /instance/logout/{instanceName}`** - Usado atualmente
  - Desloga WhatsApp, mas mantém instância
  - Instância fica em estado "close"

- ❌ **`DELETE /instance/delete/{instanceName}`** - NÃO usado
  - Remove instância completamente
  - Permite criar nova instância sem conflito

### Conflito ao Reconectar

**Sequência atual problemática:**
1. `disconnect-whatsapp` → `logoutInstance()` → Estado: "close"
2. Usuário tenta reconectar
3. `create-user-instance` Edge Function tenta criar nova instância
4. Evolution API: **"Instance already exists"** (conflito)
5. `generate-pairing-code` falha porque instância está em estado inválido

---

## ✅ Solução Proposta

### Opção 1: Deletar Instância ao Desconectar (RECOMENDADA)

**Mudança na Edge Function:**

```typescript
// disconnect-whatsapp/index.ts

// ANTES (linha 134):
await logoutInstance(session.instance_name)

// DEPOIS:
await deleteInstance(session.instance_name)
```

**Função a adicionar em `evolution-client.ts`:**
```typescript
export async function deleteInstance(instanceName: string) {
  const response = await makeRequest(
    'DELETE',
    `/instance/delete/${instanceName}`
  )
  return response as EvolutionApiResponse
}
```

**Prós:**
- ✅ Limpa completamente a instância
- ✅ Permite reconexão imediata sem conflitos
- ✅ Não deixa instâncias "zumbis" na Evolution API
- ✅ Mais simples para o usuário (disconnect = reset completo)

**Contras:**
- ⚠️ Perde histórico de mensagens na Evolution API (se houver)
- ⚠️ Não permite "reconectar" à mesma instância (sempre cria nova)

---

### Opção 2: Reativar Instância Existente ao Reconectar

**Mudança na Edge Function `create-user-instance`:**

```typescript
// Antes de criar nova instância, verificar se já existe
const existingInstance = await getInstanceInfo(instanceName)

if (existingInstance.state === 'close') {
  // Reativar instância existente
  await restartInstance(instanceName)
  return { success: true, instance: existingInstance }
}

// Se não existir, criar nova
await createInstance(instanceName)
```

**Prós:**
- ✅ Mantém histórico de mensagens
- ✅ Reutiliza instância existente

**Contras:**
- ⚠️ Mais complexo (lógica de estado)
- ⚠️ Pode ter bugs de sincronização
- ⚠️ Estado "close" pode não responder a `restart`

---

## 📝 Implementação Recomendada (Opção 1)

### Arquivos a Modificar

**1. `supabase/functions/_shared/evolution-client.ts`**

Adicionar função `deleteInstance()` (já existe, mas não está no export inline):

```typescript
// Linha ~377 (já existe a função)
export async function deleteInstance(instanceName: string) {
  if (!instanceName) {
    throw new Error('Instance name is required')
  }

  const response = await makeRequest(
    'DELETE',
    `/instance/delete/${instanceName}`
  )

  return response as EvolutionApiResponse
}

// Atualizar export default (linha ~534)
export default {
  createInstance,
  generatePairingCode,
  sendMessage,
  sendMedia,
  getInstanceInfo,
  restartInstance,
  logoutInstance,
  deleteInstance, // ✅ Já existe
  fetchAllContacts,
  fetchChatMessages,
  fetchGroupMetadata,
}
```

**2. `supabase/functions/disconnect-whatsapp/index.ts`**

Trocar `logoutInstance` por `deleteInstance`:

```typescript
// Inline version (linhas 10-30)
async function deleteInstance(instanceName: string) {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')

  if (!evolutionUrl || !evolutionKey) {
    throw new Error('Evolution API credentials not configured')
  }

  const response = await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'apikey': evolutionKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Evolution API error: ${response.status}`)
  }

  return response.json()
}

// Uso (linha ~110):
try {
  await deleteInstance(session.instance_name) // MUDANÇA AQUI
  console.log('[disconnect-whatsapp] Instance deleted successfully')
} catch (evolutionError) {
  console.error('[disconnect-whatsapp] Evolution error:', evolutionError)
}
```

**3. Atualizar documentação `CLAUDE.md`**

```markdown
### WhatsApp Disconnect Behavior

**IMPORTANTE:** Desconectar WhatsApp **deleta a instância** da Evolution API.

- ✅ Limpa completamente a conexão
- ✅ Permite reconexão imediata via QR Code ou Pairing Code
- ⚠️ Histórico de mensagens na Evolution API é perdido (banco Aica não é afetado)

Para desconectar sem deletar (não recomendado):
- Use `logoutInstance()` em vez de `deleteInstance()`
```

---

## 🧪 Testes Necessários

Após implementar a correção:

### Test Case 1: Disconnect + Reconnect via Pairing Code

**Passos:**
1. WhatsApp conectado
2. Clicar "Desconectar"
3. Aguardar 5s
4. Gerar Pairing Code
5. Conectar no WhatsApp mobile

**Resultado Esperado:**
- ✅ Código é gerado com sucesso
- ✅ Conexão via código funciona
- ✅ WhatsApp Monitor mostra apenas 1 instância (nova)

---

### Test Case 2: Disconnect + Reconnect via QR Code

**Passos:**
1. WhatsApp conectado
2. Clicar "Desconectar"
3. Aguardar 5s
4. Toggle para "QR Code"
5. Escanear QR Code no celular

**Resultado Esperado:**
- ✅ QR Code é gerado
- ✅ Conexão via QR funciona

---

### Test Case 3: Verificar WhatsApp Monitor

**Passos:**
1. Conectar WhatsApp
2. Anotar `instance_name`
3. Desconectar
4. Verificar WhatsApp Monitor

**Resultado Esperado:**
- ✅ Instância antiga **NÃO aparece mais**
- ✅ Status: "Não encontrada" ou sumiu da lista

---

## 📊 Status de Implementação Issue #87

### ✅ Completo

- [x] Backend: `logoutInstance()` função criada
- [x] Edge Function: `disconnect-whatsapp` implementada
- [x] Frontend: Hook `useWhatsAppConnection.disconnect()` chama Edge Function
- [x] UI: Botão "Desconectar" funcional
- [x] Navegação: Link para WhatsApp Analytics no SettingsMenu
- [x] Documentação: CLAUDE.md atualizado
- [x] SQL: user_credits RLS policies aplicadas

### ⚠️ Incompleto/Com Bug

- [ ] **Disconnect não deleta instância** (este issue)
- [ ] Reconexão via Pairing Code após disconnect (bloqueado pelo bug)
- [ ] Testes E2E completos (parcial - disconnect testado, reconnect falhou)

### 🔄 Dependências

Este bug **bloqueia:**
- Issue #87 completamente funcional
- Fluxo de reconexão após desconectar
- Testes E2E de pairing code

---

## 🎯 Critérios de Aceitação

Para considerar este issue resolvido:

- [ ] Edge Function `disconnect-whatsapp` usa `deleteInstance()` em vez de `logoutInstance()`
- [ ] Usuário consegue desconectar e reconectar via Pairing Code sem erros
- [ ] WhatsApp Monitor não mostra instâncias "zumbis"
- [ ] Testes E2E completos passam (Test Cases 1, 2, 3)
- [ ] Documentação atualizada com comportamento correto

---

## 📚 Referências

**Evolution API Documentation:**
- Logout: https://doc.evolution-api.com/v1/api-reference/instance-controller/logout-instance
- Delete: https://doc.evolution-api.com/v1/api-reference/instance-controller/delete-instance

**Arquivos Relacionados:**
- `supabase/functions/disconnect-whatsapp/index.ts`
- `supabase/functions/_shared/evolution-client.ts`
- `src/modules/connections/hooks/useWhatsAppConnection.ts`
- `docs/implementation/TESTING_CHECKLIST_ISSUE_87.md`

**Issues Relacionadas:**
- #87 - WhatsApp Pairing Code (parent)
- #122 - Multi-Instance WhatsApp Architecture (epic)

---

## 💡 Recomendação

**Implementar Opção 1 (Deletar Instância) ASAP** - É a solução mais simples e robusta. A perda de histórico de mensagens na Evolution API não é crítica, pois:
1. Mensagens importantes já estão no banco Aica
2. Reconexão cria instância limpa sem conflitos
3. Evita estados inconsistentes

**Estimativa:** 30-45 minutos de implementação + 15 minutos de testes

---

**Criado por:** Claude Sonnet 4.5
**Data:** 2026-01-26
**Chat:** Issue #87 Implementation Session

🤖 Generated with [Claude Code](https://claude.com/claude-code)
