# Telegram → Web Auth: 4 Opções de Acesso

**Issue:** #847
**Data:** 2026-03-23
**Status:** Plano aprovado, aguardando execução

## Contexto

Usuários criados via Telegram bot têm conta Supabase com email sintético (`tg_*@telegram.aica.guru`). Precisam de caminhos para acessar a web app. Nenhuma opção cobre todos os perfis — implementamos 4 opções complementares.

**WelcomePage já existe** (`src/pages/WelcomePage.tsx`) — detecta Telegram users, oferece criar senha e conectar Google Calendar. Todas as opções convergem para ela.

## Perfis de Usuário

| Perfil | Exemplo | Melhor opção |
|--------|---------|-------------|
| Baixo letramento digital (same device) | Fernando (pai) | C (link /web) |
| Profissional (cross-device) | Usuário desktop | A (magic link) |
| Explorador (sem Telegram) | Visitante landing | Google OAuth (existente) |
| Multi-device | Celular → desktop | D (código numérico) |

## Ordem de Implementação

```
A (email no bot) → C (/web link) → B (TG widget) → D (código)
     ↓                  ↓               ↓              ↓
  30 min             ~3h             ~4-6h          ~4-6h (futuro)
```

A e C na mesma PR. B em PR separada. D backlog.

---

## Opção A: Melhorar Registro de Email no Bot

### O que existe
- Bot já pede email no fluxo de onboarding
- `/status` mostra tipo de conta (convidado vs completa)
- `signInWithOtp()` envia magic link com redirect para `/welcome?source=telegram`

### O que falta
- Prompt proativo mais claro após interações
- Mensagem do `/status` mais persuasiva para registrar email

### Mudanças

**Arquivo:** `supabase/functions/telegram-webhook/index.ts`

1. **Melhorar `/status`** (~line 924-969):
   - Quando email sintético: mostrar benefícios de registrar email
   - CTA: "📧 Registre seu email para acessar pelo navegador"
   - Inline keyboard com botão de ação

2. **Prompt proativo** (~line 1870, após voz/texto processado):
   - Se `interaction_count >= 5` E email sintético E não mostrou prompt nas últimas 24h:
   - Enviar mensagem suave: "Dica: registre seu email com /meus_dados para acessar a AICA pelo computador também"

### Arquivos
- `supabase/functions/telegram-webhook/index.ts` (editar)

### DoD
- [ ] `/status` mostra CTA claro para email quando conta é convidado
- [ ] Prompt proativo aparece após 5+ interações (1x por 24h)
- [ ] Build do edge function passa
- [ ] Testar: enviar /status como usuário com email sintético

---

## Opção C: Comando `/web` com Link Temporário

### Conceito
Usuário digita `/web` no bot → recebe link clicável → clica → abre browser → logado.

### Fluxo
```
1. Usuário: /web
2. Bot: gera token (32 chars, expira em 15 min)
3. Bot: armazena token em user_telegram_links.web_auth_token + web_auth_expires_at
4. Bot: envia link: "🌐 Clique para abrir a AICA: https://aica.guru/auth/telegram?token=xxx"
5. Usuário clica link → browser abre
6. Frontend: /auth/telegram route detecta ?token=xxx
7. Frontend: chama edge function validate-telegram-web-token
8. Edge function: valida token, gera sessão Supabase, retorna session
9. Frontend: seta sessão, redireciona para /welcome (se first time) ou / (se web_onboarded)
```

### Mudanças

**Migration:** `supabase/migrations/YYYYMMDD_telegram_web_auth.sql`
```sql
-- Add columns to user_telegram_links
ALTER TABLE user_telegram_links
  ADD COLUMN IF NOT EXISTS web_auth_token TEXT,
  ADD COLUMN IF NOT EXISTS web_auth_expires_at TIMESTAMPTZ;

CREATE INDEX idx_telegram_web_auth_token
  ON user_telegram_links(web_auth_token)
  WHERE web_auth_token IS NOT NULL;

-- RPC to validate and consume token
CREATE OR REPLACE FUNCTION validate_web_auth_token(p_token TEXT)
RETURNS TABLE (user_id UUID, telegram_first_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE user_telegram_links
  SET web_auth_token = NULL, web_auth_expires_at = NULL
  WHERE web_auth_token = p_token
    AND web_auth_expires_at > now()
  RETURNING user_telegram_links.user_id, user_telegram_links.telegram_first_name;
END;
$$;
```

