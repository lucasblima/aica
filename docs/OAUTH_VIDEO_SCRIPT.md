# Roteiro: Video de Verificacao OAuth — AICA Life OS

> **Escopo atual:** `calendar.events` + `userinfo.email` (sensitive only)
> Gmail e Drive foram removidos do OAuth — este roteiro reflete o escopo real submetido.

**Duracao alvo:** 3-4 minutos
**Resolucao:** 1080p
**Idioma:** Ingles (narracao ou legendas)
**Upload:** YouTube como "Nao listado" (Unlisted)
**Ferramentas:** OBS Studio ou Loom

---

## CENA 1 — Introducao [0:00 - 0:25]

**Tela:** Homepage `https://aica.guru` (barra de endereco visivel)

**Narracao (EN):**
> "This is AICA — a personal Life Operating System for productivity and self-awareness. AICA integrates with Google Calendar to provide users with a unified view of their schedule across all modules. We request two scopes: calendar.events for bidirectional calendar sync, and userinfo.email for account identification."

**Notas de gravacao:**
- Mostrar a URL `aica.guru` claramente na barra do navegador
- Scroll rapido pela landing page para mostrar que e um produto real

---

## CENA 2 — Tela de Consentimento OAuth [0:25 - 1:10]

**Tela:** Fluxo de login Google

**Acoes:**
1. Clicar em "Entrar com Google"
2. **PAUSAR na tela de consentimento** (3-5 segundos)
3. Mostrar claramente:
   - Nome do app: **"AICA - Life OS"**
   - Escopos solicitados: **Google Calendar (view and edit events)** + **email address**
   - Link para **Privacy Policy**
4. Aceitar o consentimento
5. Mostrar redirect bem-sucedido para o dashboard

**Narracao (EN):**
> "When a user signs in, they see the standard Google consent screen. AICA requests access to Google Calendar events — both read and write — to enable bidirectional sync. We also request the user's email address for account identification. The Privacy Policy is linked directly on this screen. The user must explicitly grant consent before any data is accessed."

**Notas de gravacao:**
- **PAUSAR** na consent screen por pelo menos 3 segundos
- Zoom na tela se necessario para os escopos ficarem legiveis
- Se possivel, usar uma conta de teste limpa (nao sua conta pessoal)

---

## CENA 3 — Uso Real: Leitura do Calendar [1:10 - 1:55]

**Tela:** Modulo Agenda (`/agenda`) ou Google Hub (`/google-hub`)

**Acoes:**
1. Navegar ate o modulo Agenda
2. Mostrar eventos do Google Calendar aparecendo na timeline
3. Mostrar o indicador de sincronizacao ("Sincronizado" + timestamp)
4. Clicar em um evento para mostrar detalhes (titulo, hora, descricao)

**Narracao (EN):**
> "Once connected, AICA automatically syncs the user's Google Calendar events into the Agenda module. Here you can see today's events displayed in the unified timeline. The sync happens every five minutes, and users can trigger a manual refresh at any time. Event details like title, time, and description are displayed — no modifications are made to the original event unless the user explicitly creates or edits one."

**Notas de gravacao:**
- Garantir que haja 2-3 eventos no Google Calendar da conta de teste
- Mostrar o badge de conexao verde

---

## CENA 4 — Uso Real: Escrita no Calendar [1:55 - 2:40]

**Tela:** Modulo Atlas (tarefas) ou Agenda

**Acoes:**
1. Criar uma nova tarefa com data/hora agendada (ex: "Team Meeting" terca 14h)
2. Salvar a tarefa
3. Abrir o Google Calendar (em nova aba) e mostrar o evento criado automaticamente
4. Voltar para AICA e mostrar o evento na timeline

**Narracao (EN):**
> "The write permission is used for bidirectional sync. When a user schedules a task in AICA — for example, a team meeting for Tuesday at 2 PM — it's automatically created as an event in their Google Calendar. This way, users maintain a single source of truth. The calendar event includes the task title, time, and description, tagged with metadata so AICA can track the sync."

**Notas de gravacao:**
- Mostrar a criacao passo-a-passo
- Alternar para o Google Calendar real para provar que o evento apareceu
- Se a escrita nao funcionar em tempo real no momento, pode usar um evento pre-criado e narrar o fluxo

---

## CENA 5 — Privacidade e Revogacao [2:40 - 3:25]

**Tela:** Privacy Policy + Google Hub + Configuracoes

**Acoes:**
1. Abrir a Privacy Policy (`/privacy-policy`) — scroll ate Secao 5 (Google Calendar)
2. Mostrar o que e coletado e por que
3. Ir ao Google Hub ou Perfil
4. Clicar em "Desconectar" (Disconnect) do Google Calendar
5. Mostrar que o status muda para "Nao conectado"
6. (Opcional) Mostrar `myaccount.google.com/permissions`

**Narracao (EN):**
> "Our Privacy Policy, accessible at aica.guru/privacy-policy, details exactly what data we access and why. Section 5 covers Google Calendar integration specifically. Users can disconnect their Google Calendar at any time with a single click. When disconnected, AICA immediately stops accessing calendar data. Users can also revoke access through their Google Account permissions page. We comply with LGPD — the Brazilian General Data Protection Law — and follow Google's Limited Use requirements."

**Notas de gravacao:**
- Pausa breve na secao relevante da Privacy Policy
- O botao "Desconectar" deve estar visivel e funcional
- Apos desconectar, mostrar que os eventos desaparecem da timeline

---

## CENA 6 — Encerramento [3:25 - 3:50]

**Tela:** Homepage ou Dashboard

**Narracao (EN):**
> "To summarize: AICA requests the minimum necessary Google scopes — calendar events for bidirectional sync and email for identification. All data access is transparent, revocable, and compliant with Google's Limited Use policy and Brazilian data protection law. Thank you for reviewing our application."

---

## Configuracao YouTube

**Titulo:**
```
AICA - Life OS | Google Calendar Integration — OAuth Verification Demo
```

**Descricao:**
```
OAuth Verification Demo for AICA - Life OS (https://aica.guru)

Scopes requested:
- calendar.events (read/write) — Bidirectional calendar sync
- userinfo.email — Account identification

Privacy Policy: https://aica.guru/privacy-policy
Terms of Service: https://aica.guru/terms-of-service
Contact: contato@aica.guru

Users can disconnect Google Calendar access at any time from their profile settings
or from https://myaccount.google.com/permissions.
```

**Visibilidade:** Nao listado (Unlisted)

---

## Checklist Pre-Gravacao

| Item | Status |
|------|--------|
| Conta de teste com 2-3 eventos no Google Calendar | Preparar |
| `contato@aica.guru` configurado e funcional | Pendente |
| Privacy Policy acessivel em `/privacy-policy` | OK |
| Terms of Service acessivel em `/terms-of-service` | OK |
| Botao "Desconectar" do Calendar funcional | Verificar |
| OBS Studio ou Loom instalado | Preparar |
| Microfone testado (se narracao ao vivo) | Preparar |
| Resolucao do navegador em 1080p | Configurar |
