import { motion } from 'framer-motion';
import { HeroDashboardDemo } from './HeroDashboardDemo';

interface HeroSectionProps {
  onOpenLogin?: () => void;
}

export function HeroSection({ onOpenLogin }: HeroSectionProps) {
  return (
    <section className="min-h-[100dvh] bg-ceramic-base flex flex-col items-center justify-center pt-20 pb-12 px-6">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center">
        {/* Headline */}
        <motion.h1
          className="text-4xl md:text-6xl font-black tracking-tighter text-ceramic-text-primary leading-[1.1] mb-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          Voce nao precisa de mais um app.
        </motion.h1>

        <motion.h1
          className="text-4xl md:text-6xl font-black tracking-tighter text-ceramic-text-primary leading-[1.1] mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        >
          Voce precisa de um sistema que te entenda.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          className="text-lg text-ceramic-text-secondary mb-10 max-w-lg"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
        >
          Seu sistema operacional de vida — tatil, unificado, inteligente.
        </motion.p>

        {/* Dashboard Demo */}
        <motion.div
          className="w-full max-w-lg mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
        >
          <HeroDashboardDemo />
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8, ease: 'easeOut' }}
        >
          <a
            href="https://t.me/AicaLifeBot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 rounded-full font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-amber-500/25 w-full sm:w-auto text-center"
          >
            Experimentar no Telegram
          </a>
          <button
            onClick={onOpenLogin}
            className="px-8 py-3 rounded-full font-bold text-ceramic-text-primary bg-ceramic-cool hover:bg-ceramic-cool/80 transition-all hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto"
          >
            Entrar
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="flex flex-col items-center gap-3 text-ceramic-text-secondary"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1.2, ease: 'easeOut' }}
        >
          <span className="text-sm font-bold tracking-widest uppercase">Deslize para baixo</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="w-px h-12 bg-gradient-to-b from-ceramic-text-secondary to-transparent"
          />
        </motion.div>
      </div>
    </section>
  );
}
