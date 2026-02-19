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

### Escopo 2: `https://www.googleapis.com/auth/gmail.modify`

**Classificacao:** Sensitive

**Justificativa (EN — para o formulario Google):**

> AICA uses `gmail.modify` to provide inbox management within the Google Hub module. Users can view their email inbox, and organize messages by archiving, trashing, and toggling read/unread status — all without leaving the platform. AICA accesses email metadata (subject, sender, date, labels, read status) and a short text snippet. It does NOT send emails on behalf of the user or access full email bodies or attachments.
>
> The `gmail.modify` scope is the narrowest scope that supports both reading and organizing messages. `gmail.readonly` would not allow users to archive, trash, or change label/read status. Email metadata is cached temporarily (7-day retention with automatic cleanup) in a PostgreSQL database with Row Level Security. The Gmail integration requires separate incremental consent — it is not requested during initial login. Users can disconnect Gmail independently without affecting Calendar or Drive access.

**Justificativa (PT — referencia):**

> A AICA usa `gmail.modify` para gerenciamento da caixa de entrada no modulo Google Hub. Usuarios visualizam emails e organizam mensagens (arquivar, lixeira, marcar lido/nao-lido) sem sair da plataforma. Acessa metadados (assunto, remetente, data, labels). NAO envia emails ou acessa conteudo completo/anexos. `gmail.modify` e o escopo mais restrito que permite leitura + organizacao. Cache temporario de 7 dias. Consentimento incremental separado, desconectavel independentemente.

---

### Escopo 3: `https://www.googleapis.com/auth/drive`

**Classificacao:** Sensitive

**Justificativa (EN — para o formulario Google):**

> AICA uses `drive` to provide file management within the Google Hub module. Users can browse and search their Google Drive files, and organize them by renaming, moving to folders, creating folders, and trashing files — all without leaving the platform. AICA accesses file metadata (names, types, sizes, modification dates) and can extract text content from Google Workspace documents (Docs, Sheets, Slides) for quick reference, limited to 100KB per file. AICA does NOT permanently delete files — trashed files can be recovered from Drive's trash.
>
> The `drive` scope is needed because `drive.readonly` does not allow organizational actions (rename, move, trash, create folder). File metadata is cached temporarily (7-day retention with automatic cleanup) in a PostgreSQL database with Row Level Security. The Drive integration requires separate incremental consent — it is not requested during initial login. Users can disconnect Drive independently without affecting Calendar or Gmail access.

**Justificativa (PT — referencia):**

> A AICA usa `drive` para gerenciamento de arquivos no Google Hub. Usuarios navegam, buscam e organizam arquivos (renomear, mover, criar pastas, enviar para lixeira) sem sair da plataforma. Acessa metadados e conteudo textual de documentos Workspace (limitado a 100KB). NAO exclui arquivos permanentemente. `drive` e necessario porque `drive.readonly` nao permite acoes organizacionais. Cache temporario de 7 dias. Consentimento incremental separado, desconectavel independentemente.

---

### Escopo 4: `https://www.googleapis.com/auth/userinfo.email`

**Classificacao:** Non-sensitive (nao requer justificativa, mas incluir por completude)

**Justificativa (EN):**

> AICA uses `userinfo.email` to identify the user's Google account email address when they connect their Google services. This email is displayed in the app's Google Hub and profile settings to show which Google account is connected, allowing users to verify and manage their integrations.

---

## 3. Descricao do App (App Description)

**EN (para o formulario):**

> AICA (Life OS) is a personal life management platform that helps Brazilian users organize their tasks, calendar, finances, personal growth, and professional projects in one place. AICA integrates with Google services to enhance productivity: Google Calendar for bidirectional event sync with task management, Gmail for inbox management (view, archive, trash, mark read/unread) without app-switching, and Google Drive for file management (browse, rename, move, create folders, trash) without leaving the platform. Each integration uses the minimum necessary scope and requires separate user consent. Users can connect and disconnect each service independently through the Google Hub module.

