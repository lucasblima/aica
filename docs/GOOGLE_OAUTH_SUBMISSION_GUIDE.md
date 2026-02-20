# Guia de Submissao OAuth - Google Cloud Verification

**Projeto:** AICA - Life OS
**Tipo:** Sensitive Scope Verification
**Data de preparacao:** 17 de fevereiro de 2026

---

## 1. Valores para o Formulario de Verificacao

### App Identity (copiar e colar)

| Campo | Valor |
|-------|-------|
| **App name** | AICA - Life OS |
| **App type** | Web Application |
| **User type** | External |
| **Support email** | contato@aica.guru |
| **Developer contact email** | contato@aica.guru |
| **Homepage URL** | https://aica.guru |
| **Privacy Policy URL** | https://aica.guru/privacy |
| **Terms of Service URL** | https://aica.guru/terms |
| **Authorized domains** | aica.guru |
| **Logo** | `public/assets/images/logo-aica-blue.png` |

---

## 2. Justificativas de Escopo (Scope Justifications)

### Escopo 1: `https://www.googleapis.com/auth/calendar.events`

**Classificacao:** Sensitive

**Justificativa (EN — para o formulario Google):**

> AICA uses `calendar.events` to provide bidirectional calendar synchronization within the Agenda module. Users can view their Google Calendar events alongside their AICA tasks, and AICA creates calendar events from scheduled tasks and workout sessions to keep everything in sync. This bidirectional sync is the core value proposition of the Agenda module — users manage their life in AICA and see it reflected in Google Calendar automatically.
>
> Data accessed: event titles, descriptions, dates/times, attendees, and status. Events created by AICA are marked with extended properties for deduplication. OAuth tokens are stored per-user in a PostgreSQL database with Row Level Security (RLS). Users can disconnect at any time through the Google Hub page, which immediately revokes access and deletes stored tokens.

**Justificativa (PT — referencia):**

> A AICA usa `calendar.events` para sincronizacao bidirecional no modulo Agenda. Usuarios veem eventos do Google Calendar junto com tarefas AICA, e a AICA cria eventos a partir de tarefas e treinos agendados. Tokens armazenados por usuario com RLS, revogaveis a qualquer momento.

---

### Escopo 2: `https://www.googleapis.com/auth/userinfo.email`

**Classificacao:** Non-sensitive (nao requer justificativa, mas incluir por completude)

**Justificativa (EN):**

> AICA uses `userinfo.email` to identify the user's Google account email address when they connect their Google services. This email is displayed in the app's Google Hub and profile settings to show which Google account is connected, allowing users to verify and manage their integrations.

---

## 3. Descricao do App (App Description)

**EN (para o formulario):**

> AICA (Life OS) is a personal life management platform that helps Brazilian users organize their tasks, calendar, finances, personal growth, and professional projects in one place. AICA integrates with Google Calendar to provide bidirectional event synchronization with its task management system — users manage their life in AICA and see it reflected in Google Calendar automatically. The integration uses the minimum necessary scope (calendar.events) and users can disconnect at any time.

**PT (referencia):**

> AICA (Life OS) e uma plataforma de gestao de vida pessoal para brasileiros. Integra com Google Calendar para sincronizacao bidirecional de eventos com o sistema de gerenciamento de tarefas — usuarios gerenciam sua vida na AICA e veem refletido no Google Calendar automaticamente. A integracao usa o escopo minimo necessario (calendar.events) e usuarios podem desconectar a qualquer momento.

---

## 4. Como os Escopos Serao Usados (How Will Scopes Be Used)

Esta secao responde diretamente a pergunta do formulario Google.

### calendar.events
**Used for:** Bidirectional synchronization between AICA's task management system and the user's Google Calendar. AICA reads calendar events to display them in the Agenda module alongside tasks. AICA writes calendar events when the user creates scheduled tasks or workout sessions, so these appear on their Google Calendar. Events created by AICA are tagged with extended properties to prevent duplication during sync.

### userinfo.email
**Used for:** Identifying the connected Google account. The email is shown in the app's settings and Google Hub so users know which account is linked.

---

## 5. Credenciais de Teste

### Conta de Teste

A AICA usa exclusivamente Google OAuth para login. O reviewer usara a conta Google do desenvolvedor:

