---
name: supabase-database
description: Gerenciamento do banco Supabase (migrations, queries, CLI). Use quando trabalhar com schema, dados ou Edge Functions.
---

# Supabase Database Skill

Referencia completa para o banco de dados Supabase do projeto AICA Life OS.

---

## Projeto

| Config | Valor |
|--------|-------|
| Project Ref | `uzywajqzbdbrfammshdg` |
| URL | https://uzywajqzbdbrfammshdg.supabase.co |
| Region | sa-east-1 (Sao Paulo) |
| Dashboard | https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg |

---

## CLI Essencial

```bash
# Login
npx supabase login --token <ACCESS_TOKEN>

# Link ao projeto
npx supabase link --project-ref uzywajqzbdbrfammshdg

# Status
npx supabase status
```

---

## Migrations

```bash
# Criar nova migration
npx supabase migration new nome_da_migration

# Ver diff (preview)
npx supabase db diff

# Aplicar no remoto
npx supabase db push

# Listar aplicadas
npx supabase migration list

# Reset local (DESTRUTIVO)
npx supabase db reset
```

### Convencoes de Naming

```
YYYYMMDDHHMMSS_descricao_curta.sql
Exemplo: 20260206000001_whatsapp_avatars_bucket.sql
```

---

## Edge Functions (46 ativas)

### Deploy

```bash
# Deploy individual (padrao do projeto - sempre com --no-verify-jwt)
SUPABASE_ACCESS_TOKEN=sbp_... npx supabase functions deploy <nome> --no-verify-jwt

# Deploy todas
SUPABASE_ACCESS_TOKEN=sbp_... npx supabase functions deploy --no-verify-jwt

# Servir local
npx supabase functions serve

# Logs
npx supabase functions logs <nome> --tail
```

### Inventario por Dominio

**Chat & AI Core:**
| Funcao | Descricao |
|--------|-----------|
| `gemini-chat` | Chat principal (Gemini 2.5 Flash/Pro) + transcricao audio |
| `agent-proxy` | Proxy para ADK backend (aica-agents) |
| `deep-research` | Pesquisa profunda com Gemini |
| `context-cache` | Cache de contexto Gemini |
| `gemini-live` | API Live (voz bidirecional) |

**File Search & RAG:**
| Funcao | Descricao |
|--------|-----------|
| `file-search` | Busca semantica v1 |
| `file-search-v2` | Busca semantica v2 (novo) |
| `file-search-corpus` | Gerenciamento de corpus |
| `search-documents` | Busca em documentos |
| `search-contacts` | Busca em contatos |

**WhatsApp Pipeline:**
| Funcao | Descricao |
|--------|-----------|
| `webhook-evolution` | Webhook Evolution API |
| `extract-intent` | Extracao de intencao (fire-and-forget) |
| `generate-pairing-code` | Codigo de pareamento 8 digitos |
| `sync-whatsapp-contacts` | Sync contatos (v31) |
| `configure-instance-webhook` | Config webhook instancia |
| `create-user-instance` | Criar instancia por usuario |
| `disconnect-whatsapp` | Desconectar sessao |
| `proxy-whatsapp-image` | Proxy de imagens |
| `sync-message-history` | Sync historico mensagens |
| `process-whatsapp-document` | Processar documentos WhatsApp |
| `process-message-queue` | Fila de mensagens |
| `process-contact-analysis` | Analise de contatos |
| `generate-contact-embeddings` | Embeddings de contatos |

**Grants/Captacao:**
| Funcao | Descricao |
|--------|-----------|
| `process-edital` | Processar edital PDF |
| `test-process-edital` | Testar processamento |
| `query-edital` | Consultar edital |
| `process-document` | Processar documento generico |
| `process-organization-document` | Docs de organizacao |

