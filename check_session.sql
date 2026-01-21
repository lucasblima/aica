-- Verificar sessão WhatsApp
SELECT 
  id,
  instance_name,
  status,
  connected_at,
  last_sync_at,
  contacts_synced,
  created_at
FROM whatsapp_sessions 
ORDER BY created_at DESC 
LIMIT 1;
