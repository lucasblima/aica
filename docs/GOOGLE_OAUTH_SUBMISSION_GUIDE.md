# Guia de Submissao OAuth - Google Cloud Verification

**Projeto:** AICA - Life OS
**Tipo:** Sensitive Scope Verification
**Data de preparacao:** 13 de fevereiro de 2026

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

### Escopo 1: `https://www.googleapis.com/auth/calendar.readonly`

**Classificacao:** Sensitive

**Justificativa (EN — para o formulario Google):**

> My app uses `https://www.googleapis.com/auth/calendar.readonly` to display the user's Google Calendar events within the AICA Agenda module. This allows users to see their upcoming appointments, meetings, and commitments alongside their task management workflow, enabling them to detect scheduling conflicts and plan their day more effectively.
>
> AICA is a read-only consumer of calendar data — it does NOT create, modify, or delete any calendar events. The `calendar.readonly` scope is the minimum necessary scope to read event data. No broader scope (such as `calendar` or `calendar.events`) is requested because AICA does not need write access.
>
> Calendar data is stored securely in a PostgreSQL database with Row Level Security (RLS) policies ensuring each user can only access their own data. OAuth tokens are stored per-user in the database and can be revoked at any time through the app's settings.

**Justificativa (PT — referencia):**

> A AICA usa o escopo `calendar.readonly` para exibir os eventos do Google Calendar do usuario no modulo Agenda. Isso permite que os usuarios vejam seus compromissos junto com suas tarefas, detectem conflitos de horario e planejem seu dia de forma mais eficaz. A AICA e consumidora somente-leitura — NAO cria, modifica ou exclui eventos. Tokens sao armazenados por usuario com RLS e podem ser revogados a qualquer momento.

---

### Escopo 2: `https://www.googleapis.com/auth/userinfo.email`

**Classificacao:** Non-sensitive (nao requer justificativa, mas incluir por completude)

**Justificativa (EN):**

> My app uses `https://www.googleapis.com/auth/userinfo.email` to identify the user's Google account email address when they connect their Google Calendar. This email is displayed in the app's settings to show which Google account is connected, allowing users to verify and manage their integration.

---

## 3. Descricao do App (App Description)

**EN (para o formulario):**

> AICA (Life OS) is a personal life management platform that helps users organize their tasks, calendar, finances, personal growth, and professional projects in one place. The Google Calendar integration allows users to view their calendar events alongside their task management workflow, enabling better time planning and conflict detection. AICA only reads calendar data (read-only) and never modifies the user's calendar.

**PT (referencia):**

> AICA (Life OS) e uma plataforma de gestao de vida pessoal que ajuda usuarios a organizar tarefas, calendario, financas, crescimento pessoal e projetos profissionais em um unico lugar. A integracao com Google Calendar permite visualizar eventos junto com o fluxo de gestao de tarefas, possibilitando melhor planejamento e deteccao de conflitos. A AICA apenas le dados do calendario (somente-leitura) e nunca modifica o calendario do usuario.

---

## 4. Credenciais de Teste

### Conta de Teste (criar manualmente)

| Campo | Valor |
|-------|-------|
| **Email** | google-review@aica.guru |
| **Senha** | (definir ao criar) |
| **Nota** | Conta com dados de exemplo pre-populados |

### Dados de Exemplo para Popular

Antes de submeter, a conta de teste deve ter:

- [ ] 3-5 tarefas no Atlas (modulo de tarefas)
- [ ] 2-3 momentos no Journey (modulo de autoconhecimento)
- [ ] Google Calendar conectado com alguns eventos
- [ ] Pelo menos 1 pergunta diaria respondida

### Como Criar a Conta

1. Acessar https://aica.guru
2. Criar conta com email `google-review@aica.guru`
3. Completar onboarding
4. Criar tarefas de exemplo
5. Registrar momentos de exemplo
6. Conectar Google Calendar (usando uma conta Google de teste)

---

## 5. Video de Demonstracao (Roteiro)

### Requisitos Tecnicos

| Requisito | Valor |
|-----------|-------|
| **Resolucao** | 1080p ou superior |
| **Duracao** | 3-5 minutos |
| **Ferramenta** | OBS Studio ou Loom |
| **Upload** | YouTube como "Nao listado" |

### Roteiro Detalhado

**[0:00 - 0:30] Intro**
- Mostrar homepage https://aica.guru
- "This video demonstrates how AICA uses the Google Calendar integration"
- Mostrar barra de endereco com o dominio

**[0:30 - 1:30] Fluxo OAuth**
- Fazer login na plataforma
- Ir para Settings/Configuracoes
- Clicar em "Conectar Google Calendar"
- **IMPORTANTE**: Pausar na consent screen do Google para mostrar:
  - Nome do app: "AICA - Life OS"
  - Escopos solicitados (calendar.readonly, email)
  - Link para Privacy Policy
- Aceitar o consentimento
- Mostrar mensagem de sucesso

