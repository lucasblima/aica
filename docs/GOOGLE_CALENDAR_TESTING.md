# 🧪 Guia de Testes - Google Calendar Integration

## ✅ Checklist de Implementação Completa

- [x] Componente `GoogleCalendarConnect.tsx` criado e integrado
- [x] Serviço `googleAuthService.ts` implementado
- [x] Serviço `googleCalendarTokenService.ts` implementado (multi-user)
- [x] Tabela `google_calendar_tokens` criada no Supabase
- [x] RLS policies configuradas para isolamento por usuário
- [x] `handleOAuthCallback()` integrado no `App.tsx`
- [x] Build sem erros

---

## 🧪 Teste 1: OAuth Flow - Um Usuário

### Setup
1. Limpar cache do navegador
2. Fazer logout completamente
3. Abrir app em `localhost:5173`

### Passos
```
1. ✅ Login com sua conta Google (Aica Life OS)
2. ✅ Navegar para Agenda
3. ✅ Ver card "Sincronizar Agenda"
4. ✅ Clicar em "Autorizar Acesso"
5. ✅ Popup Google aparecer
6. ✅ Selecionar conta Google
7. ✅ Aceitar permissões
8. ✅ Redirecionar automaticamente para a app
```

### Validações
- [ ] Console mostra: `[App] Google OAuth callback detected, saving tokens to database...`
- [ ] Console mostra: `[App] Google Calendar tokens saved successfully`
- [ ] Botão muda de "Autorizar Acesso" para "Sincronizado" (verde)
- [ ] No Supabase: Query `SELECT * FROM google_calendar_tokens WHERE user_id = ...` retorna 1 registro
- [ ] Record tem: `access_token`, `email`, `is_connected = true`

### Esperado ✅
```
Browser Console:
[App] Google OAuth callback detected, saving tokens to database...
[App] Google Calendar tokens saved successfully

UI:
✓ Botão verde "Sincronizado"
✓ Card mostra email da conta Google
```

---

## 🧪 Teste 2: Multi-Usuário - Mesmo Navegador

### Setup
1. Ter testado Teste 1 antes

### Passos
```
1. ✅ No navegador aberto, fazer Logout
2. ✅ Login com OUTRA conta Google (conta B)
3. ✅ Navegar para Agenda
4. ✅ Ver card "Sincronizar Agenda" (botão "Autorizar Acesso")
5. ✅ Clicar em "Autorizar Acesso"
6. ✅ Popup Google aparecer
7. ✅ Selecionar OUTRA conta Google (B)
8. ✅ Aceitar permissões
9. ✅ Redirecionar automaticamente
```

### Validações - CRÍTICA! 🔐
- [ ] User A tokens ainda existem no DB (SELECT com user_id A)
- [ ] User B tem NOVOS tokens (diferentes de A)
- [ ] User B tokens têm: `access_token` DIFERENTE de A
- [ ] User B tokens têm: `email` da conta B (ex: b@gmail.com)
- [ ] RLS Policy funciona:
  ```sql
  -- User A consegue ver apenas seus tokens
  SELECT * FROM google_calendar_tokens; -- Retorna APENAS tokens de A

  -- User B consegue ver apenas seus tokens
  SELECT * FROM google_calendar_tokens; -- Retorna APENAS tokens de B
  ```

### Esperado ✅
```
Supabase (Admin):
- google_calendar_tokens tem 2 registros
- Cada um com user_id diferente
- Cada um com access_token diferente
- Cada um com email diferente

RLS Policies:
- Usuário A não consegue ver tokens de B
- Usuário B não consegue ver tokens de A
```

---

## 🧪 Teste 3: Sincronização de Eventos

### Setup
1. Ter um usuário logado e autorizado (com token salvo)
2. Ter eventos no Google Calendar dessa conta

