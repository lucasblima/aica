# RLS and Foreign Key Audit Report
**Generated**: 2026-01-08 22:30:17
**Issue**: #73 Phase 1

## Summary

- **Total Tables**: 90
- **Total RLS Policies**: 381
- **Total Foreign Keys**: 151

## Tables Found

```
        users
-- 1. CREATE TABLE
academia_credentials
academia_journeys
academia_mentorships
academia_notes
ai_cost_alerts
ai_generated_assets
ai_model_pricing
ai_tracking_errors
ai_transcriptions
ai_usage_analytics
ai_usage_logs
ai_usage_tracking_errors
connection_documents
connection_events
connection_members
connection_spaces
connection_transactions
consciousness_points_log
daily_questions
data_deletion_requests
file_search_corpora
file_search_documents
file_search_queries
finance_agent_conversations
finance_categorization_rules
finance_processing_logs
finance_statements
finance_transactions
gemini_api_logs
google_calendar_tokens
grant_operations
grant_opportunity_documents
grant_project_documents
habitat_documents
habitat_inventory
habitat_maintenance
habitat_properties
indexed_documents
life_events
llm_cache
llm_metrics
message_embeddings
module_assets
moment_entries
moments
notification_log
notification_templates
onboarding_context_captures
podcast_generated_pautas
podcast_guest_research
podcast_pauta_outline_sections
podcast_pauta_questions
podcast_pauta_sources
podcast_team_members
profiles
question_responses
rate_limits
scheduled_notifications
task_categories
task_projects
tribo_discussion_replies
tribo_discussions
tribo_fund_contributions
tribo_group_funds
tribo_ritual_occurrences
tribo_rituals
tribo_shared_resources
user_achievements
user_ai_settings
user_consciousness_stats
user_file_search_stores
user_stats
user_tour_progress
ventures_entities
ventures_metrics
ventures_milestones
ventures_stakeholders
veo_video_generations
weekly_summaries
whatsapp_consent_records
whatsapp_conversations
whatsapp_media_metadata
whatsapp_messages
whatsapp_opt_keywords
whatsapp_sentiment_aggregates
whatsapp_sync_logs
whatsapp_user_activity
work_items
```

## RLS Policy Coverage

