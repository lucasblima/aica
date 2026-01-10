# 🚀 Guia Passo-a-Passo: Deploy da Edge Function

## Status do Sprint

### ✅ Completo (7/10)
1. ✅ Variáveis de ambiente corrigidas (.env.local)
2. ✅ Página Diagnósticos com limpeza de cookies
3. ✅ Google OAuth Client ID configurado
4. ✅ Login OAuth funcionando no staging
5. ✅ Edge Function com código corrigido preparada
6. ✅ Rota /diagnostics funcionando no React Router
7. ✅ Canvas de logs com formato retangular

### ⏳ Pendente (3/10)
8. ⏳ **Deploy da Edge Function** ← VOCÊ ESTÁ AQUI
9. ⏳ Adicionar secret `SUPABASE_ANON_KEY`
10. ⏳ Testar Edge Function

---

## 📋 Passo 1: Adicionar o Secret `SUPABASE_ANON_KEY`

### 1.1. Abrir Dashboard de Secrets

1. Acesse: **https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/settings/edge-functions**
2. Na barra lateral esquerda, clique em **"Edge Functions"**
3. Role até a seção **"Secrets"**

### 1.2. Adicionar Novo Secret

1. Clique no botão **"Add new secret"**
2. Preencha os campos:
   - **Name**: `SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6eXdhanF6YmRicmZhbW1zaGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2NzExNTMsImV4cCI6MjA0NjI0NzE1M30.lMn0pYXb0oJgEHbBNmVNxBv1nYqM1nwPQXbYWOQ7Kig`
3. Clique em **"Save"**

### 1.3. Verificar Secret

Você deve ver na lista:
```
✅ SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY (já existe)
✅ SUPABASE_URL (já existe)
```

---

## 📋 Passo 2: Deploy da Edge Function

### 2.1. Abrir Editor da Edge Function

1. Acesse: **https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions**
2. Procure a função **`sync-whatsapp-contacts`** na lista
3. Clique no nome da função
4. Clique no botão **"Edit function"** (canto superior direito)

### 2.2. Copiar Código Corrigido

1. Abra o arquivo local: `supabase/functions/sync-whatsapp-contacts/index.ts`
2. **Selecione TODO o conteúdo** (Ctrl+A)
3. **Copie** (Ctrl+C)

### 2.3. Colar no Dashboard

1. No editor do Supabase Dashboard, **selecione todo o código antigo** (Ctrl+A)
2. **Cole o código novo** (Ctrl+V)
3. Verifique se o código começa com:
   ```typescript
   /**
    * Sync WhatsApp Contacts Edge Function - VERSÃO CORRIGIDA
    *
    * CORREÇÃO APLICADA: Usa dois clientes Supabase
    * - supabaseAuth (ANON_KEY) para validar token do usuário
    * - supabase (SERVICE_ROLE_KEY) para operações no banco
   ```

### 2.4. Fazer Deploy

1. Clique no botão **"Deploy"** (canto inferior direito)
2. Aguarde a mensagem de confirmação (pode demorar 10-30 segundos)
3. Você verá: **"Function deployed successfully"** ✅

---

## 📋 Passo 3: Testar a Edge Function

### 3.1. Acessar Página de Diagnósticos

**Localhost:**
```
http://localhost:3003/diagnostics
```

**Staging:**
```
https://aica-staging-5p22u2w6jq-rj.a.run.app/diagnostics
```

### 3.2. Executar Teste

1. Clique no botão **"🚀 Testar Edge Function"**
2. Aguarde os logs aparecerem no canvas

### 3.3. Resultado Esperado ✅

Você deve ver no log:
```
🔍 Verificando sessão...
────────────────────────────────────────────────────────────
✅ Sessão ativa
   User ID: [seu-user-id]
   Email: lucasboscacci@gmail.com
   Token (primeiros 50 chars): eyJhbGciOiJIUz...
   Token expira em: [data/hora]

📡 Chamando Edge Function sync-whatsapp-contacts...
📊 Status: 200 OK
⏱️  Tempo de resposta: [X]ms
✅ SUCESSO! Edge Function funcionou!
📋 Contatos sincronizados: X
📋 Contatos ignorados: X
⏱️  Duração (servidor): [X]ms
────────────────────────────────────────────────────────────
✅ Teste finalizado!
```

### 3.4. Erros Comuns e Soluções

#### ❌ Erro: 401 Unauthorized

**Causa**: Secret `SUPABASE_ANON_KEY` não configurado

**Solução**: Volte ao **Passo 1** e adicione o secret

#### ❌ Erro: "Missing authorization header"

**Causa**: Usuário não está autenticado

**Solução**:
1. Faça logout
2. Limpe os cookies (botão "🧹 Limpar Cookies Auth")
3. Faça login novamente

#### ❌ Erro: "Evolution API credentials not configured"

**Causa**: Secrets da Evolution API não configurados

**Solução**: Adicione os secrets:
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE_NAME`

---

## 🎯 Resumo Rápido (TL;DR)

### 1️⃣ Adicionar Secret
Dashboard → Edge Functions → Secrets → Add:
- Name: `SUPABASE_ANON_KEY`
- Value: `eyJhbGciOi...` (copie do .env.local)

### 2️⃣ Deploy da Função
Dashboard → Functions → `sync-whatsapp-contacts` → Edit:
- Cole o código de `supabase/functions/sync-whatsapp-contacts/index.ts`
- Clique "Deploy"

### 3️⃣ Testar
Acesse `/diagnostics` → Clique "🚀 Testar Edge Function"

---

## 📞 Precisa de Ajuda?

Se encontrar algum problema:

1. **Verifique os logs da Edge Function**:
   https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions/sync-whatsapp-contacts/logs

2. **Execute diagnósticos**:
   - 👤 Verificar Sessão
   - 🍪 Verificar Cookies
   - 🧹 Limpar Cookies Auth (se necessário)

3. **Verifique as variáveis de ambiente**:
   - Localhost: `.env.local`
   - Staging: Cloud Run Environment Variables

---

## ✅ Checklist Final

- [ ] Secret `SUPABASE_ANON_KEY` adicionado no Dashboard
- [ ] Código da Edge Function atualizado no Dashboard
- [ ] Deploy da função realizado com sucesso
- [ ] Teste executado em `/diagnostics`
- [ ] Status 200 OK recebido
- [ ] Contatos sincronizados com sucesso

**Depois de completar todos os itens, o Sprint 2 estará 100% completo!** 🎉