### Passos
```
1. ✅ Em AgendaView, verificar GoogleCalendarEventsList
2. ✅ Deve aparecer lista de eventos de hoje
3. ✅ Cada evento mostra: hora, título, participantes
4. ✅ Clicar em "Sincronizar" (botão refresh)
5. ✅ Vê loading
6. ✅ Eventos atualizam
```

### Validações
- [ ] Console mostra fetch bem-sucedido para Google Calendar API
- [ ] Eventos aparecem em ordem chronológica
- [ ] Nenhum erro de "Token não encontrado"
- [ ] `last_sync` timestamp atualizado no DB

### Esperado ✅
```
Console (Network):
GET https://www.googleapis.com/calendar/v3/calendars/primary/events?...
Status: 200 OK

UI:
- Lista de eventos de hoje
- Cada evento com hora, título, participantes
```

---

## 🧪 Teste 4: Token Refresh Automático

### Setup
1. Ter usuário autorizado
2. Ter token que vai expirar em breve (ou simular)

### Passos (Simulação)
```
1. ✅ Autorizar Google Calendar
2. ✅ Verificar token_expiry no DB
3. ✅ Aguardar até 5min antes da expiração
4. ✅ Tentar sincronizar eventos
5. ✅ Sistema deve renovar token automaticamente
```

### Validações
- [ ] `last_refresh` timestamp é atualizado
- [ ] `access_token` muda (novo token)
- [ ] Sem erro "Token expirado"
- [ ] Sincronização continua funcionando

### Esperado ✅
```
Database (google_calendar_tokens):
- access_token: [NOVO TOKEN]
- last_refresh: [AGORA]
- token_expiry: [NOVA DATA]
```

---

## 🧪 Teste 5: Desconexão

### Setup
1. Ter usuário autorizado

### Passos
```
1. ✅ Estar logado com conta Google
2. ✅ Ver card "Sincronizar Agenda" com botão "Desconectar"
3. ✅ Clicar em botão "Desconectar"
4. ✅ Card volta ao estado "Autorizar Acesso"
```

### Validações
- [ ] `is_connected` no DB muda para `false`
- [ ] Tokens são revogados com Google
- [ ] Próxima tentativa de sincronizar retorna erro
- [ ] Button volta ao estado "Autorizar Acesso"

### Esperado ✅
```
Database (google_calendar_tokens):
- is_connected: false

UI:
- Botão volta para "Autorizar Acesso"
- Sem erros no console
```

---

## 🧪 Teste 6: Múltiplos Navegadores/Dispositivos

### Setup
1. Ter o mesmo usuário em 2 navegadores/devices

### Passos
```
Browser 1 (Desktop):
1. ✅ Login
2. ✅ Autorizar Google Calendar
3. ✅ Vê eventos sincronizados

Browser 2 (Mobile/Incognito):
4. ✅ Login com MESMA conta
5. ✅ Navegar para Agenda
6. ✅ Card deve mostrar "Sincronizado" (não pede autorizar)
7. ✅ Consegue ver eventos (usando mesmo token do DB)
```

### Validações
- [ ] Ambos navegadores veem a mesma conta Google conectada
- [ ] Tokens no DB são os mesmos (não há duplication)
- [ ] Não precisa re-autorizar em Browser 2
- [ ] Ambos sincronizam a MESMA agenda

### Esperado ✅
```
Database:
- 1 único registro em google_calendar_tokens para este user_id
- Nenhuma duplicação de tokens

UI:
- Browser 1: "Sincronizado"
- Browser 2: "Sincronizado" (mesmo status)
```

---

## 🔍 Debugging

### Console Logs Esperados
```javascript
// Ao autorizar
[App] Google OAuth callback detected, saving tokens to database...
[App] Google Calendar tokens saved successfully

// Ao sincronizar eventos
[useGoogleCalendarEvents] Fetching events...
[useGoogleCalendarEvents] Events fetched: 5 eventos

// Ao renovar token
[googleCalendarTokenService] Token refresh needed, refreshing...
[googleCalendarTokenService] Token refreshed successfully
```

### Queries SQL para Debug