**PT (referencia):**

> AICA (Life OS) e uma plataforma de gestao de vida pessoal para brasileiros. Integra com servicos Google: Calendar para sincronizacao bidirecional de eventos, Gmail para gerenciamento da caixa de entrada (visualizar, arquivar, lixeira, marcar lido/nao-lido), e Drive para gerenciamento de arquivos (navegar, renomear, mover, criar pastas, lixeira). Cada integracao usa escopo minimo e requer consentimento separado. Usuarios conectam e desconectam cada servico independentemente.

---

## 4. Como os Escopos Serao Usados (How Will Scopes Be Used)

Esta secao responde diretamente a pergunta do formulario Google.

### calendar.events
**Used for:** Bidirectional synchronization between AICA's task management system and the user's Google Calendar. AICA reads calendar events to display them in the Agenda module alongside tasks. AICA writes calendar events when the user creates scheduled tasks or workout sessions, so these appear on their Google Calendar. Events created by AICA are tagged with extended properties to prevent duplication during sync.

### gmail.modify
**Used for:** Inbox management in AICA's Google Hub module. Users can see their recent emails (subject, sender, date), search their inbox, and organize messages by archiving, trashing, and toggling read/unread status — without switching to Gmail. AICA never sends emails on behalf of the user. Only metadata and short snippets are read; full email bodies and attachments are not accessed.

### drive
**Used for:** File management in AICA's Google Hub module. Users can browse and search their Google Drive files, and organize them by renaming, moving to folders, creating new folders, and trashing files — without leaving the platform. For Google Workspace documents, AICA can extract text content (up to 100KB) for quick reference. Trashed files can be recovered from Drive's trash; AICA never permanently deletes files.

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
- Gmail conectado com emails visiveis no Google Hub
- Drive conectado com arquivos visiveis no Google Hub

### Preparacao Pre-Submissao

1. Acessar https://aica.guru e logar com `lucasboscacci@gmail.com`
2. Verificar que Calendar, Gmail e Drive estao conectados no Google Hub
3. Verificar que dados aparecem corretamente em cada secao
4. Se algum escopo estiver desconectado, reconectar via Google Hub

---

## 6. Video de Demonstracao (Roteiro)

### Requisitos Tecnicos

| Requisito | Valor |
|-----------|-------|
| **Resolucao** | 1080p ou superior |
| **Duracao** | 5-7 minutos |
| **Ferramenta** | OBS Studio ou Loom |
| **Upload** | YouTube como "Nao listado" |
| **Idioma** | Ingles (narrado ou com legendas) |

### Roteiro Detalhado

**[0:00 - 0:30] Intro**
- Mostrar homepage https://aica.guru
- "This video demonstrates how AICA uses Google Calendar, Gmail, and Drive integrations"
- Mostrar barra de endereco com o dominio

**[0:30 - 1:30] Login + Calendar OAuth**
- Fazer login na plataforma (Google Sign-In)
- **IMPORTANTE**: Pausar na consent screen do Google para mostrar:
  - Nome do app: "AICA - Life OS"
  - Escopos solicitados (calendar.events, email)
  - Link para Privacy Policy
- Aceitar o consentimento
- Mostrar que o login foi bem-sucedido

**[1:30 - 2:30] Calendar em uso**
- Navegar ate o modulo Agenda
- Mostrar eventos do Google Calendar sincronizados na timeline
- Criar uma tarefa com data — mostrar que aparece no Google Calendar (sync bidirecional)
- "AICA syncs tasks and calendar events bidirectionally"

**[2:30 - 3:30] Gmail — Consentimento Incremental**
- Navegar ate o Google Hub (/google-hub)
- Mostrar que Gmail esta "Nao conectado"
- Clicar em "Conectar Gmail"
- **IMPORTANTE**: Pausar na consent screen para mostrar gmail.modify
- Aceitar o consentimento
- Mostrar emails aparecendo na secao Gmail
- Demonstrar busca de emails
- "AICA lets users organize their inbox — archive, trash, mark read/unread — but never sends emails"

