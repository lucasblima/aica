/**
 * ChatPage — Full-page chat experience
 *
 * Lazy-loaded at /chat route. Renders AicaChatFAB in permanent fullpage mode.
 */

import { AicaChatFAB } from '@/components/features/AicaChatFAB'

export default function ChatPage() {
  return <AicaChatFAB mode="fullpage" />
}
