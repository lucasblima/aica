import { motion } from 'framer-motion';
import {
  MessageCircle,
  Bot,
  CircleStop,
  Brain,
  Network,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

/* ── Data ── */

const traditionalSteps = [
  { icon: MessageCircle, label: 'Voce pergunta' },
  { icon: Bot, label: 'IA responde' },
  { icon: CircleStop, label: '...e acabou' },
] as const;

const aicaSteps = [
  { icon: MessageCircle, label: 'Voce conversa' },
  { icon: Brain, label: 'IA analisa padroes' },
  { icon: Network, label: 'Cruza dados entre modulos' },
  { icon: TrendingUp, label: 'Detecta tendencias' },
  { icon: Lightbulb, label: 'Sugere acoes com base em ciencia' },
] as const;

/* ── Animation variants ── */

const leftColumnVariants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const rightColumnVariants = {
  hidden: { opacity: 0, x: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.6, delay: 0.3, ease: 'easeOut' as const },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const stepFadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

/* ── Subcomponents ── */

/** Single step in the traditional (muted) column. */
function TraditionalStep({
  icon: Icon,
  label,
  isLast,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  label: string;
  isLast: boolean;
}) {
  return (
    <div className="relative flex items-start gap-4">
      {/* Dashed connector line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px border-l-2 border-dashed border-ceramic-text-secondary/20" />
      )}

      {/* Icon circle */}
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ceramic-cool">
        <Icon size={20} className="text-ceramic-text-secondary/40" />
      </div>

      {/* Label */}
      <span
        className={`pt-2 text-base ${
          isLast ? 'text-ceramic-text-secondary/40' : 'text-ceramic-text-secondary/60'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/** Single step in the AICA (vibrant) column. */
function AicaStep({
  icon: Icon,
  label,
  isLast,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  label: string;
  isLast: boolean;
}) {
  return (
    <motion.div variants={stepFadeIn} className="relative flex items-start gap-4">
      {/* Solid amber connector line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-ceramic-accent/30" />
      )}

      {/* Arrow indicator between steps */}
      {!isLast && (
        <div className="absolute left-[17px] bottom-[-4px] text-ceramic-accent/50 text-[10px] leading-none">
          &#9660;
        </div>
      )}

      {/* Glowing dot + icon */}
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ceramic-accent/10 ring-2 ring-ceramic-accent/20">
        <span className="absolute inset-0 rounded-full bg-ceramic-accent/5 animate-pulse" />
        <Icon size={20} className="relative text-ceramic-accent" />
      </div>

      {/* Label */}
      <span className="pt-2 text-base text-ceramic-text-primary">{label}</span>
    </motion.div>
  );
}

/** Loop arrow SVG that curves from the bottom back to the top. */
function LoopArrow({ isVisible }: { isVisible: boolean }) {
  return (
    <motion.div
      className="mt-4 flex justify-center"
      initial={{ opacity: 0 }}
      animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5, delay: 0.15 * aicaSteps.length + 0.3 }}
    >
      <motion.svg
        width="48"
        height="80"
        viewBox="0 0 48 80"
        fill="none"
        className="text-ceramic-accent"
        animate={isVisible ? { opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Curved path looping back up */}
        <path
          d="M24 0 C24 0, 44 10, 44 40 C44 70, 24 80, 24 80 C24 80, 4 70, 4 40 C4 10, 24 0, 24 0Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />
        {/* Arrow head at top */}
        <path d="M20 8 L24 0 L28 8" stroke="currentColor" strokeWidth="2" fill="none" />
      </motion.svg>
    </motion.div>
  );
}

/* ── Main component ── */

/**
 * DifferentiatorSection -- "Nao e so chat" side-by-side comparison.
 *
 * Left: muted linear flow (traditional chatbots).
 * Right: vibrant circular flow (AICA intelligence loop).
 */
export function DifferentiatorSection() {
  const { ref, isInView } = useScrollReveal();

  return (
    <section ref={ref} className="py-16 sm:py-24 px-6 bg-ceramic-cool">
      {/* Caption / Title */}
      <motion.h2
        className="text-3xl md:text-4xl font-black text-ceramic-text-primary text-center max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        Outros apps respondem perguntas. O AICA entende sua vida.
      </motion.h2>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto mt-16">
        {/* ── Left column (muted) ── */}
        <motion.div
          className="bg-ceramic-base/50 rounded-2xl p-5 sm:p-8"
          variants={leftColumnVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <h3 className="text-xl font-semibold text-ceramic-text-secondary mb-8">
            Apps tradicionais
          </h3>

          <div className="flex flex-col gap-8">
            {traditionalSteps.map((step, i) => (
              <TraditionalStep
                key={step.label}
                icon={step.icon}
                label={step.label}
                isLast={i === traditionalSteps.length - 1}
              />
            ))}
          </div>
        </motion.div>

        {/* ── Right column (vibrant) ── */}
        <motion.div
          className="bg-ceramic-base rounded-2xl p-5 sm:p-8 border-2 border-ceramic-accent/20"
          variants={rightColumnVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <h3 className="text-xl font-bold text-ceramic-accent mb-8">AICA</h3>

          <motion.div
            className="flex flex-col gap-8"
            variants={staggerContainer}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            {aicaSteps.map((step, i) => (
              <AicaStep
                key={step.label}
                icon={step.icon}
                label={step.label}
                isLast={i === aicaSteps.length - 1}
              />
            ))}
          </motion.div>

          {/* Loop arrow pulsing below the steps */}
          <LoopArrow isVisible={isInView} />

          <p className="mt-2 text-center text-sm text-ceramic-accent/70 font-medium">
            Ciclo continuo de inteligencia
          </p>
        </motion.div>
      </div>
    </section>
  );
}
