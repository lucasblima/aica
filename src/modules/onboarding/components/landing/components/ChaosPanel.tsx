import { motion, useReducedMotion } from 'framer-motion';
import type { DemoMessage } from '../types';

interface ChaosPanelProps {
  messages: DemoMessage[];
  isProcessing: boolean;
}

export function ChaosPanel({ messages, isProcessing }: ChaosPanelProps) {
  return (
    <div
      className="relative min-h-[700px] p-8 rounded-3xl overflow-hidden bg-gradient-to-br from-ceramic-base to-[#E5E3DA]"
      role="region"
      aria-label="Mensagens desorganizadas"
      aria-live="polite"
    >
      {/* Header */}
      <div className="mb-8 relative z-10">
        <h3 className="text-4xl font-black text-ceramic-text-primary mb-4 tracking-tighter">
          O ruído primordial
        </h3>
        <p className="text-lg text-ceramic-text-secondary font-medium">
          Mensagens dispersas, potencial inexplorado.
        </p>
      </div>

      {/* Floating Messages */}
      <div className="relative h-[600px]">
        {messages.map((message, index) => (
          <FloatingMessageCard
            key={message.id}
            message={message}
            index={index}
            total={messages.length}
            isProcessing={isProcessing}
          />
        ))}
      </div>
    </div>
  );
}

function FloatingMessageCard({
  message,
  index,
  total,
  isProcessing
}: {
  message: DemoMessage;
  index: number;
  total: number;
  isProcessing: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  const categoryColorClasses = {
    atlas: 'bg-ceramic-info',
    journey: 'bg-ceramic-accent',
    studio: 'bg-ceramic-warning',
    connections: 'bg-ceramic-success'
  };

  // Posicao aleatoria mas deterministica (baseada no index)
  const randomX = ((index * 223.7) % 80) + 5;
  const randomY = ((index * 163.7) % 85) + 5;
  const randomRotate = (index * 23.5) % 30 - 15;
  const zIndex = total - index;

  const categoryColorClass = message.category ? categoryColorClasses[message.category] : 'bg-ceramic-text-secondary';

  const formatRelativeDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return 'hoje';
    if (diffInDays === 1) return 'ontem';
    return `${diffInDays} dias atrás`;
  };

  return (
    <motion.div
      initial={{
        x: `${randomX}%`,
        y: `${randomY}%`,
        rotate: randomRotate,
        opacity: 0,
        scale: 0.8
      }}
      animate={{
        x: `${randomX}%`,
        y: isProcessing ? '-120%' : [`${randomY}%`, `${randomY + (index % 2 === 0 ? 2 : -2)}%`, `${randomY}%`],
        rotate: shouldReduceMotion ? 0 : (isProcessing ? 0 : [randomRotate, randomRotate + 2, randomRotate]),
        opacity: isProcessing ? 0 : 1,
        scale: isProcessing ? 0.5 : 1
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : (isProcessing ? 0.6 : 5 + (index % 3)),
        delay: isProcessing ? index * 0.05 : index * 0.08,
        ease: isProcessing ? 'easeIn' : 'easeInOut',
        repeat: isProcessing ? 0 : Infinity,
        repeatType: 'reverse'
      }}
      className="absolute max-w-[240px] p-5 bg-white/80 backdrop-blur-md rounded-[20px] shadow-[4px_4px_16px_rgba(163,158,145,0.15)] border border-white/40"
      style={{ zIndex }}
    >
      {/* Category Indicator */}
      <div
        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${categoryColorClass}`}
      />

      {/* Message Text */}
      <p className="text-sm text-ceramic-text-primary font-medium line-clamp-3 leading-relaxed tracking-tight">
        {message.text}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-ceramic-border">
        <span className="text-xs">
          {message.sender === 'user' ? '📤' : '📥'}
        </span>
        <span className="text-xs font-bold text-ceramic-text-primary">
          {message.senderName}
        </span>
        <span className="text-[10px] text-ceramic-text-secondary">
          • {formatRelativeDate(message.timestamp)}
        </span>
        {/* Chaos Level Indicator */}
        <div className="ml-auto flex items-center gap-1">
          <div
            className="w-8 h-1 rounded-full bg-ceramic-cool overflow-hidden"
            title={`Nivel de caos: ${message.chaos_level}%`}
          >
            <div
              className="h-full bg-ceramic-warning rounded-full"
              style={{ width: `${message.chaos_level}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
