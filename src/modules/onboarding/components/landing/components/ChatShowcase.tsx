import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { ChatDemo } from './ChatDemo';
import { chatScripts } from '../data/chatScripts';

export function ChatShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [key, setKey] = useState(0);

  const handleSelectScript = useCallback((index: number) => {
    setActiveIndex(index);
    setKey((k) => k + 1);
  }, []);

  return (
    <section className="py-20 md:py-28 bg-ceramic-base">
      <div className="max-w-3xl mx-auto px-6">
        {/* Badge pill */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold tracking-wider uppercase">
            <MessageCircle className="w-3.5 h-3.5" />
            Conhe&#231;a a Vida
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          className="text-3xl md:text-5xl font-black tracking-tighter text-ceramic-text-primary text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Mais que um chatbot.
        </motion.h2>

        <motion.p
          className="text-center text-ceramic-text-secondary text-lg mb-10 max-w-xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          A Vida cruza seus dados de 8 m&#243;dulos para dar respostas que nenhum assistente gen&#233;rico consegue.
        </motion.p>

        {/* Suggestion pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {chatScripts.map((script, i) => (
            <button
              key={script.id}
              onClick={() => handleSelectScript(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                i === activeIndex
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-cool/80'
              }`}
            >
              {script.label}
            </button>
          ))}
        </div>

        {/* Chat container */}
        <motion.div
          className="bg-white/40 border border-ceramic-border/30 rounded-[2rem] p-6 md:p-8 shadow-ceramic-emboss mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ChatDemo key={key} script={chatScripts[activeIndex]} />
        </motion.div>

        {/* Telegram CTA */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <a
            href="https://t.me/AicaLifeBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-amber-500/25"
          >
            Experimentar no Telegram
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
