-- ============================================
-- Journey Timeline Validation Queries
-- Verificar se dados existem para aparecer na timeline
-- ============================================

-- 1. Verificar mensagens WhatsApp do usuário
SELECT 
  COUNT(*) as total_messages,
  COUNT(CASE WHEN message_direction = 'incoming' THEN 1 END) as incoming,
  COUNT(CASE WHEN message_direction = 'outgoing' THEN 1 END) as outgoing,
  MIN(created_at) as oldest_message,
  MAX(created_at) as newest_message
FROM whatsapp_messages
WHERE user_id = 'SEU_USER_ID'; -- Substituir pelo user_id real

-- 2. Verificar contatos sincronizados
SELECT
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN sync_source = 'whatsapp' THEN 1 END) as whatsapp_contacts,
  MAX(whatsapp_last_message_at) as last_whatsapp_activity
FROM contact_network
WHERE user_id = 'SEU_USER_ID';

-- 3. Verificar momentos criados
SELECT 
  COUNT(*) as total_moments,
  MAX(created_at) as last_moment_created
FROM moments
WHERE user_id = 'SEU_USER_ID';

-- 4. Verificar tarefas
SELECT 
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
  MAX(created_at) as last_task_created
FROM tasks
WHERE user_id = 'SEU_USER_ID';

-- 5. Verificar respostas a perguntas diárias
SELECT 
  COUNT(*) as total_responses,
  MAX(responded_at) as last_response
FROM question_responses
WHERE user_id = 'SEU_USER_ID';

-- 6. Verificar resumos semanais
SELECT 
  COUNT(*) as total_summaries,
  MAX(week_start) as last_summary_week
FROM weekly_summaries
WHERE user_id = 'SEU_USER_ID';

-- 7. Verificar instâncias WhatsApp ativas
SELECT 
  instance_name,
  status,
  phone_number,
  connected_at,
  last_activity_at
FROM whatsapp_sessions
WHERE user_id = 'SEU_USER_ID'
ORDER BY created_at DESC
LIMIT 1;

-- 8. Sample de mensagens recentes (verificar conteúdo)
SELECT
  wm.created_at,
  wm.message_direction,
  LEFT(wm.message_text, 50) as preview,
  cn.name as contact_name,
  cn.phone_number as contact_phone
FROM whatsapp_messages wm
LEFT JOIN contact_network cn ON wm.contact_id = cn.id
WHERE wm.user_id = 'SEU_USER_ID'
ORDER BY wm.created_at DESC
LIMIT 10;

-- ============================================
-- Diagnóstico de problemas
-- ============================================

-- Se todas as queries retornam 0/NULL:
-- 1. Verificar se WhatsApp está conectado (query #7)
-- 2. Verificar se webhook está recebendo eventos (logs Edge Function)
-- 3. Verificar RLS policies de whatsapp_messages

-- Se mensagens existem mas não aparecem na timeline:
-- 1. Verificar RLS policy: SELECT policy_name FROM pg_policies WHERE tablename = 'whatsapp_messages';
-- 2. Verificar se unifiedTimelineService está sendo chamado
-- 3. Verificar console do navegador por erros
