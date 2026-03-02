import { motion } from 'framer-motion';
import { Award, Star, Trophy, Flame, Crown } from 'lucide-react';
import { CP_CATEGORIES } from '../data/landingData';
import { StreakRing } from './StreakRing';
import { useScrollReveal } from '../hooks/useScrollReveal';

/* ── Demo progress percentages for each CP category ── */

const CP_DEMO_WIDTHS = ['70%', '55%', '80%', '65%', '45%'] as const;

/* ── Badge showcase icons ── */

const BADGE_ICONS = [Award, Star, Trophy, Flame, Crown] as const;

/* ── Animation variants ── */

const titleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const columnVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: 'easeOut' as const },
  }),
};

/**
 * GamificationSection -- CP categories + Compassionate Streaks.
 *
 * Left column: 5 consciousness-point categories with animated progress bars.
 * Right column: Compassionate streak ring with grace-period dots.
 * Below: Badge showcase with 5 icon circles.
 */
export function GamificationSection() {
  const { ref, isInView } = useScrollReveal();

  return (
    <section ref={ref} className="py-16 sm:py-24 px-6 bg-ceramic-cool">
      {/* Title block */}
      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={titleVariants}
        className="text-center"
      >
        <h2 className="text-3xl md:text-4xl font-black text-center text-ceramic-text-primary">
          Gamificacao que respeita quem voce e
        </h2>
        <p className="text-lg text-ceramic-text-secondary text-center mt-4 max-w-2xl mx-auto">
          Baseada em pesquisa sobre motivacao intrinseca. Recompensa consciencia,
          nao repeticao mecanica.
        </p>
      </motion.div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto mt-12">
        {/* ── Left column: Consciousness Points ── */}
        <motion.div
          custom={0.2}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={columnVariants}
        >
          <div className="flex flex-col gap-5">
            {CP_CATEGORIES.map((cat, i) => (
              <div key={cat.id}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl" role="img" aria-label={cat.label}>
                    {cat.icon}
                  </span>
                  <div>
                    <span className="font-semibold text-ceramic-text-primary">
                      {cat.label}
                    </span>
                    <span className="text-sm text-ceramic-text-secondary ml-2">
                      {cat.description}
                    </span>
                  </div>
                </div>

                {/* Animated progress bar */}
                <div className="w-full h-2 rounded-full overflow-hidden bg-ceramic-border">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                    initial={{ width: '0%' }}
                    animate={isInView ? { width: CP_DEMO_WIDTHS[i] } : { width: '0%' }}
                    transition={{
                      type: 'spring',
                      stiffness: 60,
                      damping: 15,
                      delay: 0.4 + i * 0.2,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-ceramic-text-secondary mt-6 italic">
            Limite diario de 100 CP. Qualidade &gt; quantidade.
          </p>
        </motion.div>

        {/* ── Right column: Compassionate Streak ── */}
        <motion.div
          custom={0.5}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={columnVariants}
          className="flex flex-col items-center justify-center"
        >
          <StreakRing current={47} total={50} isVisible={isInView} />

          <p className="text-sm text-ceramic-text-secondary mt-6 max-w-sm text-center">
            Perdeu um dia? Tudo bem. Voce tem 4 grace periods por mes. E se
            precisar recomecar, 3 tarefas recuperam seu streak.
          </p>
          <p className="text-sm text-ceramic-text-secondary mt-4 italic font-medium max-w-sm text-center">
            Nao e sobre perfeicao. E sobre consistencia com compaixao.
          </p>
        </motion.div>
      </div>

      {/* ── Badge showcase ── */}
      <motion.div
        className="mt-12 flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 1.8 }}
      >
        <div className="flex gap-3">
          {BADGE_ICONS.map((Icon, i) => (
            <motion.div
              key={i}
              className="w-12 h-12 rounded-full bg-ceramic-accent/10 border-2 border-ceramic-accent/30 flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 15,
                delay: 2.0 + i * 0.2,
              }}
            >
              <Icon size={20} className="text-ceramic-accent" />
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-sm text-ceramic-text-secondary mt-4"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 3.0 }}
        >
          16+ tipos de conquistas com logica composta
        </motion.p>
      </motion.div>
    </section>
  );
}
