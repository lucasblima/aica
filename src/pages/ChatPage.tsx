/**
 * ChatPage — Full-page chat experience
 *
 * Lazy-loaded at /chat route. Full viewport, no PageShell wrapper.
 * Uses useChatEngine for session + streaming state.
 */

import { useChatEngine } from '@/modules/chat/hooks/useChatEngine'
import { ChatShell } from '@/modules/chat/components/ChatShell'

export default function ChatPage() {
  const engine = useChatEngine()

  return <ChatShell engine={engine} />
}
