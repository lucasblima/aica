import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { telegramCommands } from '../data/demoData';

interface ChatMessage {
  type: 'user' | 'bot';
  text: string;
}

export function TelegramPreview() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIndex >= telegramCommands.length) return;

    const command = telegramCommands[currentIndex];

    // Show user message
    const userTimer = setTimeout(() => {
      setMessages((prev) => [...prev, { type: 'user', text: command.userMessage }]);

      // Show typing indicator
      setTimeout(() => {
        setShowTyping(true);

        // Show bot response after typing delay
        setTimeout(() => {
          setShowTyping(false);
          setMessages((prev) => [...prev, { type: 'bot', text: command.botResponse }]);
          setCurrentIndex((i) => i + 1);
        }, 800);
      }, 400);
    }, currentIndex === 0 ? 1000 : 1500);

    return () => clearTimeout(userTimer);
  }, [currentIndex]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showTyping]);

  return (
    <div className="max-w-sm mx-auto bg-[#0E1621] rounded-2xl overflow-hidden shadow-2xl border border-white/5">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#17212B] border-b border-white/5">
        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
          A
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">@AicaLifeBot</p>
          <p className="text-[#6AB2F2] text-xs">online</p>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto px-3 py-3 space-y-2 scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2B3945 transparent' }}
      >
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed ${
                  msg.type === 'user'
                    ? 'bg-[#2B5278] text-white rounded-xl rounded-br-sm'
                    : 'bg-[#182533] text-white/90 rounded-xl rounded-bl-sm'
                }`}
              >
                <span className="whitespace-pre-line">{msg.text}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {showTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-[#182533] rounded-xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#17212B] border-t border-white/5">
        <div className="flex-1 bg-[#242F3D] rounded-full px-4 py-2 text-white/30 text-sm">
          Mensagem...
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center cursor-default">
          <Send size={18} className="text-[#4EA4F6]" />
        </div>
      </div>
    </div>
  );
}
