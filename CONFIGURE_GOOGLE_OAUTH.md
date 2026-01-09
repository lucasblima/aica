# 🔐 Configurar Google OAuth Client ID

## ❌ Problema Identificado

O arquivo `.env.local` contém um **placeholder** em vez do Client ID real:

```bash
VITE_GOOGLE_OAUTH_CLIENT_ID=your-project-number.apps.googleusercontent.com
```

Isso causa o erro **"Invalid API key"** durante o OAuth callback.

---

## ✅ Solução: Obter Client ID Real

### Passo 1: Acessar Google Cloud Console

1. Abra: https://console.cloud.google.com/apis/credentials

2. **Selecione o projeto correto** (mesmo projeto usado para Google Calendar API)

### Passo 2: Encontrar OAuth 2.0 Client ID

1. Na página "Credentials", procure a seção **"OAuth 2.0 Client IDs"**

2. Encontre o Client ID do tipo **"Web application"**

3. Clique no nome para abrir os detalhes

### Passo 3: Copiar Client ID

1. Você verá algo como:
   ```
   Client ID: 123456789012-abcdefghijklmnop.apps.googleusercontent.com
   ```

2. **Copie o valor completo** (incluindo `.apps.googleusercontent.com`)

### Passo 4: Atualizar .env.local

1. Abra o arquivo `.env.local`

2. Substitua o placeholder:
   ```bash
   # Antes (❌ ERRADO)
   VITE_GOOGLE_OAUTH_CLIENT_ID=your-project-number.apps.googleusercontent.com

   # Depois (✅ CORRETO)
   VITE_GOOGLE_OAUTH_CLIENT_ID=123456789012-abcdefghijklmnop.apps.googleusercontent.com
   ```

3. **Salve o arquivo**

### Passo 5: Reiniciar Dev Server

```bash
# Para o servidor atual (Ctrl+C)
# E inicie novamente:
npm run dev
```

---

## 🔍 Verificar Configuração

### Opção 1: Via Código

No console do DevTools:
```javascript
console.log('Client ID:', import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID)
// Deve mostrar: 123456789012-abcdefghijklmnop.apps.googleusercontent.com
// NÃO deve mostrar: your-project-number.apps.googleusercontent.com
```

### Opção 2: Via Página de Diagnósticos

1. Acesse: Settings → Diagnósticos

2. Clique em **"🧹 Limpar Cookies Auth"**

3. Faça logout e login novamente

4. Se o login funcionar, o Client ID está correto! ✅

---

## ⚠️ Troubleshooting

### Erro: "Invalid API key" persiste

1. **Limpe os cookies residuais:**
   - Acesse: Settings → Diagnósticos
   - Clique: "🧹 Limpar Cookies Auth"
   - Faça logout e login novamente

2. **Verifique Authorized Redirect URIs no Google Cloud Console:**
   ```
   http://localhost:3000
   http://localhost:3001
   https://uzywajqzbdbrfammshdg.supabase.co/auth/v1/callback
   ```

3. **Confirme que o dev server reiniciou** após alterar `.env.local`

### Erro: "Redirect URI mismatch"

1. No Google Cloud Console, adicione os redirect URIs:
   - Settings → API & Services → Credentials
   - Clique no OAuth Client ID
   - Adicione em "Authorized redirect URIs":
     ```
     http://localhost:3000
     http://localhost:3001
     https://uzywajqzbdbrfammshdg.supabase.co/auth/v1/callback
     ```

---

## ✅ Checklist Final

- [ ] Obtive o Client ID real do Google Cloud Console
- [ ] Atualizei `VITE_GOOGLE_OAUTH_CLIENT_ID` no `.env.local`
- [ ] Reiniciei o dev server (`npm run dev`)
- [ ] Limpei os cookies residuais via página Diagnósticos
- [ ] Testei login com Google OAuth

---

## 📚 Links Úteis

- **Google Cloud Console (Credentials)**: https://console.cloud.google.com/apis/credentials
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **OAuth 2.0 Playground** (testar manualmente): https://developers.google.com/oauthplayground/
