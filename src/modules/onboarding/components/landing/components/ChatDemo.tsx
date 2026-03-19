import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChatDemoMessage } from './ChatDemoMessage';
import { ChatDemoContext } from './ChatDemoContext';
import type { ChatScript } from '../data/chatScripts';

interface ChatDemoProps {
  script: ChatScript;
  onComplete?: () => void;
}

interface VisibleMessage {
  index: number;
  showContext: boolean;
}

export function ChatDemo({ script, onComplete }: ChatDemoProps) {
  const [visibleMessages, setVisibleMessages] = useState<VisibleMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const timeoutsRef = useRef<number[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    // Reset state on script change
    /* eslint-disable react-hooks/set-state-in-effect */
    setVisibleMessages([]);
    setIsTyping(false);
    clearTimeouts();
    /* eslint-enable react-hooks/set-state-in-effect */

    const { messages } = script;
    let elapsed = 500; // initial pause

    messages.forEach((msg, i) => {
      const isAI = msg.role === 'assistant';

      // Show typing indicator before AI messages
      if (isAI) {
        const typingStart = elapsed;
        const tid1 = window.setTimeout(() => setIsTyping(true), typingStart);
        timeoutsRef.current.push(tid1);
        elapsed += 1200;
      }

      // Show the message
      const showTime = elapsed;
      const tid2 = window.setTimeout(() => {
        if (isAI) setIsTyping(false);
        setVisibleMessages((prev) => [...prev, { index: i, showContext: false }]);
      }, showTime);
      timeoutsRef.current.push(tid2);

      // Show context card 400ms after message
      if (msg.context) {
        const contextTime = showTime + 400;
        const tid3 = window.setTimeout(() => {
          setVisibleMessages((prev) =>
            prev.map((vm) => (vm.index === i ? { ...vm, showContext: true } : vm))
          );
        }, contextTime);
        timeoutsRef.current.push(tid3);
        elapsed = contextTime;
      }

      // Gap between messages
      elapsed += isAI ? 500 : 800;
    });

    // Fire onComplete after the last message settles
    if (onComplete) {
      const tid = window.setTimeout(onComplete, elapsed + 200);
      timeoutsRef.current.push(tid);
    }

    return clearTimeouts;
  }, [script, onComplete, clearTimeouts]);

  return (
    <div className="space-y-3 min-h-[200px]">
      <AnimatePresence mode="popLayout">
        {visibleMessages.map(({ index, showContext }) => {
          const msg = script.messages[index];
          return (
            <div key={`${script.id}-${index}`}>
              <ChatDemoMessage role={msg.role} text={msg.text} />
              {showContext && msg.context && (
                <ChatDemoContext
                  icon={msg.context.icon}
                  label={msg.context.label}
                  modules={msg.context.modules}
                  details={msg.context.details}
                />
              )}
            </div>
          );
        })}

        {isTyping && (
          <ChatDemoMessage
            key={`${script.id}-typing`}
            role="assistant"
            text=""
            isTyping
          />
        )}
      </AnimatePresence>
    </div>
  );
}