**[1:30 - 3:00] Uso Real dos Dados**
- Navegar ate o modulo Agenda
- Mostrar eventos do Google Calendar sincronizados
- Demonstrar como os eventos aparecem na timeline
- Mostrar detecao de conflitos (se houver)
- Voltar para Settings e mostrar qual conta Google esta conectada

**[3:00 - 3:30] Seguranca e Privacidade**
- Mostrar a Privacy Policy (https://aica.guru/privacy)
- Fazer scroll ate a secao 5 (Google Calendar API)
- Destacar que e somente-leitura

**[3:30 - 4:00] Revogacao**
- Voltar para Settings
- Clicar em "Desconectar Google Calendar"
- Confirmar desconexao
- Mostrar que os dados foram removidos

**[4:00 - 4:30] Encerramento**
- "AICA only reads calendar data and never modifies the user's calendar"
- "Users can revoke access at any time"
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
- calendar.readonly (read-only access to calendar events)
- userinfo.email (user email identification)

AICA does NOT modify, create, or delete calendar events.

Visibility: UNLISTED
```

---

## 6. Checklist Pre-Submissao Final

### Infraestrutura
- [x] Dominio proprio configurado (aica.guru)
- [x] SSL/HTTPS funcionando
- [ ] Dominio verificado no Google Search Console (DNS TXT record)

### Codigo
- [x] Escopos OAuth sao minimos (calendar.readonly + userinfo.email)
- [x] Tratamento de erros OAuth implementado
- [x] Dead code de escopos removido

### Paginas Publicas
- [x] Homepage acessivel: https://aica.guru
- [x] Privacy Policy atualizada: https://aica.guru/privacy (14 secoes)
- [x] Terms of Service atualizado: https://aica.guru/terms (16 secoes)

### Privacy Policy
- [x] Secao 5 dedicada Google Calendar API (5 subsecoes)
- [x] Escopos listados e explicados
- [x] Link para Google API Services User Data Policy
- [x] Data fixa de atualizacao (13/02/2026)
- [x] Email de contato correto (contato@aica.guru)

### OAuth Consent Screen (Google Cloud Console)
- [ ] Nome: AICA - Life OS
- [ ] Logo configurado (logo-aica-blue.png)
- [ ] Homepage URL: https://aica.guru
- [ ] Privacy Policy URL: https://aica.guru/privacy
- [ ] Terms of Service URL: https://aica.guru/terms
- [ ] Support email: contato@aica.guru
- [ ] Authorized domains: aica.guru

### Email
- [x] Codigo unificado com contato@aica.guru
- [ ] Email funcional configurado (Hostinger forwarding)

### Video de Demonstracao
- [ ] Video gravado seguindo roteiro acima
- [ ] Upload no YouTube como "Nao listado"
- [ ] Consent screen claramente visivel no video
- [ ] Barra de endereco visivel com dominio

### Credenciais de Teste
- [ ] Conta google-review@aica.guru criada
- [ ] Dados de exemplo populados
- [ ] Google Calendar conectado na conta de teste

---

## 7. Passo a Passo da Submissao

### No Google Cloud Console

1. Acessar https://console.cloud.google.com/apis/credentials/consent
2. Selecionar projeto `gen-lang-client-0948335762`
3. Ir para "OAuth consent screen"
4. Verificar todos os campos (secao 1 deste doc)
5. Ir para "Scopes" → verificar que apenas calendar.readonly e userinfo.email estao listados
6. Clicar em "Prepare for verification"
7. Preencher:
   - Scope justifications (secao 2 deste doc)
   - App description (secao 3 deste doc)
   - Video URL (YouTube unlisted)
   - Test account credentials
8. Submeter

### Tempo de Revisao Esperado

- **3-5 dias uteis** para escopo sensitive
- Google pode pedir ajustes — manter email monitorado
- Se aprovado, o app sai do modo "Testing" para "In production"

---

## 8. Respostas para Perguntas Frequentes do Google

### "Why does your app need calendar.readonly?"

> AICA needs calendar.readonly to display the user's Google Calendar events within the Agenda module. This enables users to view their appointments alongside tasks for better time management. AICA is strictly read-only and never modifies calendar data.

### "Why not use a narrower scope?"

> calendar.readonly is already the narrowest scope available for reading calendar events. There is no narrower scope that provides access to event data.

### "How is user data stored?"

> OAuth tokens are stored in a PostgreSQL database (Supabase) with Row Level Security (RLS) policies. Each user can only access their own tokens. Calendar event data is cached temporarily for display purposes. Users can disconnect at any time, which immediately deletes all stored tokens and cached data.

### "How can users revoke access?"

> Users can disconnect their Google Calendar at any time through the app's settings page. This action: (1) deletes the OAuth tokens from our database, (2) removes cached calendar data, and (3) the app's access is immediately revoked. Users can also revoke access via Google's security settings at https://myaccount.google.com/permissions.

---

*Documento preparado: 13/02/2026*
*Referencia: docs/EPICS_GOOGLE_CLOUD_APPROVAL.md — EPICO 6*
