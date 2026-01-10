import { motion, useReducedMotion } from 'framer-motion';
import type { DemoMessage } from '../types';

interface ChaosPanelProps {
  messages: DemoMessage[];
  isProcessing: boolean;
}

export function ChaosPanel({ messages, isProcessing }: ChaosPanelProps) {
  return (
    <div
      className="relative min-h-[600px] p-8 rounded-3xl overflow-hidden bg-gradient-to-br from-ceramic-base to-[#E5E3DA]"
      role="region"
      aria-label="Mensagens desorganizadas"
      aria-live="polite"
    >
      {/* Header */}
      <div className="mb-8 relative z-10">
        <h3 className="text-3xl font-black text-ceramic-text-primary mb-2">
          Caos
        </h3>
        <p className="text-ceramic-text-secondary">
          Mensagens desorganizadas, informacao dispersa
        </p>
      </div>

      {/* Floating Messages */}
      <div className="relative h-[500px]">
        {messages.map((message, index) => (
          <FloatingMessageCard
            key={message.id}
            message={message}
            index={index}
            isProcessing={isProcessing}
            total={messages.length}
          />
        ))}
      </div>

      {/* Chaos Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg width="100%" height="100%">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" opacity="0.3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

interface FloatingMessageCardProps {
  message: DemoMessage;
  index: number;
  isProcessing: boolean;
  total: number;
}

// Category colors using Tailwind classes
const categoryColorClasses: Record<string, string> = {
  atlas: 'bg-blue-500',
  journey: 'bg-purple-500',
  studio: 'bg-orange-500',
  connections: 'bg-emerald-500'
};

function FloatingMessageCard({
  message,
  index,
  isProcessing,
  total
  const categoryColors: Record<string, string> = {
    atlas: 'bg-blue-500',
    journey: 'bg-purple-500',
    studio: 'bg-orange-500',
    connections: 'bg-emerald-500'
  };

  const categoryColorClass = message.category ? categoryColors[message.category] : 'bg-gray-500';

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
        y: isProcessing ? '-120%' : `${randomY}%`,
        rotate: shouldReduceMotion ? 0 : (isProcessing ? 0 : randomRotate),
        opacity: isProcessing ? 0 : 1,
        scale: isProcessing ? 0.5 : 1
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : (isProcessing ? 0.6 : 0.5),
        delay: isProcessing ? index * 0.05 : index * 0.08,
        ease: isProcessing ? 'easeIn' : 'easeOut'
      }}
      className="absolute max-w-[220px] p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-[0_4px_20px_rgba(163,158,145,0.25)]"
      style={{
        zIndex
      }}
    >
      {/* Category Indicator */}
      <div
        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${categoryColorClass}`}
      />

      {/* Message Text */}
      <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
        {message.text}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
        <span className="text-xs">
          {message.sender === 'user' ? '📤' : '📥'}
        </span>
        <span className="text-xs text-gray-400">
          {formatRelativeDate(message.timestamp)}
        </span>
        {/* Chaos Level Indicator */}
        <div className="ml-auto flex items-center gap-1">
          <div
            className="w-8 h-1 rounded-full bg-gray-200 overflow-hidden"
            title={`Nivel de caos: ${message.chaos_level}%`}
          >
            <div
              className="h-full bg-orange-400 rounded-full"
              style={{ width: `${message.chaos_level}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  const shouldReduceMotion = useReducedMotion();

  // Posicao aleatoria mas deterministica (baseada no index)
  // Usando golden ratio para distribuicao mais natural
  const randomX = ((index * 137.5) % 70) + 5; // 5-75%
  const randomY = ((index * 47) % 70) + 5;    // 5-75%
  const randomRotate = (index * 13) % 20 - 10; // -10 to +10 degrees
  const zIndex = total - index; // Cards no topo ficam na frente

  const categoryColorClass = message.category ? categoryColorClasses[message.category] : 'bg-gray-500';

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
        y: isProcessing ? '-120%' : `${randomY}%`,
        rotate: shouldReduceMotion ? 0 : (isProcessing ? 0 : randomRotate),
        opacity: isProcessing ? 0 : 1,
        scale: isProcessing ? 0.5 : 1
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : (isProcessing ? 0.6 : 0.5),
        delay: isProcessing ? index * 0.05 : index * 0.08,
        ease: isProcessing ? 'easeIn' : 'easeOut'
      }}
      className="absolute max-w-[220px] p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-[0_4px_20px_rgba(163,158,145,0.25)]"
      style={{ zIndex }}
    >
      {/* Category Indicator */}
      <div
        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${categoryColorClass}`}
      />

      {/* Message Text */}
      <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
        {message.text}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
        <span className="text-xs">
          {message.sender === 'user' ? '📤' : '📥'}
        </span>
        <span className="text-xs text-gray-400">
          {formatRelativeDate(message.timestamp)}
        </span>
        {/* Chaos Level Indicator */}
        <div className="ml-auto flex items-center gap-1">
          <div
            className="w-8 h-1 rounded-full bg-gray-200 overflow-hidden"
            title={`Nivel de caos: ${message.chaos_level}%`}
          >
            <div
              className="h-full bg-orange-400 rounded-full"
              style={{ width: `${message.chaos_level}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atras`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
