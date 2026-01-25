-- ============================================================================
-- FIX: Dropar policies existentes antes de executar migrations
-- Execute este script ANTES das migrations 0 e 3 se elas falharem
-- ============================================================================

-- ============================================================================
-- Migration 0: Document Processing - Drop all policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own documents" ON public.processed_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.processed_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.processed_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.processed_documents;
DROP POLICY IF EXISTS "Organization members can view shared documents" ON public.processed_documents;

DROP POLICY IF EXISTS "Users can view chunks of accessible documents" ON public.document_chunks;
DROP POLICY IF EXISTS "System can insert chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can delete chunks of own documents" ON public.document_chunks;

DROP POLICY IF EXISTS "Users can view embeddings of accessible chunks" ON public.document_embeddings;
DROP POLICY IF EXISTS "System can insert embeddings" ON public.document_embeddings;
DROP POLICY IF EXISTS "Users can delete embeddings of own chunks" ON public.document_embeddings;

DROP POLICY IF EXISTS "Users can view suggestions for own documents" ON public.document_link_suggestions;
DROP POLICY IF EXISTS "System can insert suggestions" ON public.document_link_suggestions;
DROP POLICY IF EXISTS "Users can update suggestions for own documents" ON public.document_link_suggestions;
DROP POLICY IF EXISTS "Users can delete suggestions for own documents" ON public.document_link_suggestions;

-- ============================================================================
-- Migration 3: Consciousness Points - Drop all policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own CP transactions" ON public.cp_transactions;
DROP POLICY IF EXISTS "Users can insert own CP transactions" ON public.cp_transactions;
DROP POLICY IF EXISTS "Service role full access to CP transactions" ON public.cp_transactions;

-- ============================================================================
-- SUCCESS! Agora execute as migrations 0 e 3 normalmente
-- ============================================================================
