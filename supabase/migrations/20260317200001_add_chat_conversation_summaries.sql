-- ============================================================================
-- MIGRATION: Chat Conversation Summaries
-- Phase 1.1: Session Memory (backend)
-- Date: 2026-03-17
--
-- PURPOSE:
-- Store AI-generated summaries of chat sessions for cross-session memory.
-- The summarize-chat-session Edge Function writes here; gemini-chat reads
-- recent summaries to give the AI context about previous conversations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_conversation_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  key_topics TEXT[] DEFAULT '{}',
  key_decisions TEXT[] DEFAULT '{}',
  emotional_themes TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE chat_conversation_summaries IS
  'AI-generated summaries of chat sessions for cross-session memory context';

-- RLS (mandatory per CLAUDE.md)
ALTER TABLE public.chat_conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own summaries" ON public.chat_conversation_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries" ON public.chat_conversation_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries" ON public.chat_conversation_summaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries" ON public.chat_conversation_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- Index for efficient lookup by user + recency (used by gemini-chat buildUserContext)
CREATE INDEX idx_chat_summaries_user_session
  ON public.chat_conversation_summaries(user_id, created_at DESC);

-- Index for lookup by session_id (used by summarize-chat-session to check duplicates)
CREATE INDEX idx_chat_summaries_session_id
  ON public.chat_conversation_summaries(session_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversation_summaries TO authenticated;