**Studio/Podcast:**
| Funcao | Descricao |
|--------|-----------|
| `generate-questions` | Gerar perguntas para entrevista |
| `send-guest-approval-link` | Link de aprovacao de convidado |
| `send-invitation-email` | Email de convite |
| `generate-sponsor-deck` | Deck de patrocinadores |
| `generate-presentation-pdf` | Gerar PDF de apresentacao |

**Billing & Credits:**
| Funcao | Descricao |
|--------|-----------|
| `create-checkout-session` | Checkout Stripe |
| `stripe-webhook` | Webhook Stripe |
| `claim-daily-credits` | Creditos diarios |
| `check-rate-limit` | Rate limiting |
| `estimate-processing-cost` | Estimativa de custo |

**System:**
| Funcao | Descricao |
|--------|-----------|
| `oauth-token-refresh` | Refresh token OAuth |
| `privacy-purge` | Purge LGPD |
| `proactive-trigger` | Trigger proativo |
| `process-action-queue` | Fila de acoes |
| `notification-sender` | Sistema de notificacoes |
| `media-processor` | Processador de midia |
| `calculate-health-scores` | Scores de saude contatos |

**Shared:**
| Pasta | Descricao |
|-------|-----------|
| `_shared/` | Codigo compartilhado entre Edge Functions |

---

## Tabelas por Modulo (158 total)

### Core (User & Auth)
```
profiles, user_subscriptions, user_credits, user_token_usage,
user_tour_progress, user_ai_settings, user_invites, user_referrals,
user_memory, user_consciousness_stats, user_profiles, user_consents
```

### Journey (Autoconhecimento)
```
moments, moment_entries, daily_reports, daily_questions,
question_responses, user_question_context_bank, memories
```

### Atlas (Tarefas)
```
work_items, task_projects, task_categories
```

### Studio (Podcast)
```
podcast_shows, podcast_episodes, podcast_guest_research,
podcast_team_members, podcast_topics, podcast_generated_pautas,
podcast_pauta_outline_sections, podcast_pauta_questions, podcast_pauta_sources
```

### Grants (Captacao)
```
grant_opportunities, grant_projects, grant_briefings, grant_responses,
grant_operations, grant_opportunity_documents, grant_project_documents
```

### Connections (CRM)
```
connection_spaces, connection_members, connection_events,
connection_documents, connection_transactions, connection_invitations,
contact_network, contact_analysis, contact_embeddings,
contact_health_history, contact_insights
```

### WhatsApp
```
whatsapp_messages, whatsapp_sessions, whatsapp_sync_logs,
whatsapp_pending_actions, whatsapp_media_tracking,
whatsapp_media_metadata, whatsapp_sentiment_aggregates,
whatsapp_conversations, whatsapp_user_activity,
whatsapp_opt_keywords, whatsapp_consent_records
```

### Finance
```
finance_transactions, finance_statements, finance_categorization_rules,
finance_processing_logs, finance_agent_conversations, budget_categories
```

### Habitat (Imoveis)
```
habitat_properties, habitat_inventory, habitat_maintenance, habitat_documents
```

### Academia
```
academia_credentials, academia_journeys, academia_mentorships, academia_notes
```

### Associations
```
associations, association_members
```

### Ventures/Organizations
```
organizations, organization_members, organization_relationships,
ventures_entities, ventures_metrics, ventures_milestones, ventures_stakeholders
```

### Tribo (Comunidade)
```
tribo_discussions, tribo_discussion_replies, tribo_rituals,
tribo_ritual_occurrences, tribo_group_funds, tribo_fund_contributions,
tribo_shared_resources
```

### Gamification
```
user_stats, user_achievements, xp_history, consciousness_points_log
```

### AI Infrastructure
```
ai_usage_logs, ai_usage_analytics, ai_usage_tracking_errors,
ai_model_pricing, ai_cost_alerts, ai_transcriptions,
llm_cache, llm_metrics, agent_sessions
```

### File Search & RAG
```
file_search_corpora, file_search_documents, file_search_queries,
document_chunks, document_embeddings, processed_documents,
document_link_suggestions, indexed_documents
```

