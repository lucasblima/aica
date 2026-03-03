import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Loader2, Plus, Trash2, MessageCircle } from 'lucide-react';
import type { ChatMessage } from '../../hooks/useResearchChat';

interface ResearchChatSheetProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string) => void;
  onClose: () => void;
  onInsertSuggestion?: (text: string, targetSection: string) => void;
  onClearChat: () => void;
}

export function ResearchChatSheet({
  messages, isLoading, error, onSendMessage, onClose, onInsertSuggestion, onClearChat,
}: ResearchChatSheetProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="flex flex-col h-full bg-ceramic-base border-l border-ceramic-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ceramic-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-ceramic-text-primary">Converse com Aica</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onClearChat} className="p-1.5 rounded-lg hover:bg-ceramic-cool" title="Limpar conversa">
            <Trash2 className="w-3.5 h-3.5 text-ceramic-text-secondary" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ceramic-cool">
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-8 h-8 text-ceramic-text-secondary/30 mx-auto mb-2" />
            <p className="text-sm text-ceramic-text-secondary">Pergunte sobre o convidado, sugira perguntas para a entrevista, ou peca para aprofundar algum topico.</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-amber-500 text-white'
                : 'bg-ceramic-cool text-ceramic-text-primary'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.suggestedCard && onInsertSuggestion && (
                <button
                  onClick={() => onInsertSuggestion(msg.suggestedCard!.text, msg.suggestedCard!.targetSection)}
                  className="mt-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-xs font-medium text-amber-700 hover:bg-amber-500/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Inserir no dossie: {msg.suggestedCard.title}
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-ceramic-cool rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              <span className="text-sm text-ceramic-text-secondary">Pensando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2 rounded-lg bg-ceramic-error/10 text-xs text-ceramic-error">{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-ceramic-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre o convidado..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg bg-ceramic-cool border border-ceramic-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
