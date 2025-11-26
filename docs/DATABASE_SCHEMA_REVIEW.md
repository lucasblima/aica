# Database Schema Review & Cleanup Strategy

## Contexto
Atualmente, o banco de dados possui **45 tabelas**, muitas das quais parecem ser vestígios de funcionalidades anteriores (Podcast Copilot, Redes Sociais complexas) ou integrações legadas (Plane sync complexo).

Para o **Aica Life OS**, precisamos de um schema focado em: **Produtividade, Gamificação, Contexto (AI) e Comunicação Simples.**

## 1. Tabelas CORE (Manter & Otimizar)
Estas são essenciais para o funcionamento atual ("Minha Vida", "Meu Dia", Auth).

| Tabela | Função no Life OS | Ação |
| :--- | :--- | :--- |
| `users` | Identidade base. | **MANTER** |
| `profiles` | Dados estendidos (nascimento, país). | **MANTER** |
| `workspaces` | Container principal (Multi-tenancy). | **MANTER** |
| `associations` | Áreas da Vida / Projetos / Comunidades. | **MANTER** |
| `association_members` | Permissões de acesso. | **MANTER** |
| `modules` | Sub-áreas (ex: Finanças, Saúde). | **MANTER** |
| `work_items` | Tarefas e Ações. | **MANTER** |
| `states` | Status (A Fazer, Feito). | **MANTER** |
| `user_stats` | Gamificação (Nível, XP, Streaks). | **MANTER** |
| `task_metrics` | Gamificação (Dificuldade, ROI). | **MANTER** |

## 2. Tabelas de INTELIGÊNCIA & CONTEXTO (Manter)
Essenciais para a "Memória" da AI e relatórios.

| Tabela | Função no Life OS | Ação |
| :--- | :--- | :--- |
| `memories` | Registro de sentimentos e fatos importantes. | **MANTER** |
| `daily_reports` | Resumos diários gerados pela AI. | **MANTER** |
| `activity_log` | Histórico para "Death Clock" e auditoria. | **MANTER** |

## 3. Tabelas de COMUNICAÇÃO (Simplificar)
O foco é WhatsApp via Evolution API. Muitas tabelas de "Social Network" são desnecessárias.

| Tabela | Função no Life OS | Ação |
| :--- | :--- | :--- |
| `pair_conversations` | Histórico de mensagens (WhatsApp). | **MANTER** |
| `contact_network` | CRM Pessoal (frequência de contato). | **MANTER** |
| `chat_sessions` | Sessões de chat com a AI. | **MANTER** (ou fundir) |

## 4. Tabelas CANDIDATAS A REMOÇÃO (Ruído) 🗑️
Estas tabelas parecem não pertencer ao escopo "Life OS" ou são legadas.

### Grupo A: Legado "Podcast Copilot"
Parecem específicas de um projeto anterior de podcast.
- `projects` (Tem campos como `guest_name`, `episode_theme`) -> **REMOVER** (Usar `modules` se precisar de projetos)
- `topics` (Pauta de episódio) -> **REMOVER** (Usar `work_items`)

### Grupo B: Funcionalidades de Rede Social Complexa
O Life OS é focado no usuário, não uma rede social pública.
- `user_matches` (Tinder-like?) -> **REMOVER**
- `user_blocks` -> **REMOVER**
- `user_reports` -> **REMOVER**
- `moderation_log` -> **REMOVER**
- `support_groups` -> **REMOVER** (Usar `associations` do tipo 'community')
- `group_members` -> **REMOVER**
- `group_messages` -> **REMOVER**

### Grupo C: Integrações/Complexidade Desnecessária
- `plane_config`, `sync_log`, `user_plane_mapping` -> **AVALIAR**: Se o foco é um Life OS nativo, a sincronização bidirecional complexa com Plane pode ser simplificada ou removida se não for mais o "backend of truth".
- `evolution_instances` -> **REMOVER**: A configuração da API Evolution pode ficar em variáveis de ambiente ou uma tabela simples de `integrations`, não precisa de uma tabela de instâncias complexa.
- `app_memory`, `message_embeddings` -> **REMOVER**: Parece duplicar `memories` ou ser de uma versão antiga de RAG.
- `extracted_actions` -> **REMOVER**: A AI deve criar `work_items` diretamente.
- `workflow_telemetry` -> **REMOVER**: Logs de n8n ficam no n8n.

## Resumo da Proposta
- **Total Atual:** 45 tabelas
- **Total Proposto:** ~15-18 tabelas
- **Redução:** ~60% de "ruído"

## Próximos Passos
1. **Validar:** Você concorda com a remoção dos Grupos A, B e C?
2. **Backup:** Criar um dump dos dados atuais (se houver algo importante).
3. **Limpeza:** Criar uma migration `002_cleanup_schema.sql` para dropar as tabelas desnecessárias.
