/**
 * VidaChatHero — Inline chat with neumorphic expand/collapse.
 *
 * Collapsed: ceramic emboss input bar + amber send button.
 * Expanded: scrollable message area above input with AnimatePresence.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, X } from 'lucide-react';
import { useChatSession } from '@/hooks/useChatSession';
import type { DisplayMessage } from '@/hooks/useChatSession';
import { formatMarkdownToHTML } from '@/lib/formatMarkdown';

export function VidaChatHero() {
   const {
      messages,
      isLoading,
      error,
      sendMessage,
   } = useChatSession();

   const [input, setInput] = useState('');
   const [expanded, setExpanded] = useState(false);
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLInputElement>(null);

   // Expand when first message arrives
   useEffect(() => {
      if (messages.length > 0) setExpanded(true);
   }, [messages.length]);

   // Auto-scroll on new messages
   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [messages, isLoading]);

   const handleSend = useCallback(async () => {
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      setInput('');
      setExpanded(true);
      await sendMessage(trimmed);
   }, [input, isLoading, sendMessage]);

   const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSend();
      }
   }, [handleSend]);

   return (
      <div className="ceramic-card overflow-hidden">
         {/* Expanded chat area */}
         <AnimatePresence>
            {expanded && messages.length > 0 && (
               <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
               >
                  {/* Collapse button */}
                  <div className="flex justify-end px-4 pt-3">
                     <button
                        onClick={() => setExpanded(false)}
                        className="w-6 h-6 rounded-full ceramic-inset flex items-center justify-center hover:scale-110 transition-transform"
                        aria-label="Fechar chat"
                     >
                        <X size={12} className="text-ceramic-text-secondary" />
                     </button>
                  </div>

                  {/* Messages */}
                  <div className="max-h-[50vh] overflow-y-auto px-4 pb-3 space-y-3">
                     {messages.map((msg: DisplayMessage) => (
                        <div
                           key={msg.id}
                           className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                           <div
                              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                 msg.role === 'user'
                                    ? 'bg-amber-500 text-white rounded-br-md'
                                    : 'bg-ceramic-cool text-ceramic-text-primary rounded-bl-md'
                              }`}
                           >
                              {msg.role === 'assistant' ? (
                                 <div
                                    className="prose prose-sm max-w-none [&_strong]:font-semibold [&_code]:text-xs [&_ul]:my-1 [&_li]:my-0"
                                    dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(msg.content) }}
                                 />
                              ) : (
                                 <p>{msg.content}</p>
                              )}
                           </div>
                        </div>
                     ))}

                     {isLoading && (
                        <div className="flex justify-start">
                           <div className="bg-ceramic-cool rounded-2xl rounded-bl-md px-4 py-2.5">
                              <Loader2 size={16} className="animate-spin text-ceramic-text-secondary" />
                           </div>
                        </div>
                     )}

                     {error && (
                        <div className="text-center">
                           <p className="text-xs text-ceramic-error">{error}</p>
                        </div>
                     )}

                     <div ref={messagesEndRef} />
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Input bar */}
         <div className="flex items-center gap-2 p-3">
            <input
               ref={inputRef}
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               onFocus={() => { if (messages.length > 0) setExpanded(true); }}
               placeholder="Como posso te ajudar?"
               disabled={isLoading}
               className="flex-1 bg-ceramic-cool rounded-xl px-4 py-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/60 outline-none focus:ring-2 focus:ring-amber-500/30 transition-shadow"
            />
            <button
               onClick={handleSend}
               disabled={!input.trim() || isLoading}
               className="shrink-0 w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-amber-600 transition-colors"
               aria-label="Enviar"
            >
               <Send size={16} />
            </button>
         </div>
      </div>
   );
}
