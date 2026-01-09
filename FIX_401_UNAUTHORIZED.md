# 🔧 Fix: 401 Unauthorized na Edge Function

## ❌ Problema Identificado:
```
POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-whatsapp-contacts
Status: 401 (Unauthorized)
```

**Causa:** Token de autenticação inválido ou cookies de múltiplos projetos Supabase

---

## ✅ Solução Rápida (1 minuto)

### Passo 1: Limpar TODOS os Dados do Site
1. Pressione **F12** (DevTools)
2. Vá na aba **Application**
3. No menu lateral esquerdo, clique em **Storage**
4. Clique no botão **"Clear site data"** (ou "Limpar dados do site")
5. Marque TODAS as opções:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
   - ✅ Local and session storage
6. Clique **"Clear data"** ou **"Limpar dados"**

### Passo 2: Recarregar Página
1. Pressione **F5** para recarregar
2. Você será redirecionado para a tela de login

### Passo 3: Fazer Login Novamente
1. Faça login com suas credenciais
2. Aguarde carregar completamente

### Passo 4: Testar Sincronização
1. Vá para: http://localhost:3001/contacts
2. Clique no botão **"Sincronizar WhatsApp"** (💬)
3. Aguarde 5-10 segundos

---

## 🎯 O Que Esperar:

**Se funcionar:**
```
✅ Sincronização concluída! 544 contatos sincronizados
```

**Se ainda der erro:**
Me envie o novo erro do Console (F12)

---

## 🔍 Por Que Isso Resolve?

O problema é que havia cookies de **2 projetos Supabase diferentes**:
- `sb-uzywajqzbdbrfammshdg` (antigo)
- `sb-uzywajqzbdbrfammshdg` (atual)

Limpar os dados remove todos os cookies antigos e força um novo login com token válido.

---

## ⚠️ Se Ainda Não Funcionar

Execute este teste no Console (F12):

```javascript
// Verificar token atual
const { data, error } = await window.supabase.auth.getSession()
console.log('Token:', data.session?.access_token?.substring(0, 50) + '...')
console.log('User:', data.session?.user?.email)
console.log('Expires at:', new Date(data.session?.expires_at * 1000))
```

Me envie o resultado!

---

**Execute a solução e me diga se funcionou!** 🚀