### Billing
```
pricing_plans, billing_subscriptions, credit_transactions,
rate_limits, project_sponsors, sponsorship_tiers, tier_deliverables
```

### Privacy (LGPD)
```
data_deletion_requests, data_retention_policies,
privacy_audit_logs, privacy_purge_log
```

### Notifications
```
notification_log, notification_templates, scheduled_notifications
```

### Other
```
google_calendar_tokens, chat_messages, chat_sessions,
message_queue, message_embeddings, action_queue,
generated_decks, deck_slides, efficiency_history,
ai_generated_assets, module_assets, incentive_laws
```

---

## RPCs Essenciais (283 total)

### Mais Usadas no Frontend

```sql
-- Journey
get_journey_activity_heatmap(p_user_id, p_start_date, p_end_date)
update_moment_streak(p_user_id)
get_streak_trend_stats(p_user_id)

-- Gamification
award_consciousness_points(p_user_id, p_amount, p_reason)
award_user_xp(p_user_id, p_amount, p_category)

-- WhatsApp
get_or_create_whatsapp_session(p_user_id, p_instance_name)
record_pairing_attempt(p_session_id)
check_whatsapp_consent(p_user_id)

-- Credits
get_user_credit_balance(p_user_id)
spend_credits(p_user_id, p_amount, p_reason)
claim_daily_credits(p_user_id)

-- Contacts
search_contacts_by_embedding(p_embedding, p_user_id, p_limit)
record_health_score(p_contact_id, p_score, p_components)
```

---

## Queries de Diagnostico

```sql
-- Schema completo
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Estrutura de tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'SUA_TABELA' ORDER BY ordinal_position;

-- RLS status
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;

-- Policies de uma tabela
SELECT policyname, permissive, cmd, qual, with_check
FROM pg_policies WHERE tablename = 'SUA_TABELA';

-- Indices
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'SUA_TABELA';

-- Contagem de registros
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables ORDER BY n_live_tup DESC;

-- RPCs disponiveis
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' ORDER BY routine_name;

-- Tamanho das tabelas
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

---

## RLS Patterns

```sql
-- PADRAO: Usuario ve apenas seus dados
ALTER TABLE public.sua_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.sua_tabela
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.sua_tabela
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.sua_tabela
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON public.sua_tabela
FOR DELETE USING (auth.uid() = user_id);

-- PADRAO: Service role (Edge Functions)
CREATE POLICY "service_role_full" ON public.sua_tabela
FOR ALL USING (auth.role() = 'service_role');

-- PADRAO: SECURITY DEFINER (bypassar RLS)
CREATE OR REPLACE FUNCTION public.admin_operation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN /* ... */ END; $$;
```

---

## Troubleshooting

### Connection Refused
- Verificar IP whitelist no Dashboard
- Usar pooler URL (porta 6543): `aws-0-sa-east-1.pooler.supabase.com`

### Permission Denied
- Verificar RLS habilitado: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';`
- Testar com service_role_key (bypass RLS)
- Verificar grants de RPCs

### Relation Does Not Exist
- Migration nao aplicada: `npx supabase db push`
- Schema errado: usar `public.` prefix

### Edge Function 500
- Logs: `npx supabase functions logs <nome> --tail`
- Verificar secrets: `npx supabase secrets list`
- CORS headers presentes?
- JWT validation: usar `--no-verify-jwt` se chamada service-to-service

### Deploy Falhou
- Token expirado: `SUPABASE_ACCESS_TOKEN=sbp_... npx supabase functions deploy <nome> --no-verify-jwt`
- Erro Deno: verificar imports (`https://deno.land/std@0.168.0/`)
- Tamanho: Edge Functions tem limite de 2MB

---

## Links

- [Dashboard](https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg)
- [SQL Editor](https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql)
- [Edge Functions](https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions)
- [Auth Users](https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/auth/users)
- [Logs](https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/logs/edge-logs)
