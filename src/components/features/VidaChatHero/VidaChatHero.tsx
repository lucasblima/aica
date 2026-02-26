/**
 * VidaChatHero — Hero CTA that opens the existing AicaChatFAB.
 *
 * Renders a ceramic input bar on VidaPage. On interaction (focus or send),
 * dispatches 'aica-chat-open' custom event to open the real chat FAB
 * with all its existing features (sessions, agents, actions, context sidebar).
 *
 * Zero chat logic here — 100% reuse of AicaChatFAB.
 */

import { useState, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';

export function VidaChatHero() {
   const [input, setInput] = useState('');
   const inputRef = useRef<HTMLInputElement>(null);

   const openChat = (message?: string) => {
      // Blur the hero input so mobile keyboard dismisses and FAB input can take over
      inputRef.current?.blur();
      window.dispatchEvent(
         new CustomEvent('aica-chat-open', { detail: { message, fullscreen: true } })
      );
      setInput('');
   };

   const handleSend = () => {
      const trimmed = input.trim();
      if (!trimmed) return;
      openChat(trimmed);
   };

   const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSend();
      }
   };

   return (
      <div className="ceramic-card overflow-hidden">
         <div className="flex items-center gap-3 p-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
               <MessageCircle size={16} className="text-amber-600" />
            </div>
            <input
               ref={inputRef}
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               onFocus={() => {
                  if (!input.trim()) openChat();
               }}
               placeholder="Como posso te ajudar?"
               className="flex-1 bg-ceramic-cool rounded-xl px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/60 outline-none focus:ring-2 focus:ring-amber-500/30 transition-shadow"
            />
            <button
               onClick={handleSend}
               disabled={!input.trim()}
               className="shrink-0 w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-amber-600 transition-colors"
               aria-label="Enviar"
            >
               <Send size={16} />
            </button>
         </div>
      </div>
   );
}
