/**
 * Chat Service - CRUD for chat_sessions + chat_messages
 *
 * Tables: chat_sessions (1:N) chat_messages
 * Columns: channel, direction (not role/source) — from migration 20260114000001
 */

import { supabase } from '@/services/supabaseClient'

export interface ChatSession {
  id: string
  user_id: string
  title: string | null
  module: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
  message_count?: number
}

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  content: string
  direction: 'inbound' | 'outbound'
  channel: string
  content_type: string
  model_used: string | null
  tokens_input: number | null
  tokens_output: number | null
  created_at: string
}

export interface SaveMessageInput {
  sessionId: string
  userId: string
  content: string
  direction: 'inbound' | 'outbound'
  modelUsed?: string
  tokensInput?: number
  tokensOutput?: number
}

export const chatService = {
  async createSession(userId: string, title?: string): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title: title || null })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getActiveSessions(limit = 10): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('is_archived', false)
      .is('module', null)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async getModuleSessions(module: string, limit = 20): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('is_archived', false)
      .eq('module', module)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async createModuleSession(userId: string, module: string, title?: string): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title: title || null, module })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getSessionMessages(sessionId: string, limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  async saveMessage(input: SaveMessageInput): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: input.sessionId,
        user_id: input.userId,
        content: input.content,
        direction: input.direction,
        channel: 'web',
        content_type: 'text',
        model_used: input.modelUsed || null,
        tokens_input: input.tokensInput || null,
        tokens_output: input.tokensOutput || null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId)

    if (error) throw error
  },

  async archiveSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ is_archived: true })
      .eq('id', sessionId)

    if (error) throw error
  },
}
