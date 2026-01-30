-- =============================================================================
-- CONTACT NETWORK SCHEMA CONSOLIDATION
-- Issue: Contatos WhatsApp nao aparecem na pagina "Pessoas"
--
-- Problema: Discrepancia entre schema do banco (contact_name, contact_phone)
-- e codigo TypeScript/Edge Functions (name, phone_number)
--
-- Esta migration normaliza o schema para compatibilidade total.
-- =============================================================================

-- =============================================================================
-- PART 1: ADICIONAR COLUNAS FALTANTES
-- =============================================================================

-- Adicionar coluna 'name' se nao existir
ALTER TABLE contact_network ADD COLUMN IF NOT EXISTS name TEXT;

-- Adicionar coluna 'phone_number' se nao existir
ALTER TABLE contact_network ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Adicionar coluna 'whatsapp_id' se nao existir (usado para upsert)
ALTER TABLE contact_network ADD COLUMN IF NOT EXISTS whatsapp_id TEXT;

-- Adicionar coluna 'sync_source' se nao existir
ALTER TABLE contact_network ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'manual';

-- Adicionar coluna 'last_synced_at' se nao existir
ALTER TABLE contact_network ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Adicionar coluna 'last_whatsapp_message_at' se nao existir
ALTER TABLE contact_network ADD COLUMN IF NOT EXISTS last_whatsapp_message_at TIMESTAMPTZ;

-- Adicionar coluna 'tags' se nao existir
ALTER TABLE contact_network ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Adicionar coluna 'profile_picture_url' se nao existir
ALTER TABLE contact_network ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- =============================================================================
-- PART 2: MIGRAR DADOS DE COLUNAS LEGADAS
-- =============================================================================

-- Copiar contact_name para name onde name esta NULL
UPDATE contact_network
SET name = contact_name
WHERE name IS NULL AND contact_name IS NOT NULL;

-- Copiar contact_phone para phone_number onde phone_number esta NULL
UPDATE contact_network
SET phone_number = contact_phone
WHERE phone_number IS NULL AND contact_phone IS NOT NULL;

-- =============================================================================
-- PART 3: CRIAR UNIQUE CONSTRAINT PARA UPSERT
-- =============================================================================

-- Remover index anterior se existir
DROP INDEX IF EXISTS idx_contact_network_user_whatsapp;

-- Criar unique index para (user_id, whatsapp_id) - necessario para upsert na Edge Function
-- WHERE whatsapp_id IS NOT NULL permite multiplos NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_network_user_whatsapp
ON contact_network(user_id, whatsapp_id)
WHERE whatsapp_id IS NOT NULL;

-- Index adicional para buscas por phone_number
CREATE INDEX IF NOT EXISTS idx_contact_network_phone
ON contact_network(phone_number)
WHERE phone_number IS NOT NULL;

-- Index para sync_source (filtrar contatos por origem)
CREATE INDEX IF NOT EXISTS idx_contact_network_sync_source
ON contact_network(sync_source);

-- =============================================================================
-- PART 4: CORRIGIR RLS POLICIES
-- =============================================================================

-- Remover policies antigas que podem estar incorretas
DROP POLICY IF EXISTS "contact_network_select_own" ON contact_network;
DROP POLICY IF EXISTS "contact_network_insert_own" ON contact_network;
DROP POLICY IF EXISTS "contact_network_update_own" ON contact_network;
DROP POLICY IF EXISTS "contact_network_delete_own" ON contact_network;

-- Habilitar RLS se nao estiver habilitado
ALTER TABLE contact_network ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: usuarios podem ver apenas seus proprios contatos
CREATE POLICY "contact_network_select_own" ON contact_network
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy INSERT: usuarios podem inserir contatos para si mesmos
CREATE POLICY "contact_network_insert_own" ON contact_network
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE: usuarios podem atualizar apenas seus proprios contatos
CREATE POLICY "contact_network_update_own" ON contact_network
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Policy DELETE: usuarios podem deletar apenas seus proprios contatos
CREATE POLICY "contact_network_delete_own" ON contact_network
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- PART 5: GRANT PERMISSIONS
-- =============================================================================

-- Garantir permissoes para authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_network TO authenticated;

-- Service role precisa de acesso total para Edge Functions
GRANT ALL ON contact_network TO service_role;

-- =============================================================================
-- PART 6: CRIAR TRIGGER PARA updated_at
-- =============================================================================

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_contact_network_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS contact_network_updated_at ON contact_network;

-- Criar trigger
CREATE TRIGGER contact_network_updated_at
  BEFORE UPDATE ON contact_network
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_network_updated_at();

-- =============================================================================
-- VERIFICATION QUERIES (para rodar manualmente apos migration)
-- =============================================================================

-- Verificar estrutura final da tabela:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'contact_network'
-- ORDER BY ordinal_position;

-- Verificar policies:
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'contact_network';

-- Verificar indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'contact_network';

-- Contar contatos por sync_source:
-- SELECT sync_source, COUNT(*)
-- FROM contact_network
-- GROUP BY sync_source;
