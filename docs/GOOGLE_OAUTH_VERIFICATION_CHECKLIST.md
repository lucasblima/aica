# Google OAuth Verification Checklist - AICA Life OS

Checklist completo para aprovacao OAuth do Google Cloud para o projeto AICA Life OS.

**Ultima atualizacao:** 2026-02-19
**Projeto:** AICA Life OS
**Ambiente:** Production (aica.guru) / Staging (dev.aica.guru)
**Scopes:** calendar.events (sensitive) + userinfo.email (non-sensitive)

---

## Sumario

1. [Domain Verification](#1-domain-verification)
2. [Required Pages](#2-required-pages)
3. [Privacy Policy Requirements](#3-privacy-policy-requirements)
4. [OAuth Consent Screen](#4-oauth-consent-screen)
5. [Scope Justification](#5-scope-justification)
6. [Demo Video Guide](#6-demo-video-guide)
7. [AICA-Specific Configuration](#7-aica-specific-configuration)
8. [Submission Checklist](#8-submission-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Domain Verification

### Pre-requisitos de Dominio

- [x] Dominio proprio registrado (aica.guru)
- [x] SSL/HTTPS configurado e valido
- [ ] Dominio verificado no Google Search Console
- [x] DNS propagado completamente

### Passos para Verificacao no Search Console

1. Acessar: https://search.google.com/search-console
2. Clicar em "Adicionar propriedade" > "Dominio"
3. Adicionar registro TXT no DNS:

```dns
Tipo: TXT
Nome: @ (raiz)
Valor: google-site-verification=CODIGO_FORNECIDO
TTL: 3600
```

4. Aguardar verificacao (ate 48h para propagacao DNS)
5. Confirmar status "Verificado" no Search Console

### Validacao

- [ ] Acessar https://search.google.com/search-console
- [ ] Confirmar que o dominio aparece como "Verificado"
- [x] Testar acesso HTTPS no dominio (sem erros de certificado)

---

## 2. Required Pages

### Paginas Obrigatorias

| Pagina | URL | Status |
|--------|-----|--------|
| Homepage | https://aica.guru | [x] Criada |
| Privacy Policy | https://aica.guru/privacy | [x] Criada |
| Terms of Service | https://aica.guru/terms | [x] Criada |

### Requisitos das Paginas

- [x] Homepage publica e acessivel (sem login necessario)
- [x] Privacy Policy no MESMO dominio da aplicacao
- [x] Terms of Service no MESMO dominio da aplicacao
- [x] Links funcionais entre todas as paginas
- [x] Navegacao clara para encontrar Privacy e Terms
- [x] Paginas respondem em menos de 3 segundos
- [x] Nenhuma pagina retorna erro 404 ou 500

### Conteudo Minimo

**Homepage:**
- [x] Nome do aplicativo
- [x] Descricao do proposito
- [x] Link para Privacy Policy no footer
- [x] Link para Terms of Service no footer

**Privacy Policy:**
- [x] Data de ultima atualizacao
- [x] Email de contato (contato@aica.guru)
- [x] Secao sobre Google APIs (Calendar + compliance)

**Terms of Service:**
- [x] Data de ultima atualizacao
- [x] Email de contato
- [x] Termos de uso claros

---

## 3. Privacy Policy Requirements

### Secoes Obrigatorias para OAuth

- [x] Secao especifica sobre integracao com Google Calendar
- [x] Lista de TODOS os escopos OAuth solicitados (calendar.events + userinfo.email)
- [x] Explicacao de USO para cada escopo
- [x] Como dados sao armazenados
- [x] Como dados sao compartilhados (ou que NAO sao compartilhados)
- [x] Instrucoes de como revogar acesso
- [x] Link para Google API Services User Data Policy

### Checklist de Conformidade

- [x] Privacy Policy menciona "Google Calendar" explicitamente
- [x] Cada escopo tem explicacao de uso
- [x] Instrucoes claras para revogacao
- [x] Link funcional para Google API Services User Data Policy
- [x] Data de atualizacao visivel
- [x] Email de contato valido (contato@aica.guru)

---

## 4. OAuth Consent Screen

### Configuracao no Google Cloud Console

Acessar: https://console.cloud.google.com/apis/credentials/consent

### Informacoes Basicas

- [ ] **App name**: AICA - Life OS
- [ ] **User support email**: contato@aica.guru
- [ ] **App logo**: PNG 120x120px (sem transparencia) — `public/assets/images/logo-aica-blue.png`
- [ ] **App homepage**: https://aica.guru
- [ ] **App privacy policy**: https://aica.guru/privacy
- [ ] **App terms of service**: https://aica.guru/terms

### Dominios Autorizados

- [ ] aica.guru

### Escopos Configurados

| Escopo | Tipo | Adicionado |
|--------|------|------------|
| `userinfo.email` | Non-sensitive | [ ] |
| `calendar.events` | Sensitive | [ ] |

> **IMPORTANTE**: Apenas estes 2 escopos devem ser submetidos.
> Gmail (gmail.modify) e Drive (drive) sao RESTRICTED e serao submetidos separadamente apos CASA assessment.

### Usuarios de Teste (Modo Testing)

- [ ] lucasboscacci@gmail.com adicionado como usuario de teste
- [ ] Documentar usuarios de teste para submissao

---

## 5. Scope Justification

### Escopos Submetidos

#### Escopo: `calendar.events` (Sensitive)

**Justificativa (EN — para o formulario Google):**

> AICA uses `calendar.events` to provide bidirectional calendar synchronization within the Agenda module. Users can view their Google Calendar events alongside their AICA tasks, and AICA creates calendar events from scheduled tasks and workout sessions to keep everything in sync. This bidirectional sync is the core value proposition of the Agenda module — users manage their life in AICA and see it reflected in Google Calendar automatically.
>
> Data accessed: event titles, descriptions, dates/times, attendees, and status. Events created by AICA are marked with extended properties for deduplication. OAuth tokens are stored per-user in a PostgreSQL database with Row Level Security (RLS). Users can disconnect at any time through the Google Hub page, which immediately revokes access and deletes stored tokens.

#### Escopo: `userinfo.email` (Non-sensitive)

**Justificativa (EN):**

> AICA uses `userinfo.email` to identify the user's Google account email address when they connect their Google services. This email is displayed in the app's Google Hub and profile settings to show which Google account is connected, allowing users to verify and manage their integrations.

### Escopos NAO Submetidos (futuros — CASA required)

| Escopo | Classificacao | Status |
|--------|---------------|--------|
| `gmail.modify` | Restricted | Codigo pronto, aguardando CASA |
| `drive` | Restricted | Codigo pronto, aguardando CASA |

Ver `GOOGLE_OAUTH_SUBMISSION_GUIDE.md` Secao 10 para detalhes.

---

## 6. Demo Video Guide

### Especificacoes Tecnicas

| Requisito | Valor |
|-----------|-------|
| Duracao | 3-4 minutos |
| Resolucao | Minimo 1080p (1920x1080) |
| Formato | MP4 (H.264) |
| Hospedagem | YouTube (Nao Listado) |
| Audio | Narracao clara em ingles |

### Estrutura do Video

#### [0:00 - 0:30] Intro

- Mostrar homepage https://aica.guru
- "This video demonstrates how AICA uses Google Calendar integration"
- Mostrar barra de endereco com o dominio

#### [0:30 - 1:30] Login + Calendar OAuth

1. Fazer login na plataforma (Google Sign-In)
2. **PAUSAR na consent screen** para mostrar:
   - Nome do app: "AICA - Life OS"
   - Escopos: calendar.events + userinfo.email
   - Link para Privacy Policy
   - Consent screen em ingles
3. Aceitar o consentimento
4. Mostrar login bem-sucedido

#### [1:30 - 2:30] Calendar em Uso

1. Navegar ate o modulo Agenda
2. Mostrar eventos do Google Calendar sincronizados
3. Criar tarefa com data — mostrar que aparece no Google Calendar
4. "AICA syncs tasks and calendar events bidirectionally"

#### [2:30 - 3:30] Privacidade + Revogacao

1. Mostrar Privacy Policy (https://aica.guru/privacy)
2. Desconectar Calendar no Google Hub
3. "Users can disconnect at any time"
4. Mostrar https://myaccount.google.com/permissions

#### [3:30 - 4:00] Encerramento

- "AICA uses the minimum necessary scope — calendar.events"
- "Users can disconnect at any time"
- Mostrar URL: https://aica.guru

### YouTube Metadata

**Titulo:** `AICA - Life OS | Google Calendar Integration OAuth Demo`

**Descricao:**
```
Demonstration of the OAuth flow for Google Calendar integration
in the AICA platform.

Website: https://aica.guru
Privacy Policy: https://aica.guru/privacy
Terms of Service: https://aica.guru/terms

Scopes requested:
- calendar.events (bidirectional calendar sync with task management)
- userinfo.email (user identification)

Visibility: UNLISTED
```

### Checklist do Video

- [ ] Video tem entre 3-4 minutos
- [ ] Resolucao minima 1080p
- [ ] Consent screen visivel e pausado
- [ ] Escopos claramente mostrados (calendar.events + userinfo.email)
- [ ] Demonstra uso REAL dos dados (eventos sincronizados)
- [ ] Mostra como revogar acesso
- [ ] Audio claro e audivel
- [ ] Hospedado no YouTube (Nao Listado)

---

## 7. AICA-Specific Configuration

### URLs do Ambiente

| Componente | URL |
|------------|-----|
| Production | https://aica.guru |
| Staging | https://dev.aica.guru |
| Supabase | https://uzywajqzbdbrfammshdg.supabase.co |
| GCP Project | gen-lang-client-0948335762 |

### Redirect URIs Autorizados

Configurar no Google Cloud Console > Credentials > OAuth 2.0 Client IDs:

```
# Producao
https://aica.guru/auth/callback

# Staging
https://dev.aica.guru/auth/callback
```

### Arquivos Relevantes

| Arquivo | Descricao |
|---------|-----------|
| `src/services/googleAuthService.ts` | Servico principal de autenticacao Google + feature flag |
| `src/hooks/useGoogleAuth.ts` | Hook React para autenticacao |
| `src/services/googleCalendarService.ts` | Servico de sincronizacao Calendar |
| `supabase/functions/google-token-manager/` | Edge Function para gerenciamento de tokens |
| `src/views/AgendaView.tsx` | View que usa a integracao Calendar |

### Escopos Atualmente Configurados

Em `src/services/googleAuthService.ts`:

```typescript
// Escopos submetidos para verificacao
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',  // Bidirectional calendar sync
  'https://www.googleapis.com/auth/userinfo.email',    // User identification
];

// Feature flag para escopos restricted (futuros)
// FEATURE_GOOGLE_EXTENDED_SCOPES — gmail.modify + drive
// Ativacao apos CASA assessment
```

---

## 8. Submission Checklist

### Dados para Formulario de Verificacao

```yaml
App Information:
  App name: AICA - Life OS
  User support email: contato@aica.guru
  App logo: public/assets/images/logo-aica-blue.png

App Domain:
  Homepage: https://aica.guru
  Privacy Policy: https://aica.guru/privacy
  Terms of Service: https://aica.guru/terms

Authorized Domains:
  - aica.guru

Scopes:
  Non-sensitive:
    - userinfo.email
  Sensitive:
    - calendar.events

Sensitive Scope Justification:
  calendar.events: |
    AICA uses calendar.events for bidirectional synchronization.
    Users view Google Calendar events in the Agenda module and
    AICA creates events from scheduled tasks and workout sessions.
    Events are tagged with extended properties for deduplication.
    Tokens stored with RLS, revocable at any time.

Demo Video:
  URL: https://youtu.be/[VIDEO_ID]
  Duration: 3-4 minutes
  Language: English
  Title: "AICA - Life OS | Google Calendar Integration OAuth Demo"

Test Credentials:
  Email: lucasboscacci@gmail.com
  Login: Via Google OAuth (botao "Entrar com Google")
  Instructions: |
    1. Go to https://aica.guru
    2. Click "Entrar com Google"
    3. Login with provided Google account
    4. Calendar integration is pre-connected with real data
```

### Checklist Final

#### Infraestrutura

- [x] Dominio proprio configurado e funcionando (aica.guru)
- [x] SSL valido (sem erros de certificado)
- [ ] Dominio verificado no Google Search Console
- [x] DNS completamente propagado

#### Codigo

- [x] Apenas escopos realmente utilizados (calendar.events + userinfo.email)
- [x] Sem escopos redundantes
- [x] Tratamento de erros OAuth implementado
- [x] Revogacao de tokens funcionando
- [x] Tokens armazenados de forma segura (Supabase + RLS)

#### Documentacao

- [x] Privacy Policy com secao Google Calendar
- [x] Todos escopos documentados na Privacy Policy
- [x] Data de atualizacao visivel
- [x] Email de contato correto e funcional (contato@aica.guru)
- [x] Terms of Service atualizado

#### OAuth Consent Screen

- [ ] Nome do app: AICA - Life OS
- [ ] Logo configurado (logo-aica-blue.png)
- [ ] Homepage URL: https://aica.guru
- [ ] Privacy Policy URL: https://aica.guru/privacy
- [ ] Terms of Service URL: https://aica.guru/terms
- [ ] Support email: contato@aica.guru
- [ ] Authorized domains: aica.guru
- [ ] Scopes: calendar.events + userinfo.email

#### Video

- [ ] Duracao entre 3-4 minutos
- [ ] Resolucao minima 1080p
- [ ] Mostra consent screen com pausa
- [ ] Demonstra uso real dos dados
- [ ] Mostra como revogar acesso
- [ ] Hospedado no YouTube (Nao Listado)

#### Justificativas

- [x] Justificativa para calendar.events (sensitive)
- [x] userinfo.email nao requer justificativa (non-sensitive)
- [x] Demonstram necessidade real (bidirectional sync)
- [x] Mencionam conformidade com Google policies

#### Email

- [x] Codigo unificado com contato@aica.guru
- [ ] Email funcional configurado (Hostinger forwarding)

---

## 9. Troubleshooting

### Problemas Comuns de Rejeicao

#### "Domain not verified"

**Causa:** Dominio nao verificado no Google Search Console.

**Solucao:**
1. Acessar Google Search Console
2. Adicionar registro TXT de verificacao para aica.guru
3. Aguardar propagacao DNS (ate 48h)
4. Confirmar verificacao no Search Console

#### "Privacy policy doesn't disclose data usage"

**Causa:** Privacy Policy incompleta ou sem secao sobre Google APIs.

**Solucao:**
1. Verificar secao sobre Google Calendar em https://aica.guru/privacy
2. Confirmar que calendar.events esta documentado
3. Verificar instrucoes de revogacao
4. Verificar link para Google API Services User Data Policy

#### "Scopes not justified"

**Causa:** Escopos solicitados que nao sao demonstrados no uso real.

**Solucao:**
1. Demonstrar uso REAL de calendar.events no video (criar tarefa → sync)
2. Escrever justificativa detalhada (ver Secao 5)
3. Verificar que codigo realmente usa calendar.events para write

#### "Video doesn't show consent screen"

**Causa:** Video nao mostra claramente a tela de consentimento.

**Solucao:**
1. Gravar novo video com pausa na consent screen
2. Garantir que calendar.events e userinfo.email sao visiveis
3. Usar resolucao alta (1080p minimo)
4. Narrar quais permissoes estao sendo solicitadas

#### "Application homepage not accessible"

**Causa:** Homepage requer login ou esta com erro.

**Solucao:**
1. Verificar https://aica.guru carrega sem login
2. Testar em navegador anonimo
3. Verificar que pagina carrega em menos de 3 segundos

---

## Links Uteis

### Documentacao Oficial

- [Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
- [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)

### Ferramentas

- [Google Cloud Console](https://console.cloud.google.com)
- [Google Search Console](https://search.google.com/search-console)
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [OAuth Playground](https://developers.google.com/oauthplayground)

### Escopos por API

- [Calendar API Scopes](https://developers.google.com/calendar/api/auth)

---

## Historico de Versoes

| Data | Versao | Alteracoes |
|------|--------|------------|
| 2026-01-16 | 1.0 | Versao inicial do checklist |
| 2026-02-19 | 2.0 | Atualizado para sensitive-only (calendar.events + userinfo.email). Removidos gmail.modify e drive (restricted — CASA required). URLs atualizadas para aica.guru. |

---

**Maintainers:** Lucas Boscacci Lima + Claude Opus 4.6