**[3:30 - 4:30] Drive — Consentimento Incremental**
- No Google Hub, mostrar que Drive esta "Nao conectado"
- Clicar em "Conectar Drive"
- **IMPORTANTE**: Pausar na consent screen para mostrar drive
- Aceitar o consentimento
- Mostrar arquivos aparecendo na secao Drive
- Demonstrar busca de arquivos e acoes organizacionais (renomear, mover, criar pasta)
- "AICA lets users organize their Drive — rename, move, create folders, trash — but never permanently deletes files"

**[4:30 - 5:30] Privacidade + Revogacao**
- Mostrar a Privacy Policy (https://aica.guru/privacy)
- Scroll ate secoes 5 (Calendar), 6 (Gmail), 7 (Drive), 8 (Google Compliance)
- Voltar ao Google Hub
- Desconectar Gmail (clicar no icone de desconectar na secao Gmail)
- Desconectar Drive (clicar no icone de desconectar na secao Drive)
- Desconectar Calendar (clicar no botao de desconectar na secao Calendar)
- "Users can disconnect each service independently at any time"

**[5:30 - 6:00] Profile — Integrações**
- Abrir perfil (Profile Drawer)
- Mostrar secao "Google" com status de cada servico
- Mostrar que tudo esta desconectado apos a revogacao
- Mostrar link para Google Account permissions

**[6:00 - 6:30] Encerramento**
- "AICA uses the minimum necessary scopes for each Google service"
- "Each integration requires separate consent and can be revoked independently"
- "Users can also revoke access at https://myaccount.google.com/permissions"
- Mostrar URL: https://aica.guru

### Titulo do YouTube

```
AICA - Life OS | Google Calendar, Gmail & Drive Integration OAuth Demo
```

### Descricao do YouTube

```
Demonstration of the OAuth flows for Google Calendar, Gmail, and Drive
integration in the AICA platform.

Website: https://aica.guru
Privacy Policy: https://aica.guru/privacy
Terms of Service: https://aica.guru/terms

Scopes requested:
- calendar.events (bidirectional calendar sync with task management)
- gmail.modify (inbox management — read, archive, trash, mark read/unread)
- drive (file management — browse, rename, move, create folders, trash)
- userinfo.email (user identification)

AICA uses incremental consent: Calendar scope is requested at login,
Gmail and Drive scopes are requested separately only when the user
chooses to connect those services.

Each service can be disconnected independently at any time.

Visibility: UNLISTED
```

---

## 7. Checklist Pre-Submissao Final

### Infraestrutura
- [x] Dominio proprio configurado (aica.guru)
- [x] SSL/HTTPS funcionando
- [ ] Dominio verificado no Google Search Console (DNS TXT record)

### Codigo
- [x] Escopos OAuth corretos (calendar.events + gmail.modify + drive + userinfo.email)
- [x] Consentimento incremental implementado (Gmail/Drive separados do Calendar)
- [x] Tratamento de erros OAuth implementado
- [x] Disconnect por escopo implementado
- [x] Google Hub com secoes Calendar, Gmail, Drive

### Paginas Publicas
- [x] Homepage acessivel: https://aica.guru
- [x] Privacy Policy atualizada: https://aica.guru/privacy (17 secoes)
- [x] Terms of Service atualizado: https://aica.guru/terms

### Privacy Policy
- [x] Secao 5: Google Calendar API (calendar.events)
- [x] Secao 6: Gmail API (gmail.modify)
- [x] Secao 7: Google Drive API (drive)
- [x] Secao 8: Conformidade Google (Limited Use)
- [x] Link para Google API Services User Data Policy
- [x] Data de atualizacao (17/02/2026)
- [x] Email de contato correto (contato@aica.guru)

### OAuth Consent Screen (Google Cloud Console)
- [ ] Nome: AICA - Life OS
- [ ] Logo configurado (logo-aica-blue.png)
- [ ] Homepage URL: https://aica.guru
- [ ] Privacy Policy URL: https://aica.guru/privacy
- [ ] Terms of Service URL: https://aica.guru/terms
- [ ] Support email: contato@aica.guru
- [ ] Authorized domains: aica.guru
- [ ] Scopes: calendar.events, gmail.modify, drive, userinfo.email

### Email
- [x] Codigo unificado com contato@aica.guru
- [ ] Email funcional configurado (Hostinger forwarding)

### Video de Demonstracao
- [ ] Video gravado seguindo roteiro expandido (Calendar + Gmail + Drive)
- [ ] Upload no YouTube como "Nao listado"
- [ ] Consent screen claramente visivel para CADA escopo
- [ ] Barra de endereco visivel com dominio
- [ ] Demonstracao de revogacao por escopo

### Credenciais de Teste
- [ ] Conta lucasboscacci@gmail.com logada na AICA com dados populados
- [ ] Google Calendar conectado e visivel no Google Hub
- [ ] Gmail conectado e visivel no Google Hub
- [ ] Drive conectado e visivel no Google Hub

---

## 8. Passo a Passo da Submissao

### No Google Cloud Console

1. Acessar https://console.cloud.google.com/apis/credentials/consent
2. Selecionar projeto `gen-lang-client-0948335762`
3. Ir para "OAuth consent screen"
4. Verificar todos os campos (secao 1 deste doc)
5. Ir para "Scopes" → verificar que calendar.events, gmail.modify, drive e userinfo.email estao listados
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

### "Why does your app need gmail.modify?"

> AICA uses gmail.modify to provide inbox management within the Google Hub module. Users can view their emails, and organize messages by archiving, trashing, and toggling read/unread status — all without leaving the platform. AICA only accesses metadata (subject, sender, date, labels) and a short snippet — not full email bodies or attachments. AICA never sends emails on behalf of the user. `gmail.modify` is the narrowest scope that supports both reading and organizing messages.

### "Why does your app need the drive scope?"

> AICA uses the `drive` scope to provide file management within the Google Hub module. Users can browse and search their Drive files, and organize them by renaming, moving to folders, creating new folders, and trashing files — all without leaving the platform. For Google Workspace documents, AICA extracts text content (limited to 100KB) for quick reference. AICA never permanently deletes files — trashed files can be recovered. The `drive` scope is needed because `drive.readonly` does not allow organizational actions.

### "Why not use narrower scopes?"

> Each scope requested is the narrowest available for its use case:
> - `calendar.events` is needed because AICA creates events (not just reads them). `calendar.readonly` would not support the bidirectional sync feature.
> - `gmail.modify` is the narrowest Gmail scope that supports both reading and organizing messages (archive, trash, mark read/unread). `gmail.readonly` would not allow inbox management.
> - `drive` is the narrowest Drive scope that supports both reading and organizing files (rename, move, create folders, trash). `drive.readonly` would not allow file management.

### "How is user data stored?"

> OAuth tokens are stored in a PostgreSQL database (Supabase) with Row Level Security (RLS) policies. Each user can only access their own tokens. Gmail and Drive metadata is cached temporarily (7-day retention with automatic daily cleanup). Calendar event data is fetched on-demand and not permanently stored. Users can disconnect each service at any time, which immediately removes stored tokens and cached data for that service.

### "How can users revoke access?"

> Users can disconnect each Google service independently through AICA's Google Hub page. Each section (Calendar, Gmail, Drive) has a disconnect button. Disconnecting a service: (1) removes the scope from the user's token record, (2) clears any cached data for that service, and (3) prevents AICA from accessing that service until the user reconnects. Users can also revoke all access via Google's security settings at https://myaccount.google.com/permissions.

---

*Documento preparado: 17/02/2026 | Atualizado: 19/02/2026 (scopes expandidos: gmail.modify, drive)*
*Referencia: Issues #256, #271, #274, #275*
