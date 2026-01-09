# 🔍 Diagnóstico via Network Tab

## 📊 Método Alternativo (sem usar Console)

### Passo 1: Abrir Network Tab
1. Pressione **F12** (DevTools)
2. Vá na aba **Network** (Rede)
3. **Limpe o histórico** (ícone 🚫 ou botão "Clear")
4. Marque **"Preserve log"** (para não perder os dados)

### Passo 2: Tentar Sincronizar
1. Clique no botão **"Sincronizar WhatsApp"** (💬)
2. Aguarde aparecer o erro

### Passo 3: Analisar a Requisição
1. Na lista de requisições, procure por `sync-whatsapp-contacts`
2. **Clique nela**
3. Veja as abas:
   - **Headers** (cabeçalhos)
   - **Payload** (corpo da requisição)
   - **Response** (resposta do servidor)

### Passo 4: Me Envie Estas Informações:

#### A) Na aba **Headers**:
- **Status Code:** (ex: 401 Unauthorized)
- **Request URL:** (deve ser https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/sync-whatsapp-contacts)

#### B) Ainda em **Headers**, procure por **Request Headers**:
- Tem `Authorization: Bearer ...` ? (Sim/Não)
- Se sim, o valor começa com "Bearer ey..." ? (Sim/Não)

#### C) Na aba **Response**:
- **Copie a mensagem de erro** (pode ser JSON ou texto)

---

## 🎯 O Que Procurar:

### ✅ Cenário Correto (o que deveria aparecer):
```
Status: 200 OK
Authorization: Bearer eyJhbGc...
Response: {"success": true, "contactsSynced": 544, ...}
```

### ❌ Cenário com Problema:
```
Status: 401 Unauthorized
Authorization: Bearer eyJhbGc... (ou ausente!)
Response: {"code": 401, "message": "Invalid JWT"}
```

---

## 🔧 Possíveis Problemas e Soluções:

### Problema 1: Sem Header de Authorization
**Sintoma:** Não aparece `Authorization: Bearer ...` nos headers
**Causa:** Frontend não está enviando o token
**Solução:** Verificar código do `whatsappContactSyncService.ts`

### Problema 2: Token Inválido
**Sintoma:** `Authorization` presente, mas erro 401
**Causa:** Token expirado ou inválido
**Solução:** Logout + Login novamente

### Problema 3: Response "Invalid JWT" ou "jwt malformed"
**Sintoma:** Response mostra erro de JWT
**Causa:** Token corrompido
**Solução:** Limpar cookies completamente

### Problema 4: Response vazio ou erro 500
**Sintoma:** Status 500 ou resposta vazia
**Causa:** Erro na Edge Function
**Solução:** Verificar logs da função no Supabase

---

## 📸 Screenshots Úteis:

Se possível, tire screenshots de:
1. Network tab mostrando a requisição `sync-whatsapp-contacts`
2. Aba Headers mostrando Request Headers
3. Aba Response mostrando a mensagem de erro

---

**Execute os passos acima e me envie as informações solicitadas!** 🔍