| Table | Policy Type | Count |
|-------|-------------|-------|
| ai_model_pricing | ai_model_pricing | 1 |
| ai_tracking_errors | ai_tracking_errors | 2 |
| ai_usage_logs | ai_usage_logs | 2 |
| consciousness_points_log | consciousness_points_log | 1 |
| contact_network | DELETE | 1 |
| contact_network | INSERT | 1 |
| contact_network | SELECT | 1 |
| contact_network | UPDATE | 1 |
| CREATE | FOR | 1 |
| daily_questions | daily_questions | 1 |
| data_deletion_requests | INSERT | 1 |
| data_deletion_requests | SELECT | 1 |
| finance_agent_conversations | INSERT | 1 |
| finance_agent_conversations | SELECT | 1 |
| finance_categorization_rules | finance_categorization_rules | 2 |
| finance_processing_logs | finance_processing_logs | 1 |
| finance_statements | finance_statements | 4 |
| finance_transactions | DELETE | 1 |
| finance_transactions | INSERT | 1 |
| finance_transactions | SELECT | 1 |
| finance_transactions | UPDATE | 1 |
| grant_operations | grant_operations | 4 |
| grant_opportunity_documents | DELETE | 1 |
| grant_opportunity_documents | INSERT | 1 |
| grant_opportunity_documents | SELECT | 1 |
| grant_opportunity_documents | UPDATE | 1 |
| grant_project_documents | DELETE | 1 |
| grant_project_documents | INSERT | 1 |
| grant_project_documents | SELECT | 1 |
| grant_project_documents | UPDATE | 1 |
| llm_cache | ALL | 1 |
| llm_metrics | ALL | 1 |
| llm_metrics | SELECT | 1 |
| message_embeddings | SELECT | 1 |
| moment_entries | moment_entries | 4 |
| moments | moments | 4 |
| notification_log | SELECT | 1 |
| notification_templates | ALL | 1 |
| notification_templates | SELECT | 1 |
| onboarding_context_captures | onboarding_context_captures | 8 |
| POLICY | ALL | 3 |
| POLICY | DELETE | 4 |
| POLICY | INSERT | 8 |
| POLICY | SELECT | 9 |
| POLICY | UPDATE | 7 |
| public.academia_credentials | public.academia_credentials | 4 |
| public.academia_journeys | public.academia_journeys | 4 |
| public.academia_mentorships | public.academia_mentorships | 4 |
| public.academia_notes | public.academia_notes | 4 |
| public.ai_cost_alerts | public.ai_cost_alerts | 8 |
| public.ai_generated_assets | public.ai_generated_assets | 4 |
| public.ai_model_pricing | public.ai_model_pricing | 2 |
| public.ai_transcriptions | public.ai_transcriptions | 4 |
| public.ai_usage_analytics | public.ai_usage_analytics | 2 |
| public.ai_usage_tracking_errors | public.ai_usage_tracking_errors | 1 |
| public.association_members | public.association_members | 10 |
| public.associations | public.associations | 4 |
| public.connection_documents | public.connection_documents | 4 |
| public.connection_events | public.connection_events | 4 |
| public.connection_members | public.connection_members | 4 |
| public.connection_spaces | public.connection_spaces | 4 |
| public.connection_transactions | public.connection_transactions | 4 |
| public.daily_reports | public.daily_reports | 10 |
| public.file_search_corpora | DELETE | 2 |
| public.file_search_corpora | INSERT | 2 |
| public.file_search_corpora | SELECT | 2 |
| public.file_search_corpora | UPDATE | 2 |
| public.file_search_documents | DELETE | 2 |
| public.file_search_documents | INSERT | 2 |
| public.file_search_documents | SELECT | 2 |
| public.file_search_documents | UPDATE | 2 |
| public.file_search_queries | public.file_search_queries | 2 |
| public.gemini_api_logs | public.gemini_api_logs | 2 |
| public.google_calendar_tokens | DELETE | 1 |
| public.google_calendar_tokens | INSERT | 1 |
| public.google_calendar_tokens | SELECT | 1 |
| public.google_calendar_tokens | UPDATE | 1 |
| public.habitat_documents | public.habitat_documents | 4 |
| public.habitat_inventory | public.habitat_inventory | 4 |
| public.habitat_maintenance | public.habitat_maintenance | 4 |
| public.habitat_properties | public.habitat_properties | 4 |
| public.indexed_documents | public.indexed_documents | 4 |
| public.module_assets | public.module_assets | 4 |
| public.podcast_generated_pautas | public.podcast_generated_pautas | 8 |
| public.podcast_guest_research | DELETE | 1 |
| public.podcast_guest_research | INSERT | 1 |
| public.podcast_guest_research | SELECT | 1 |
| public.podcast_guest_research | UPDATE | 1 |
| public.podcast_pauta_outline_sections | public.podcast_pauta_outline_sections | 8 |
| public.podcast_pauta_questions | public.podcast_pauta_questions | 8 |
| public.podcast_pauta_sources | public.podcast_pauta_sources | 8 |
| public.podcast_team_members | public.podcast_team_members | 2 |
| public.task_projects | public.task_projects | 4 |
| public.tribo_discussion_replies | public.tribo_discussion_replies | 4 |
| public.tribo_discussions | public.tribo_discussions | 4 |
| public.tribo_fund_contributions | public.tribo_fund_contributions | 4 |
| public.tribo_group_funds | public.tribo_group_funds | 4 |
| public.tribo_ritual_occurrences | public.tribo_ritual_occurrences | 4 |
| public.tribo_rituals | public.tribo_rituals | 4 |
| public.tribo_shared_resources | public.tribo_shared_resources | 4 |
| public.user_ai_settings | public.user_ai_settings | 9 |
| public.user_file_search_stores | public.user_file_search_stores | 4 |
| public.ventures_entities | public.ventures_entities | 4 |
| public.ventures_metrics | public.ventures_metrics | 4 |
| public.ventures_milestones | public.ventures_milestones | 4 |
| public.ventures_stakeholders | public.ventures_stakeholders | 4 |
| public.veo_video_generations | public.veo_video_generations | 4 |
| public.weekly_summaries | DELETE | 1 |
| public.weekly_summaries | INSERT | 1 |
| public.weekly_summaries | UPDATE | 1 |
| public.work_items | public.work_items | 4 |
| question_responses | question_responses | 2 |
| rate_limits | ALL | 1 |
| rate_limits | SELECT | 1 |
| scheduled_notifications | INSERT | 1 |
| scheduled_notifications | SELECT | 1 |
| scheduled_notifications | UPDATE | 1 |
| storage.objects | DELETE | 2 |
| storage.objects | INSERT | 1 |
| storage.objects | SELECT | 2 |
| storage.objects | storage.objects | 3 |
| storage.objects | UPDATE | 1 |
| task_categories | task_categories | 8 |
| user_consciousness_stats | user_consciousness_stats | 2 |
| user_tour_progress | INSERT | 1 |
| user_tour_progress | SELECT | 1 |
| user_tour_progress | UPDATE | 1 |
| weekly_summaries | weekly_summaries | 2 |
| whatsapp_consent_records | ALL | 1 |
| whatsapp_consent_records | SELECT | 1 |
| whatsapp_conversations | SELECT | 1 |
| whatsapp_media_metadata | SELECT | 1 |
| whatsapp_messages | SELECT | 1 |
| whatsapp_messages | UPDATE | 1 |
| whatsapp_sentiment_aggregates | SELECT | 1 |
| whatsapp_sync_logs | whatsapp_sync_logs | 1 |
| whatsapp_user_activity | INSERT | 1 |
| whatsapp_user_activity | SELECT | 1 |
| work_items | DELETE | 1 |
| work_items | INSERT | 1 |
| work_items | SELECT | 1 |
| work_items | UPDATE | 1 |
| work_items | work_items | 4 |