| Campo | Valor |
|-------|-------|
| **Email** | lucasboscacci@gmail.com |
| **Login** | Via Google OAuth (botao "Entrar com Google") |
| **Nota** | Conta do desenvolvedor com dados reais populados |

### Dados que o Reviewer Vera

A conta ja contem dados reais:

- Tarefas no Atlas (modulo de tarefas)
- Momentos no Journey (modulo de autoconhecimento)
- Google Calendar conectado com eventos reais

### Preparacao Pre-Submissao

1. Acessar https://aica.guru e logar com `lucasboscacci@gmail.com`
2. Verificar que Calendar esta conectado no Google Hub
3. Verificar que dados aparecem corretamente na secao Calendar
4. Se o escopo estiver desconectado, reconectar via Google Hub

---

## 6. Video de Demonstracao (Roteiro)

### Requisitos Tecnicos

| Requisito | Valor |
|-----------|-------|
| **Resolucao** | 1080p ou superior |
| **Duracao** | 3-4 minutos |
| **Ferramenta** | OBS Studio ou Loom |
| **Upload** | YouTube como "Nao listado" |
| **Idioma** | Ingles (narrado ou com legendas) |

### Roteiro Detalhado

**[0:00 - 0:30] Intro**
- Mostrar homepage https://aica.guru
- "This video demonstrates how AICA uses Google Calendar integration"
- Mostrar barra de endereco com o dominio

**[0:30 - 1:30] Login + Calendar OAuth**
- Fazer login na plataforma (Google Sign-In)
- **IMPORTANTE**: Pausar na consent screen do Google para mostrar:
  - Nome do app: "AICA - Life OS"
  - Escopos solicitados (calendar.events, userinfo.email)
  - Link para Privacy Policy
  - Consent screen em ingles
- Aceitar o consentimento
- Mostrar que o login foi bem-sucedido

**[1:30 - 2:30] Calendar em uso**
- Navegar ate o modulo Agenda
- Mostrar eventos do Google Calendar sincronizados na timeline
- Criar uma tarefa com data — mostrar que aparece no Google Calendar (sync bidirecional)
- "AICA syncs tasks and calendar events bidirectionally"

