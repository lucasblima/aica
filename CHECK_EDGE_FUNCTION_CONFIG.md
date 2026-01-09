# ✅ Checklist: Configuração da Edge Function

## 🎯 Possível Causa do 401:

O erro 401 **ANTES** da função executar pode ser causado por:
1. ❌ Secrets não configurados
2. ❌ Função não foi "redeployada" após adicionar secrets
3. ❌ JWT verification configurada incorretamente
4. ❌ CORS não configurado corretamente

---

## 📋 Verificações no Supabase Dashboard

### 1. Verificar se Secrets Existem (30 segundos)

**Acesse:**
🔗 https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/settings/vault/secrets

**Deve haver EXATAMENTE estes 3 secrets:**
- ✅ `EVOLUTION_API_URL` = `https://evolution-evolution-api.w9jo16.easypanel.host`
- ✅ `EVOLUTION_INSTANCE_NAME` = `AI_Comtxae_4006`
- ✅ `EVOLUTION_API_KEY` = `9BE943A8B11D-4260-9EFC-7B1F26B51BAB`

**Se não existirem:**
1. Clique "New secret"
2. Adicione cada um
3. **IMPORTANTE:** Após adicionar, você DEVE fazer redeploy da função!

---

### 2. Verificar Função Deployada (15 segundos)

**Acesse:**
🔗 https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions

**Verificar:**
- ✅ Função `sync-whatsapp-contacts` aparece na lista?
- ✅ Status está **"Active"** (verde)?
- ✅ Última deploy foi **APÓS** configurar os secrets?

**Se a última deploy foi ANTES dos secrets:**
1. Clique na função `sync-whatsapp-contacts`
2. Clique no botão **"Redeploy"**
3. Aguarde finalizar (~30 segundos)
4. Teste novamente

---

### 3. Verificar Logs da Função (diagnóstico)

**Acesse:**
🔗 https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions/sync-whatsapp-contacts/logs

**O que você vê:**
- ❌ Apenas "boot" e "shutdown" → Requisição NÃO está chegando (problema de auth)
- ✅ Logs de execução → Requisição chegou (problema está dentro da função)

**Se vê apenas boot/shutdown:**
- Problema é autenticação JWT (401 antes de executar)
- Continue para próxima verificação

---

### 4. Testar Função Sem Autenticação (diagnóstico avançado)

**APENAS PARA TESTE - Vamos confirmar se é problema de JWT:**

Temporariamente, vamos testar se a função em si funciona:

**Acesse a aba "Invocations" da função:**
🔗 https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions/sync-whatsapp-contacts/invocations

**Clique "Invoke" e cole:**
```json
{}
```

**Resultado esperado:**
- ❌ Se der erro de JWT/Auth → Confirma que é problema de autenticação
- ✅ Se executar (mesmo que dê outro erro) → Função está OK, problema é no frontend

---

## 🔧 Soluções Baseadas no Diagnóstico

### Se Secrets Não Existem:
1. Adicione os 3 secrets
2. **REDEPLOY** a função
3. Teste novamente

### Se Função Precisa Redeploy:
1. Na página da função, clique "Redeploy"
2. Aguarde terminar
3. Teste novamente

### Se JWT Está Falhando:
Pode ser que a Edge Function esteja esperando um formato específico de JWT.

**Verifique no código da função (`index.ts` linha 52-76):**
```typescript
// Get user from auth token
const token = authHeader.replace('Bearer ', '')
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser(token)
```

Se esta linha estiver falhando, significa que:
1. Token não é válido para este projeto Supabase
2. Token está expirado
3. Formato do token está incorreto

---

## 📊 Checklist Final

Execute NA ORDEM:

- [ ] 1. Verificar se 3 secrets existem
- [ ] 2. Se sim, verificar data da última deploy
- [ ] 3. Se deploy foi antes dos secrets, fazer REDEPLOY
- [ ] 4. Aguardar 30 segundos
- [ ] 5. Limpar cookies do browser (F12 → Application → Clear site data)
- [ ] 6. Fazer login novamente
- [ ] 7. Testar sincronização WhatsApp
- [ ] 8. Se ainda falhar, me enviar:
  - Screenshot dos secrets
  - Screenshot do status da função
  - Network tab mostrando o erro

---

**Execute este checklist e me diga em qual passo você está!** ✅
