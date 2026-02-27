/**
 * Chat Module — Barrel export
 */

export { ChatShell } from './components/ChatShell'
export { ChatSidebar } from './components/ChatSidebar'
export { ChatMessageList } from './components/ChatMessageList'
export { ChatMessage } from './components/ChatMessage'
export { ChatInput } from './components/ChatInput'
export { ChatWelcome } from './components/ChatWelcome'
export { useChatEngine } from './hooks/useChatEngine'
export { useChatContext } from './hooks/useChatContext'
export type { UseChatEngineReturn } from './hooks/useChatEngine'
export type { RichMessage, ContentBlock, ContentBlockType } from './types'