**[2:30 - 3:30] Privacidade + Revogacao**
- Mostrar a Privacy Policy (https://aica.guru/privacy)
- Scroll ate secoes relevantes (Calendar, Google Compliance)
- Voltar ao Google Hub
- Desconectar Calendar (clicar no botao de desconectar)
- "Users can disconnect Calendar at any time"
- Navegar ate https://myaccount.google.com/permissions para mostrar revogacao externa

**[3:30 - 4:00] Encerramento**
- "AICA uses the minimum necessary scope — calendar.events — for bidirectional sync"
- "Users can disconnect at any time through the app or via Google Account settings"
- Mostrar link: https://myaccount.google.com/permissions
- Mostrar URL: https://aica.guru

### Titulo do YouTube

```
AICA - Life OS | Google Calendar Integration OAuth Demo
```

### Descricao do YouTube

```
Demonstration of the OAuth flow for Google Calendar integration
in the AICA platform.

Website: https://aica.guru
Privacy Policy: https://aica.guru/privacy
Terms of Service: https://aica.guru/terms

Scopes requested:
- calendar.events (bidirectional calendar sync with task management)
- userinfo.email (user identification)

AICA uses the minimum necessary scope for Calendar integration.
Users can disconnect at any time.

Visibility: UNLISTED
```

---

## 7. Checklist Pre-Submissao Final

### Infraestrutura
- [x] Dominio proprio configurado (aica.guru)
- [x] SSL/HTTPS funcionando
- [ ] Dominio verificado no Google Search Console (DNS TXT record)

### Codigo
- [x] Escopos OAuth corretos (calendar.events + userinfo.email)
- [x] Tratamento de erros OAuth implementado
- [x] Disconnect implementado
- [x] Google Hub com secao Calendar

### Paginas Publicas
- [x] Homepage acessivel: https://aica.guru
- [x] Privacy Policy atualizada: https://aica.guru/privacy
- [x] Terms of Service atualizado: https://aica.guru/terms

### Privacy Policy
- [x] Secao 5: Google Calendar API (calendar.events)
- [x] Secao 8: Conformidade Google (Limited Use)
- [x] Link para Google API Services User Data Policy
- [x] Data de atualizacao
- [x] Email de contato correto (contato@aica.guru)

### OAuth Consent Screen (Google Cloud Console)
- [ ] Nome: AICA - Life OS
- [ ] Logo configurado (logo-aica-blue.png)
- [ ] Homepage URL: https://aica.guru
- [ ] Privacy Policy URL: https://aica.guru/privacy
- [ ] Terms of Service URL: https://aica.guru/terms
- [ ] Support email: contato@aica.guru
- [ ] Authorized domains: aica.guru
- [ ] Scopes: calendar.events, userinfo.email

### Email
- [x] Codigo unificado com contato@aica.guru
- [ ] Email funcional configurado (Hostinger forwarding)

### Video de Demonstracao
- [ ] Video gravado seguindo roteiro (Calendar only, 3-4 min)
- [ ] Upload no YouTube como "Nao listado"
- [ ] Consent screen claramente visivel mostrando calendar.events + userinfo.email
- [ ] Barra de endereco visivel com dominio
- [ ] Demonstracao de revogacao

### Credenciais de Teste
- [ ] Conta lucasboscacci@gmail.com logada na AICA com dados populados
- [ ] Google Calendar conectado e visivel no Google Hub

---

## 8. Passo a Passo da Submissao

### No Google Cloud Console

1. Acessar https://console.cloud.google.com/apis/credentials/consent
2. Selecionar projeto `gen-lang-client-0948335762`
3. Ir para "OAuth consent screen"
4. Verificar todos os campos (secao 1 deste doc)
5. Ir para "Scopes" → verificar que calendar.events e userinfo.email estao listados
6. Clicar em "Prepare for verification"
7. Preencher:
   - Scope justifications (secao 2 deste doc)
   - "How will scopes be used?" (secao 4 deste doc)
   - App description (secao 3 deste doc)
   - Video URL (YouTube unlisted)
   - Test account: lucasboscacci@gmail.com (login via Google OAuth)
8. Submeter

### Tempo de Revisao Esperado

- **3-5 dias uteis** para escopos sensitive
- Google pode pedir ajustes — manter email monitorado
- Se aprovado, o app sai do modo "Testing" para "In production"

---

## 9. Respostas para Perguntas Frequentes do Google

### "Why does your app need calendar.events (write access)?"

> AICA needs calendar.events for bidirectional synchronization. When users create tasks with deadlines or schedule workout sessions in AICA, these are automatically synced to their Google Calendar so they see everything in one place. Events created by AICA are tagged with extended properties to prevent duplication. Users can also view their Google Calendar events within AICA's Agenda module.

### "Why not use narrower scopes?"

> `calendar.events` is the narrowest available scope for its use case. AICA creates events (not just reads them), so `calendar.readonly` would not support the bidirectional sync feature. `userinfo.email` is non-sensitive and only used for identifying the connected account.

### "How is user data stored?"

> OAuth tokens are stored in a PostgreSQL database (Supabase) with Row Level Security (RLS) policies. Each user can only access their own tokens. Calendar event data is fetched on-demand and not permanently stored. Users can disconnect the service at any time, which immediately removes stored tokens.

### "How can users revoke access?"

> Users can disconnect Google Calendar through AICA's Google Hub page using the disconnect button. Disconnecting: (1) removes the scope from the user's token record, (2) prevents AICA from accessing Calendar until the user reconnects. Users can also revoke all access via Google's security settings at https://myaccount.google.com/permissions.

### "Why not Gmail and Drive integration?"

> We plan to add Gmail and Drive integration in a future update. These require restricted scopes and CASA security assessment, which we will pursue as our user base grows. All integration code is already built and will be activated once CASA certification is obtained.

---

## 10. Future Expansion — Restricted Scopes

### Overview

Gmail (`gmail.modify`) and Drive (`drive`) scopes are classified as **RESTRICTED** by Google. Restricted scopes require a CASA (Cloud Application Security Assessment) tier 2 audit, which involves:

- **Cost:** $500-4500/year depending on assessor and app complexity
- **Timeline:** 4-8 weeks for initial assessment
- **Renewal:** Annual re-assessment required

AICA has all code built and ready to activate these integrations. They are gated behind a feature flag (`FEATURE_GOOGLE_EXTENDED_SCOPES` in `googleAuthService.ts`) and will be submitted for verification separately once the CASA assessment is completed.

### Escopo Futuro: `https://www.googleapis.com/auth/gmail.modify`

**Classificacao:** Restricted (CASA Required)

**Justificativa (EN — preparada para futura submissao):**

> AICA uses `gmail.modify` to provide inbox management within the Google Hub module. Users can view their email inbox, and organize messages by archiving, trashing, and toggling read/unread status — all without leaving the platform. AICA accesses email metadata (subject, sender, date, labels, read status) and a short text snippet. It does NOT send emails on behalf of the user or access full email bodies or attachments.
>
> The `gmail.modify` scope is the narrowest scope that supports both reading and organizing messages. `gmail.readonly` would not allow users to archive, trash, or change label/read status. Email metadata is cached temporarily (7-day retention with automatic cleanup) in a PostgreSQL database with Row Level Security. The Gmail integration requires separate incremental consent — it is not requested during initial login. Users can disconnect Gmail independently without affecting Calendar access.

**How it will be used:**

> Inbox management in AICA's Google Hub module. Users can see their recent emails (subject, sender, date), search their inbox, and organize messages by archiving, trashing, and toggling read/unread status — without switching to Gmail. AICA never sends emails on behalf of the user. Only metadata and short snippets are read; full email bodies and attachments are not accessed.

### Escopo Futuro: `https://www.googleapis.com/auth/drive`

**Classificacao:** Restricted (CASA Required)

**Justificativa (EN — preparada para futura submissao):**

> AICA uses `drive` to provide file management within the Google Hub module. Users can browse and search their Google Drive files, and organize them by renaming, moving to folders, creating folders, and trashing files — all without leaving the platform. AICA accesses file metadata (names, types, sizes, modification dates) and can extract text content from Google Workspace documents (Docs, Sheets, Slides) for quick reference, limited to 100KB per file. AICA does NOT permanently delete files — trashed files can be recovered from Drive's trash.
>
> The `drive` scope is needed because `drive.readonly` does not allow organizational actions (rename, move, trash, create folder). File metadata is cached temporarily (7-day retention with automatic cleanup) in a PostgreSQL database with Row Level Security. The Drive integration requires separate incremental consent — it is not requested during initial login. Users can disconnect Drive independently without affecting Calendar access.

**How it will be used:**

> File management in AICA's Google Hub module. Users can browse and search their Google Drive files, and organize them by renaming, moving to folders, creating new folders, and trashing files — without leaving the platform. For Google Workspace documents, AICA can extract text content (up to 100KB) for quick reference. Trashed files can be recovered from Drive's trash; AICA never permanently deletes files.

### FAQ Preparadas para Submissao Futura

**"Why does your app need gmail.modify?"**

> AICA uses gmail.modify to provide inbox management within the Google Hub module. Users can view their emails, and organize messages by archiving, trashing, and toggling read/unread status — all without leaving the platform. AICA only accesses metadata (subject, sender, date, labels) and a short snippet — not full email bodies or attachments. AICA never sends emails on behalf of the user. `gmail.modify` is the narrowest scope that supports both reading and organizing messages.

**"Why does your app need the drive scope?"**

> AICA uses the `drive` scope to provide file management within the Google Hub module. Users can browse and search their Drive files, and organize them by renaming, moving to folders, creating new folders, and trashing files — all without leaving the platform. For Google Workspace documents, AICA extracts text content (limited to 100KB) for quick reference. AICA never permanently deletes files — trashed files can be recovered. The `drive` scope is needed because `drive.readonly` does not allow organizational actions.

### Activation Plan

1. Complete CASA security assessment ($500-4500)
2. Enable `FEATURE_GOOGLE_EXTENDED_SCOPES` feature flag
3. Submit separate OAuth verification for gmail.modify + drive
4. Record expanded demo video (Calendar + Gmail + Drive)
5. Update Privacy Policy sections 6 (Gmail) and 7 (Drive) to active status

---

*Documento preparado: 17/02/2026 | Atualizado: 19/02/2026 (scopes reduzidos para sensitive-only: calendar.events + userinfo.email)*
*Referencia: Issues #256, #271, #274, #275*
*Escopos restricted (gmail.modify, drive) movidos para Secao 10 — Future Expansion*
