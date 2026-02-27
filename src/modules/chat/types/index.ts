/**
 * Chat Module — Types
 *
 * Extends DisplayMessage with rich content blocks for the full-page chat.
 * Re-exports shared types from chatService and useChatSession.
 */

import type { ChatAction } from '@/types/chatActions'

export type ContentBlockType =
  | 'text'
  | 'chart'
  | 'action'
  | 'dashboard'
  | 'file_preview'
  | 'task'
  | 'insight'
  | 'list'
  | 'form'
  | 'confirm'

export interface ContentBlock {
  type: ContentBlockType
  data: Record<string, unknown>
}

export interface RichMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  agent?: string
  actions?: ChatAction[]
  sources?: Array<{ title: string; url: string }>
  blocks?: ContentBlock[]
}

// Re-exports from shared services
export type { ChatSession, ChatMessage, SaveMessageInput } from '@/services/chatService'
export type { DisplayMessage, UseChatSessionReturn } from '@/hooks/useChatSession'