**Edge Function:** `supabase/functions/validate-telegram-web-token/index.ts`
- Recebe `{ token }` no body
- Chama RPC `validate_web_auth_token(token)`
- Se válido: gera session JWT via `supabase.auth.admin.generateLink({ type: 'magiclink', email: user_email })`
- Retorna `{ success: true, redirect_url }` com magic link URL
- Se inválido: retorna `{ success: false, error: 'Token expirado ou inválido' }`

**Telegram Webhook:** `supabase/functions/telegram-webhook/index.ts`
- Adicionar case `/web` no switch de comandos (~line 1640)
- `handleWeb()`: gera token de 32 chars (crypto.randomUUID), salva na tabela, envia link

**Frontend Route:** `src/pages/TelegramAuthPage.tsx`
- Nova página em `/auth/telegram`
- Lê `?token=` da URL
- Chama edge function para validar
- Se sucesso: redirect para URL do magic link (que Supabase processa automaticamente)
- Se falha: mostra erro com botão "Voltar para Telegram"

**Router:** `src/router/AppRouter.tsx`
- Adicionar rota pública: `/auth/telegram` → TelegramAuthPage

### Segurança
- Token: 32 chars (UUID), entropia suficiente
- Expira em 15 minutos
- Single-use (consumido no validate)
- Rate limiting: máximo 1 token ativo por usuário
- CORS: aica.guru e dev.aica.guru apenas
- Token não é sessão — é trocado por magic link do Supabase (auth padrão)

### Arquivos
- `supabase/migrations/YYYYMMDD_telegram_web_auth.sql` (criar)
- `supabase/functions/validate-telegram-web-token/index.ts` (criar)
- `supabase/functions/telegram-webhook/index.ts` (editar: adicionar /web)
- `src/pages/TelegramAuthPage.tsx` (criar)
- `src/router/AppRouter.tsx` (editar: adicionar rota)

### DoD
- [ ] `/web` no bot gera link e envia ao usuário
- [ ] Clicar link no celular abre browser e loga automaticamente
- [ ] Token expira após 15 min
- [ ] Token é single-use (segundo clique mostra erro amigável)
- [ ] Redireciona para /welcome (first time) ou / (returning)
- [ ] Build passa, edge function deploys

---

## Opção B: Telegram Login Widget na Landing Page

### Conceito
Botão "Entrar com Telegram" na landing page. Usa widget oficial do Telegram.

### Pré-requisitos
- Configurar domínio no BotFather: `/setdomain` → `aica.guru`
- Widget gera callback com dados assinados (HMAC-SHA256 com bot token)

### Fluxo
```
1. Usuário abre aica.guru/landing
2. Clica "Entrar com Telegram" (widget oficial)
3. Telegram confirma identidade (popup ou redirect)
4. Widget retorna: { id, first_name, username, photo_url, auth_date, hash }
5. Frontend envia dados para edge function validate-telegram-login
6. Edge function: valida HMAC, busca user por telegram_id, gera session
7. Frontend: seta sessão, redireciona para /welcome ou /
```

### Mudanças

**Edge Function:** `supabase/functions/validate-telegram-login/index.ts`
- Recebe dados do widget
- Valida HMAC-SHA256 com BOT_TOKEN
- Verifica `auth_date` não está stale (< 5 min)
- Busca user em `user_telegram_links` por `telegram_id`
- Se existe: gera magic link para o email do user
- Se não existe: cria guest account (mesmo flow do /start) + gera link
- Retorna redirect URL

**Frontend:** `src/modules/onboarding/components/landing/LandingPage.tsx`
- Adicionar `TelegramLoginButton` component no ConversionSection
- Widget script: `https://telegram.org/js/telegram-widget.js?22`
- Callback function recebe dados e chama edge function

