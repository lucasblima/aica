# 🔴 Problema com Access Token - Soluções Alternativas

## ❌ Erro Encontrado

```
Invalid access token format. Must be like `sbp_0102...1920`.
```

**Token usado:** `sbp_55d19244a34f14cd4d3a88baf86ac62392265d42`

## 🔍 Possíveis Causas

1. **Token sem permissões suficientes**
   - Token pode não ter permissão para fazer deploy de Edge Functions

2. **Token expirado ou inválido**
   - Token pode ter sido revogado

3. **Formato do token**
   - O CLI espera um formato específico de token

---

## ✅ SOLUÇÃO 1: Gerar Novo Token com Permissões Corretas

### Passo 1: Revogar Token Antigo

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Encontre o token gerado
3. Clique em "Revoke" (se aparecer)

### Passo 2: Gerar Novo Token

1. Clique em **"Generate new token"**
2. **Nome**: `CLI Deploy Full Access`
3. **Importante:** Verifique se tem permissão de **"Management API"**
4. Clique em **"Generate token"**
5. **Copie o token completo** (começa com `sbp_`)

### Passo 3: Fazer Login Novamente

```bash
npx supabase login --token SEU_NOVO_TOKEN
```

### Passo 4: Deploy

```bash
npx supabase functions deploy sync-whatsapp-contacts --project-ref uzywajqzbdbrfammshdg
```

---

## ✅ SOLUÇÃO 2: Deploy via Dashboard (Fallback)

Se o CLI continuar dando erro, use o Dashboard:

### 1. Copiar Código

Abra o arquivo no VS Code:
```
supabase/functions/sync-whatsapp-contacts/index.ts
```

Pressione **Ctrl+A** e **Ctrl+C**

### 2. Acessar Dashboard

URL: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions

### 3. Editar Função

1. Clique em `sync-whatsapp-contacts`
2. Clique em **"Edit function"**
3. Pressione **Ctrl+A** (selecionar tudo)
4. Pressione **Ctrl+V** (colar código novo)
5. Verificar que começa com: `* VERSÃO CORRIGIDA`

### 4. Deploy

1. Clique no botão verde **"Deploy"**
2. Aguarde: "Function deployed successfully" ✅

---

## ✅ SOLUÇÃO 3: Usar Service Role Key Diretamente

### ⚠️ ATENÇÃO: Esta solução é temporária

Você pode testar a Edge Function manualmente usando cURL:

```bash
curl -L -X POST 'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-whatsapp-contacts' \
  -H 'Authorization: Bearer SEU_JWT_USER_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{}'
```

Para obter o JWT token:
1. Acesse: https://aica-staging-5562559893.southamerica-east1.run.app/diagnostics
2. Clique em **"👤 Verificar Sessão"**
3. Copie o token que aparece no log

**Mas isso NÃO resolve o problema do deploy!**

---

## 🎯 RECOMENDAÇÃO

**Use a SOLUÇÃO 1**: Gerar um novo token com permissões corretas.

Se o token foi gerado em:
- https://supabase.com/dashboard/account/tokens

Certifique-se de:
1. ✅ Estar logado com a conta correta
2. ✅ Token ter permissão "Management API"
3. ✅ Copiar o token completo (incluindo o `sbp_`)
4. ✅ Não ter espaços antes/depois do token

---

## 📞 Troubleshooting

### Se Ainda Der Erro

Execute passo-a-passo:

```bash
# 1. Verificar se está logado
npx supabase projects list

# 2. Se ver seus projetos, o login está OK

# 3. Tentar deploy com verbose
npx supabase functions deploy sync-whatsapp-contacts \
  --project-ref uzywajqzbdbrfammshdg \
  --debug

# 4. Ver os logs do erro completo
```

### Último Recurso: Dashboard

Se nada funcionar, use o Dashboard (SOLUÇÃO 2). É 100% confiável.

---

## ✅ Checklist de Verificação

- [ ] Token começa com `sbp_`
- [ ] Token tem permissão "Management API"
- [ ] Token foi copiado completamente
- [ ] Não há espaços no token
- [ ] Login foi bem-sucedido (`You are now logged in`)
- [ ] Lista de projetos aparece (`npx supabase projects list`)
- [ ] Se tudo falhar → Usar Dashboard (SOLUÇÃO 2)
