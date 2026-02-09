# 🚀 DEPLOY AGORA - Edge Function

## ⚠️ STATUS ATUAL: Código Local OK, Mas NÃO Deployado

Você está recebendo erro 401 porque a Edge Function no Supabase Dashboard **ainda tem o código antigo**.

---

## 📋 INSTRUÇÕES PASSO-A-PASSO

### Passo 1: Abrir o Arquivo Local

1. Abra o VS Code
2. Navegue até: `supabase/functions/sync-whatsapp-contacts/index.ts`
3. Pressione **Ctrl+A** (selecionar tudo)
4. Pressione **Ctrl+C** (copiar)

### Passo 2: Acessar o Supabase Dashboard

1. Abra o navegador
2. Cole esta URL na barra de endereços:
   ```
   https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions
   ```
3. Faça login se necessário

### Passo 3: Editar a Edge Function

1. Você verá uma lista de Edge Functions
2. Procure por: **`sync-whatsapp-contacts`**
3. Clique no **nome** da função (não no ícone de play)
4. Clique no botão **"Edit function"** (canto superior direito)

### Passo 4: Substituir o Código

1. No editor que abriu, pressione **Ctrl+A** (selecionar todo o código antigo)
2. Pressione **Ctrl+V** (colar o código novo que você copiou)
3. Verifique se o código começa com:
   ```typescript
   /**
    * Sync WhatsApp Contacts Edge Function - VERSÃO CORRIGIDA
   ```

### Passo 5: Deploy

1. Role até o final da página
2. Clique no botão verde **"Deploy"** (canto inferior direito)
3. Aguarde a mensagem: **"Function deployed successfully"** ✅
4. Pode demorar 10-30 segundos

### Passo 6: Testar

1. Volte para: https://aica-staging-5562559893.southamerica-east1.run.app/diagnostics
2. Clique no botão **"🚀 Testar Edge Function"**
3. Você deve ver:
   ```
   ✅ SUCESSO! Edge Function funcionou!
   📋 Contatos sincronizados: X
   ```

---

## 🔍 VERIFICAR SE DEU CERTO

### Sinais de Sucesso ✅

- Status: **200 OK** (não mais 401)
- Mensagem: "SUCESSO! Edge Function funcionou!"
- Log mostra: "Contatos sincronizados: X"

### Se Ainda Mostrar 401 ❌

Verifique:
1. **O deploy foi feito?** Você viu a mensagem "Function deployed successfully"?
2. **O código está correto?** Deve começar com "VERSÃO CORRIGIDA"
3. **Aguardou 30 segundos?** Às vezes o deploy demora um pouco

---

## 🆘 PRECISA DE AJUDA?

Se ainda não funcionar:

1. **Tire um print** da tela de edição da função (com o código visível)
2. **Tire um print** da mensagem de erro no /diagnostics
3. **Verifique os logs** da Edge Function:
   ```
   https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions/sync-whatsapp-contacts/logs
   ```

---

## 📝 CHECKLIST

- [ ] Abri o arquivo `supabase/functions/sync-whatsapp-contacts/index.ts`
- [ ] Copiei TODO o conteúdo (Ctrl+A, Ctrl+C)
- [ ] Acessei o Supabase Dashboard
- [ ] Encontrei a função `sync-whatsapp-contacts`
- [ ] Cliquei em "Edit function"
- [ ] Colei o código novo (Ctrl+A, Ctrl+V)
- [ ] Verifiquei que o código começa com "VERSÃO CORRIGIDA"
- [ ] Cliquei em "Deploy"
- [ ] Vi a mensagem "Function deployed successfully"
- [ ] Testei em /diagnostics
- [ ] Recebi status 200 OK! 🎉

---

## 🎯 LEMBRE-SE

**O código local está CORRETO!** Você só precisa copiá-lo para o Dashboard do Supabase e fazer deploy.

É literalmente: **Copiar → Colar → Deploy → Pronto!**

5 minutos no máximo! 🚀
