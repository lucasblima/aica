# 🚀 Deploy da Edge Function via CLI - Passo a Passo

## Por Que CLI é Melhor?

✅ Mais confiável que o Dashboard
✅ Automatiza o deploy
✅ Mostra logs em tempo real
✅ Evita problemas de copiar/colar

---

## 📋 Passo 1: Obter Access Token do Supabase

### 1.1. Acessar Página de Tokens

1. Abra o navegador
2. Acesse: **https://supabase.com/dashboard/account/tokens**
3. Faça login se necessário

### 1.2. Gerar Novo Token

1. Clique no botão **"Generate new token"**
2. Dê um nome: `CLI Deploy - Aica` (ou qualquer nome)
3. Clique em **"Generate token"**
4. **COPIE O TOKEN IMEDIATAMENTE** (ele só aparece uma vez!)
   - Formato: `sbp_0102...1920` (começa com `sbp_`)

### 1.3. Guardar o Token (Temporariamente)

Cole o token em um arquivo de texto temporário, pois vamos usar ele nos próximos passos.

---

## 📋 Passo 2: Login no Supabase CLI

Abra o terminal no VS Code e execute:

```bash
npx supabase login --token SEU_TOKEN_AQUI
```

**Exemplo:**
```bash
npx supabase login --token sbp_0102abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1920
```

### Resultado Esperado ✅

```
Finished supabase login.
```

---

## 📋 Passo 3: Verificar Projeto Linkado

```bash
npx supabase projects list
```

### Resultado Esperado ✅

Você deve ver o projeto `uzywajqzbdbrfammshdg` na lista:

```
┌─────────────────────────┬──────────────────────────┬───────────────┐
│         NAME            │       PROJECT REF        │    REGION     │
├─────────────────────────┼──────────────────────────┼───────────────┤
│ Aica Life OS (ou nome)  │ uzywajqzbdbrfammshdg     │ sa-east-1     │
└─────────────────────────┴──────────────────────────┴───────────────┘
```

---

## 📋 Passo 4: Deploy da Edge Function

Agora sim, vamos fazer o deploy da função corrigida!

```bash
npx supabase functions deploy sync-whatsapp-contacts --project-ref uzywajqzbdbrfammshdg
```

### O Que Acontece ✨

O CLI vai:
1. Ler o arquivo `supabase/functions/sync-whatsapp-contacts/index.ts`
2. Fazer upload para o Supabase
3. Compilar e deployar a função
4. Mostrar logs em tempo real

### Resultado Esperado ✅

```
Deploying function sync-whatsapp-contacts (script /path/to/index.ts)
Bundled sync-whatsapp-contacts (3.2 kB)
Deployed function sync-whatsapp-contacts to https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-whatsapp-contacts
```

### Se Der Erro ❌

**Erro: "Invalid access token"**
- Verifique se copiou o token corretamente
- Token deve começar com `sbp_`
- Gere um novo token se necessário

**Erro: "Function not found"**
- Normal! A função será criada automaticamente no primeiro deploy
- Continue normalmente

---

## 📋 Passo 5: Testar a Edge Function

### 5.1. Via Diagnostics Page

1. Acesse: **https://aica-staging-5p22u2w6jq-rj.a.run.app/diagnostics**
2. Clique em **"🚀 Testar Edge Function"**

### 5.2. Resultado Esperado ✅

```
✅ Sessão ativa
📡 Chamando Edge Function sync-whatsapp-contacts...
📊 Status: 200 OK  ← NÃO MAIS 401!
⏱️ Tempo de resposta: 200-500ms
✅ SUCESSO! Edge Function funcionou!
📋 Contatos sincronizados: X
📋 Contatos ignorados: X
⏱️ Duração (servidor): Xms
```

### 5.3. Via cURL (Opcional)

```bash
curl -L -X POST 'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-whatsapp-contacts' \
  -H 'Authorization: Bearer SEU_JWT_TOKEN_AQUI' \
  -H 'Content-Type: application/json' \
  --data '{}'
```

**Nota:** O JWT token é diferente do access token! Use o token que aparece nos logs do /diagnostics.

---

## 🔍 Verificar Logs da Edge Function

Se quiser ver os logs em tempo real:

```bash
npx supabase functions logs sync-whatsapp-contacts --project-ref uzywajqzbdbrfammshdg
```

Ou acesse no Dashboard:
```
https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions/sync-whatsapp-contacts/logs
```

---

## 📝 Resumo dos Comandos

```bash
# 1. Login (uma vez)
npx supabase login --token SEU_TOKEN_AQUI

# 2. Verificar projeto
npx supabase projects list

# 3. Deploy
npx supabase functions deploy sync-whatsapp-contacts --project-ref uzywajqzbdbrfammshdg

# 4. Ver logs (opcional)
npx supabase functions logs sync-whatsapp-contacts --project-ref uzywajqzbdbrfammshdg
```

---

## ✅ Checklist Final

- [ ] Obtive access token em https://supabase.com/dashboard/account/tokens
- [ ] Fiz login: `npx supabase login --token ...`
- [ ] Verifiquei projeto: `npx supabase projects list`
- [ ] Fiz deploy: `npx supabase functions deploy sync-whatsapp-contacts --project-ref uzywajqzbdbrfammshdg`
- [ ] Vi mensagem de sucesso: "Deployed function..."
- [ ] Testei em /diagnostics
- [ ] Recebi status 200 OK! 🎉

---

## 🎯 Próximos Deploys

Depois que fizer o login uma vez, você só precisa do comando de deploy:

```bash
npx supabase functions deploy sync-whatsapp-contacts --project-ref uzywajqzbdbrfammshdg
```

Muito mais rápido que o Dashboard! 🚀

---

## 🆘 Troubleshooting

### Erro: "Failed to bundle function"

Verifique se o arquivo existe:
```bash
ls -la supabase/functions/sync-whatsapp-contacts/index.ts
```

### Erro: "Network timeout"

Sua conexão pode estar bloqueada. Tente:
```bash
npx supabase functions deploy sync-whatsapp-contacts --project-ref uzywajqzbdbrfammshdg --debug
```

### Ainda Recebendo 401

1. Verifique se o deploy foi bem-sucedido (mensagem "Deployed function...")
2. Aguarde 30 segundos para propagação
3. Limpe cookies: /diagnostics → "🧹 Limpar Cookies Auth"
4. Faça logout e login novamente
5. Teste novamente

---

## 📚 Documentação Oficial

- **Supabase CLI**: https://supabase.com/docs/guides/cli
- **Edge Functions**: https://supabase.com/docs/guides/functions
- **Deploy Guide**: https://supabase.com/docs/guides/functions/deploy
