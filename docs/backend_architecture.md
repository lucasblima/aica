# Backend Architecture – Fonte de Verdade

## Visão Geral
Este documento descreve **todas as tabelas do Supabase** que o frontend (Aica) utiliza, seus **relacionamentos** e como o **frontend interage** com elas através dos serviços em `src/services/supabaseService.ts`.

---

## Tabelas Principais
| Tabela | Campos Relevantes | Função | Relacionamento(s) |
|--------|-------------------|--------|-------------------|
| **users** | `id`, `email`, `full_name`, `avatar_url`, `created_at` | Identifica o usuário autenticado. | 1‑N → `pair_conversations`, `chat_sessions`, `activity_log`, `memories`, `daily_reports` |
| **associations** | `id`, `name`, `description`, `logo_url`, `archived` | Grupos/associações que o usuário faz parte. | 1‑N → `modules`, `work_items`, `group_messages` |
| **modules** (life_areas) | `id`, `name`, `description`, `association_id`, `archived` | Áreas da “Minha Vida” (Finanças, Saúde, Educação…). | N‑1 → `associations` |
| **work_items** | `id`, `title`, `description`, `due_date`, `start_date`, `priority`, `status`, `association_id`, `assignee_name`, `archived` | Tarefas diárias exibidas em **Meu Dia**. | N‑1 → `associations` |
| **memories** | `id`, `content`, `metadata` (JSON), `user_id` | Registro de eventos emocionais ou contextuais. | N‑1 → `users` |
| **daily_reports** | `id`, `report_type`, `report_content`, `user_id` | Relatórios diários de progresso ou bem‑estar. | N‑1 → `users` |
| **activity_log** | `id`, `action`, `details` (JSON), `user_id` | Histórico de ações (ex.: pomodoro, envio de mensagem). | N‑1 → `users` |
| **chat_sessions** | `id`, `user_id`, `channel_identifier`, `created_at`, `last_interaction_at` | Sessões de conversa por canal (WhatsApp, web). | N‑1 → `users` |
| **pair_conversations** | `id`, `content`, `sender_id`, `match_id`, `delivered`, `moderation_status` | Mensagens que acionam o **Database Webhook** → n8n → Evolution API (WhatsApp). | N‑1 → `users` (sender) ; `match_id` referencia outro usuário ou contato externo |
| **group_messages** | `id`, `content`, `sender_id`, `status`, `sent_at`, `external_msg_id` | Mensagens em massa ou convites de grupo. | N‑1 → `users` |
| **contact_network** | `id`, `user_id`, `contact_name`, `phone_number`, `last_interaction_date` | Cadastro de contatos externos (ex.: Gisele). | N‑1 → `users` |
| **audit_log** | `id`, `event`, `payload`, `status`, `created_at` | Registro de erros/validações nos workflows n8n. | — |

---

## Fluxos de Dados (Frontend ↔ Supabase)

### 1. Autenticação
- **Frontend**: `supabaseClient.ts` cria o cliente com `supabaseUrl` e `supabaseAnonKey`.
- **Chamada**: `supabase.auth.getSession()` e `onAuthStateChange` em `App.tsx`.
- **Resultado**: Usuário autenticado → `user.id` usado como `sender_id` nas mensagens.

### 2. Carregamento de Dados
| Tela | Função | Serviço (`supabaseService.ts`) | Consulta Supabase |
|------|--------|-------------------------------|-------------------|
| **Minha Vida** | Exibir módulos/áreas de vida | `getLifeAreas()` | `select * from modules where archived = false` (join `associations` opcional) |
| **Meu Dia** | Listar tarefas do dia | `getDailyAgenda()` | `select * from work_items where due_date <= today and archived = false` |
| **Associações** (card “Minhas Associações”) | Mostrar associações do usuário | `getUserAssociations(userId)` | `select * from associations where user_id = $userId` |
| **Memórias/Relatórios** | Persistir contexto emocional | `addMemory()`, `addDailyReport()` | `insert` nas tabelas `memories` / `daily_reports` |

### 3. Envio de Mensagem WhatsApp (Colaboração)
1. **Usuário clica “Cobrar via WhatsApp”** → UI chama `sendMessage(content, senderId, matchId)` (novo método em `supabaseService.ts`).
2. `sendMessage` **insere** um registro em `pair_conversations` (status `pending`).
3. **Database Webhook** configurado no Supabase detecta o `INSERT` e faz POST para o endpoint HTTP do **n8n** (`/webhook/send-whatsapp-msg`).
4. n8n **valida** `auth_token` e `user_id` (IF node). Se válido, chama a **Evolution API** para enviar a mensagem real via WhatsApp.
5. Quando a API responde sucesso, n8n **atualiza** o registro: `delivered = true`, `moderation_status = 'sent'`, `external_msg_id = <id da API>`.
6. Frontend pode **escutar** mudanças em tempo real usando `subscribeToMessageStatus(messageId, callback)` (Realtime channel) e atualizar a UI (ex.: “Enviando… → Enviado”).

### 4. Atualização de Status de Tarefas
- **Frontend**: ao marcar tarefa concluída, chama `updateTaskStatus(taskId, 'completed')` (função existente).
- **Supabase**: `update work_items set status = 'completed', completed_at = now() where id = $taskId`.
- UI reflete mudança imediatamente (optimistic update) e, via Realtime, outros dispositivos veem a atualização.

---

## Diagrama Simplificado (texto)
```
[Frontend (React)]
   │
   ├─ supabaseClient.ts  ←→  Supabase Auth
   │
   ├─ supabaseService.ts
   │      ├─ getLifeAreas()      → modules ↔ associations
   │      ├─ getDailyAgenda()    → work_items ↔ associations
   │      ├─ sendMessage()       → pair_conversations (INSERT)
   │      └─ subscribeToMessageStatus() ← Realtime channel
   │
   └─ UI components (App.tsx, BottomNav, etc.)
          │
          └─ renderVida / renderAgenda (consomem dados acima)

[Supabase]
   ├─ tables (users, associations, modules, work_items, …)
   ├─ Realtime (push updates to frontend)
   └─ Database Webhook → n8n

[n8n Workflow]
   ├─ Recebe payload (phone, message, user_id, auth_token)
   ├─ IF auth_token válido
   ├─ Call Evolution API (WhatsApp) → envia mensagem
   └─ UPDATE pair_conversations (delivered = true, external_msg_id)
```

---

## Como usar este documento
- **Revisão**: Abra `backend_architecture.md` no seu editor (Metro) para ter a referência única.
- **Manutenção**: Sempre que criar nova tabela ou mudar um relacionamento, atualize este arquivo.
- **Comunicação**: Compartilhe com a equipe de backend e com quem for integrar novos fluxos (ex.: novos canais de mensagem, novos módulos de vida).

---

*Última atualização: 2025‑11‑25*