```sql
-- Ver tokens do usuário atual
SELECT id, user_id, email, is_connected, last_sync, last_refresh, created_at
FROM google_calendar_tokens
WHERE user_id = auth.uid();

-- Ver todos os tokens (admin)
SELECT user_id, email, is_connected, last_sync, created_at
FROM google_calendar_tokens
ORDER BY created_at DESC;

-- Ver tokens expirados (admin)
SELECT user_id, email, token_expiry
FROM google_calendar_tokens
WHERE token_expiry < now() AND is_connected = true;
```

### Verificação de RLS Policies

```sql
-- Como User A - deve ver APENAS seus tokens
SELECT * FROM google_calendar_tokens;
-- Resultado: 1 linha (ou vazio se não autorizado)

-- Como User B - deve ver APENAS seus tokens (diferentes de A)
SELECT * FROM google_calendar_tokens;
-- Resultado: 1 linha diferente de A (ou vazio se não autorizado)
```

---

## 📋 Checklist Final de Testes

### Funcionalidade
- [ ] Teste 1: OAuth Flow - Um usuário
- [ ] Teste 2: Multi-usuário - Mesmo navegador
- [ ] Teste 3: Sincronização de eventos
- [ ] Teste 4: Token refresh automático
- [ ] Teste 5: Desconexão
- [ ] Teste 6: Múltiplos navegadores

### Segurança
- [ ] RLS policies funcionando
- [ ] User A não vê tokens de B
- [ ] Tokens não são expostos no localStorage
- [ ] Tokens não aparecem no DevTools

### Performance
- [ ] Sem erros no console
- [ ] Build sem warnings
- [ ] Sincronização < 2 segundos
- [ ] Token refresh silencioso

### UX
- [ ] Botão muda corretamente
- [ ] Eventos aparecem em tempo real
- [ ] Mensagens de erro claras
- [ ] Sem necessidade de refresh manual

---

## 🚀 Deploy para Produção

Antes de deployar, garantir:

1. ✅ Variáveis de ambiente configuradas:
   ```env
   VITE_GOOGLE_OAUTH_CLIENT_ID=...
   VITE_GOOGLE_OAUTH_CLIENT_SECRET=...
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

2. ✅ Supabase projeto configurado:
   - Tabela `google_calendar_tokens` criada
   - RLS policies aplicadas
   - Índices criados

3. ✅ Google Cloud Console:
   - OAuth app configurado
   - Redirect URIs incluem domínio de produção
   - Scopes configurados corretamente

4. ✅ Testes em staging:
   - Rodar todos os testes acima
   - Verificar tokens salvando no DB
   - Validar sincronização

5. ✅ Monitoring:
   - Verificar logs do Supabase
   - Monitorar erros de OAuth
   - Alertas para tokens não renovados

---

## 📞 Troubleshooting

### "Token não encontrado"
- [ ] Usuário autorizou? (`is_connected = true`)
- [ ] Token não expirou? (`token_expiry > now()`)
- [ ] RLS policy permitindo acesso?

### "OAuth redirect não funciona"
- [ ] Redirect URI configurado no Google Cloud?
- [ ] Domínio bate com Google Console?
- [ ] CORS habilitado?

### "Eventos não aparecem"
- [ ] Token válido? (`curl -H "Authorization: Bearer $TOKEN" https://www.googleapis.com/calendar/v3/calendars/primary`)
- [ ] Usuário tem eventos hoje?
- [ ] Scopes incluem `calendar.readonly`?

### "RLS Policy bloqueando"
- [ ] Row level security habilitado?
- [ ] Policy condicional está correta?
- [ ] Service role consegue fazer queries admin?

---

## 📝 Notas

- Tokens são criptografados no repouso (Supabase padrão)
- Refresh tokens renovados automaticamente
- Não há necessidade de re-autorizar após logout/login
- Funciona com múltiplos calendários (future enhancement)
- Background sync pode ser implementado com Edge Functions

