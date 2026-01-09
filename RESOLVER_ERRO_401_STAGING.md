# 🔧 Resolver Erro 401 no Staging - Cookies Antigos

## Problema
Erro 401 Unauthorized ao fazer login em staging causado por **cookies do projeto antigo** (`gppebtrshbvuzatmebhr`) conflitando com o projeto correto (`uzywajqzbdbrfammshdg`).

---

## ✅ Solução Rápida (RECOMENDADA)

### Opção 1: Usar Página de Diagnóstico (Mais Fácil)

1. **Acesse a página de diagnóstico:**
   ```
   https://aica-staging-5p22u2w6jq-rj.a.run.app/diagnostics
   ```

2. **Clique no botão:**
   ```
   🧹 Limpar Cookies Auth
   ```

3. **Faça logout e login novamente:**
   - Abra: https://aica-staging-5p22u2w6jq-rj.a.run.app/
   - Faça logout (se estiver logado)
   - Faça login novamente com Google

4. **Verifique se funcionou:**
   - Na página de diagnóstico, clique em **🍪 Verificar Cookies**
   - Deve mostrar apenas cookies `uzywajqzbdbrfammshdg` (✅ verdes)
   - Não deve ter cookies `gppebtrshbvuzatmebhr` (❌ vermelhos)

---

### Opção 2: Limpar Manualmente no DevTools

1. **Abra DevTools** (F12) em https://aica-staging-5p22u2w6jq-rj.a.run.app/

2. **Vá para aba Application:**
   - Application → Storage → Cookies
   - Selecione `https://aica-staging-5p22u2w6jq-rj.a.run.app`

3. **Delete todos os cookies que começam com:**
   - `sb-gppebtrshbvuzatmebhr-` (cookies antigos - DELETE TODOS)
   - `sb-uzywajqzbdbrfammshdg-` (cookies atuais - opcional, mas recomendado limpar também)

4. **Recarregue a página** (F5) e faça login novamente

---

### Opção 3: Modo Anônimo (Teste Rápido)

1. **Abra janela anônima/privada** (Ctrl+Shift+N no Chrome)

2. **Acesse:**
   ```
   https://aica-staging-5p22u2w6jq-rj.a.run.app/
   ```

3. **Faça login normalmente**

Se funcionar no modo anônimo, confirma que o problema são os cookies antigos.

---

## 🔍 Como Verificar se o Problema Foi Resolvido

### No Console do DevTools (F12):

✅ **Esperado (Correto):**
```javascript
[CookieAdapter] GET cookie (chunked): sb-uzywajqzbdbrfammshdg-auth-token Object
```

❌ **Problemático (Cookies Antigos):**
```javascript
[CookieAdapter] GET cookie (chunked): sb-gppebtrshbvuzatmebhr-auth-token Object
```

### Na Aba Network:

✅ **Esperado:**
```
https://uzywajqzbdbrfammshdg.supabase.co/auth/v1/token?grant_type=pkce → 200 OK
```

❌ **Problemático:**
```
https://gppebtrshbvuzatmebhr.supabase.co/auth/v1/token?grant_type=pkce → 401 Unauthorized
```

---

## 📋 IDs dos Projetos

| Projeto | Status | URL |
|---------|--------|-----|
| `uzywajqzbdbrfammshdg` | ✅ **CORRETO** (usar este) | https://uzywajqzbdbrfammshdg.supabase.co |
| `gppebtrshbvuzatmebhr` | ❌ **ANTIGO** (abandonado) | ~~https://gppebtrshbvuzatmebhr.supabase.co~~ |

---

## 🚨 Se Ainda Não Funcionar

1. **Verifique se está usando o navegador correto:**
   - Tente outro navegador (Chrome, Firefox, Edge)

2. **Limpe o cache completo:**
   - Chrome: Ctrl+Shift+Delete → Marcar "Cookies" e "Cached images"
   - Período: "Last hour" ou "All time"

3. **Verifique se o Supabase está configurado:**
   - Dashboard: https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg
   - Authentication → URL Configuration
   - Adicionar em "Redirect URLs":
     ```
     https://aica-staging-5p22u2w6jq-rj.a.run.app/**
     ```

4. **Desative extensões do navegador:**
   - Algumas extensões (ad blockers, privacy tools) podem bloquear cookies

---

## ✅ Checklist de Verificação

- [ ] Acessei https://aica-staging-5p22u2w6jq-rj.a.run.app/diagnostics
- [ ] Cliquei em "🧹 Limpar Cookies Auth"
- [ ] Fiz logout e login novamente
- [ ] Verifiquei cookies com "🍪 Verificar Cookies"
- [ ] Console mostra apenas `uzywajqzbdbrfammshdg` (não `gppebtrshbvuzatmebhr`)
- [ ] Login funciona sem erro 401

---

**Após limpar os cookies, você poderá testar a Unified Timeline!** 🎉