**Componente:** `src/components/auth/TelegramLoginButton.tsx`
- Wrapper React para o Telegram Login Widget
- Insere script tag dinamicamente
- Props: `botName`, `onAuth`, `buttonSize`

### Segurança
- HMAC-SHA256 com bot token (server-side validation)
- auth_date check (previne replay attacks)
- Mesma sessão Supabase (magic link padrão)

### Arquivos
- `supabase/functions/validate-telegram-login/index.ts` (criar)
- `src/components/auth/TelegramLoginButton.tsx` (criar)
- `src/modules/onboarding/components/landing/LandingPage.tsx` (editar)
- `src/router/AppRouter.tsx` (editar se callback route necessária)

### DoD
- [ ] BotFather: domínio configurado
- [ ] Widget aparece na landing page
- [ ] Login funciona com conta Telegram existente (linked)
- [ ] Login cria guest account se Telegram user é novo
- [ ] Redireciona para /welcome ou /
- [ ] HMAC validação funciona (rejeita dados tampered)

---

## Opção D: Código Numérico Cross-Device (Futuro)

### Conceito
Landing page mostra código de 6 dígitos. Usuário digita no bot. Bot valida e gera sessão web.

### Fluxo
```
1. Usuário abre aica.guru/landing no desktop
2. Clica "Entrar via Telegram"
3. Frontend gera código de 6 dígitos, armazena com session_id
4. Mostra: "Digite este código no bot: 482917"
5. Usuário abre Telegram no celular, digita: /codigo 482917
6. Bot: valida código, associa session_id ao user_id
7. Frontend: polling detecta código validado
8. Frontend: gera sessão para o user_id
9. Usuário está logado no desktop
```

### Mudanças (estimativa)
- Nova tabela: `web_auth_codes` (code, session_id, user_id, expires_at, status)
- Edge function: `validate-web-code`
- Telegram webhook: adicionar `/codigo` command
- Frontend: polling component + UI do código
- Rate limiting: máx 3 tentativas por código

### Complexidade
- Polling vs Realtime (Supabase Realtime channel)
- Brute-force protection (6 dígitos = 1M combinações)
- Session handoff (desktop precisa receber sessão do celular)
- UX de timeout e retry

### Prioridade: BACKLOG
Implementar após A+B+C validados. Só faz sentido com base de usuários maior que justifique o caso cross-device.

---

## Bug Relacionado: Voice Routing

### Problema
Voice messages estão sendo roteadas para `create_task` em vez de `log_mood` (criar momentos). Pipeline funciona (status: completed), mas a ação do AI é incorreta.

### Causa Provável
System prompt ou function declarations no `telegram-ai-router.ts` pode estar enviesando o Gemini para `create_task`. Verificar:
- Ordem das function declarations (priming effect)
- System prompt: menciona momentos/humor?
- Few-shot examples: tem exemplo de "quero registrar como estou me sentindo"?

### Fix
- Arquivo: `supabase/functions/_shared/telegram-ai-router.ts`
- Verificar system prompt e function tool definitions
- Adicionar/melhorar description do `log_mood` tool
- Testar com voice messages que expressam sentimentos

### Prioridade: Paralela a A+C (independente)

---

## Resumo de Arquivos

| Arquivo | A | B | C | D |
|---------|---|---|---|---|
| `telegram-webhook/index.ts` | ✏️ | | ✏️ | ✏️ |
| `telegram-ai-router.ts` | | | | | (bug fix separado) |
| `validate-telegram-web-token/index.ts` | | | 🆕 | |
| `validate-telegram-login/index.ts` | | 🆕 | | |
| `validate-web-code/index.ts` | | | | 🆕 |
| `TelegramAuthPage.tsx` | | | 🆕 | |
| `TelegramLoginButton.tsx` | | 🆕 | | |
| `LandingPage.tsx` | | ✏️ | | ✏️ |
| `AppRouter.tsx` | | | ✏️ | |
| Migration `.sql` | | | 🆕 | 🆕 |

✏️ = editar, 🆕 = criar
