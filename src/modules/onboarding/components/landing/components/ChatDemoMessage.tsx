import { motion } from 'framer-motion';

interface ChatDemoMessageProps {
  role: 'user' | 'assistant';
  text: string;
  isTyping?: boolean;
}

export function ChatDemoMessage({ role, text, isTyping }: ChatDemoMessageProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
          isUser
            ? 'bg-ceramic-cool rounded-br-md text-ceramic-text-primary'
            : 'bg-amber-50 border border-amber-200/50 rounded-bl-md text-ceramic-text-primary'
        }`}
      >
        {isTyping ? (
          <div className="flex items-center gap-1.5 py-1 px-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        ) : (
          text
        )}
      </div>
    </motion.div>
  );
}
