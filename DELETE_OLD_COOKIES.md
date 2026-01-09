# 🗑️ Deletar Cookies Antigos Manualmente

## ❌ Problema Persistente:
O cookie do projeto Supabase antigo ainda está presente:
```
sb-gppebtrshbvuzatmebhr-auth-token-code-verifier  ← PRECISA SER DELETADO!
```

---

## ✅ Solução Manual (30 segundos)

### Método 1: Deletar Cookies Individualmente

1. **Abra DevTools** (F12)
2. Vá na aba **Application**
3. No menu esquerdo, expanda **Cookies**
4. Clique em `http://localhost:3001`
5. **Procure e DELETE estes cookies:**
   - ❌ `sb-gppebtrshbvuzatmebhr-auth-token-code-verifier`
   - ❌ Qualquer outro cookie que comece com `sb-gppebtrshbvuzatmebhr`
6. **Mantenha apenas:**
   - ✅ `sb-uzywajqzbdbrfammshdg-auth-token`
   - ✅ `sb-uzywajqzbdbrfammshdg-auth-token-code-verifier` (se existir)

### Método 2: JavaScript Console (MAIS RÁPIDO)

1. **Abra DevTools** (F12)
2. Vá na aba **Console**
3. **Cole e execute:**

```javascript
// Deletar TODOS os cookies
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

// Limpar localStorage e sessionStorage
localStorage.clear();
sessionStorage.clear();

console.log("✅ Todos os cookies deletados!");
console.log("🔄 Recarregando página...");

// Recarregar página
setTimeout(() => window.location.reload(), 1000);
```

4. **Aguarde a página recarregar**
5. **Faça login novamente**
6. **Teste sincronizar WhatsApp**

---

## 🔍 Verificar se Funcionou

Após fazer login novamente, execute no Console:

```javascript
// Verificar cookies atuais
const cookies = document.cookie.split(';').map(c => c.trim().split('=')[0]);
console.log("Cookies atuais:", cookies);

// Verificar se há cookies antigos
const oldCookies = cookies.filter(c => c.includes('gppebtrshbvuzatmebhr'));
if (oldCookies.length > 0) {
  console.error("❌ Cookies antigos ainda presentes:", oldCookies);
} else {
  console.log("✅ Nenhum cookie antigo encontrado!");
}

// Verificar sessão
const { data } = await window.supabase.auth.getSession();
console.log("✅ User:", data.session?.user?.email);
console.log("✅ Token válido:", !!data.session?.access_token);
```

---

## 🎯 Então Teste Novamente:

1. Vá para: http://localhost:3001/contacts
2. Clique "Sincronizar WhatsApp"
3. **Resultado esperado:**
   ```
   ✅ Sincronização concluída! 544 contatos sincronizados
   ```

---

## ⚠️ Se AINDA Não Funcionar

O problema pode estar na Edge Function. Execute este teste:

```javascript
// Testar Edge Function diretamente
const { data: session } = await window.supabase.auth.getSession();

const response = await fetch(
  'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-whatsapp-contacts',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.session.access_token}`
    },
    body: JSON.stringify({})
  }
);

console.log('Status:', response.status);
console.log('Status Text:', response.statusText);

const result = await response.json();
console.log('Response:', result);
```

**Me envie o resultado deste teste!**

---

**Execute o Método 2 (JavaScript Console) AGORA e me diga o resultado!** 🚀
