import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  FileText,
  Sparkles,
  Search,
  Brain,
  Presentation,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface FeatureCard {
  icons: [React.ComponentType<{ className?: string }>, React.ComponentType<{ className?: string }>];
  title: string;
  description: string;
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    icons: [FileText, Sparkles],
    title: 'Parsing de PDF com IA',
    description:
      'Envie o edital em PDF. O AICA extrai requisitos, prazos e criterios automaticamente.',
  },
  {
    icons: [Search, Brain],
    title: 'Busca Semantica',
    description:
      'Pergunte em linguagem natural: "Qual o limite de financiamento?" O AICA encontra no documento.',
  },
  {
    icons: [Presentation, Sparkles],
    title: 'Geracao de Deck',
    description:
      'Gere apresentacoes profissionais a partir dos dados do edital e do seu perfil de pesquisador.',
  },
];

/* ------------------------------------------------------------------ */
/*  AnimatedNumber — count-up when visible                             */
/* ------------------------------------------------------------------ */

function AnimatedNumber({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' as never });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!isInView) return;

    const duration = 1200; // ms
    const start = performance.now();
    let rafId: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay((value * eased).toFixed(decimals));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [isInView, value, decimals]);

  return <span ref={ref}>{display}</span>;
}

/* ------------------------------------------------------------------ */
/*  GrantsShowcaseSection                                              */
/* ------------------------------------------------------------------ */

/**
 * GrantsShowcaseSection — Dedicated section for the Grants (Captacao)
 * module, targeting Brazilian researchers working with FAPERJ, FINEP
 * and CNPq grants.
 */
export function GrantsShowcaseSection() {
  const { ref: sectionRef, isInView } = useScrollReveal({ margin: '-80px' as never });

  return (
    <section
      ref={sectionRef}
      className="py-16 sm:py-24 px-6 bg-ceramic-cool"
    >
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center"
      >
        <h2 className="text-3xl md:text-4xl font-black text-center text-ceramic-text-primary">
          Pesquisador brasileiro? O AICA foi feito para voce.
        </h2>
        <p className="text-lg text-ceramic-text-secondary text-center mt-4 max-w-3xl mx-auto">
          Nenhuma outra ferramenta faz parsing de editais da FAPERJ, FINEP e CNPq
          com inteligencia artificial.
        </p>
      </motion.div>

      {/* ---- Feature Cards ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
        {FEATURE_CARDS.map((card, index) => {
          const [PrimaryIcon, SecondaryIcon] = card.icons;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{
                duration: 0.5,
                delay: 0.1 * index,
                ease: 'easeOut',
              }}
              className="bg-ceramic-base rounded-2xl p-6 sm:p-8 shadow-ceramic-emboss text-center"
            >
              {/* Icon area */}
              <div className="w-16 h-16 rounded-2xl bg-ceramic-accent/10 flex items-center justify-center mx-auto relative">
                <PrimaryIcon className="w-7 h-7 text-ceramic-accent" />
                <SecondaryIcon className="w-4 h-4 text-ceramic-accent/60 absolute -bottom-1 -right-1" />
              </div>

              <h3 className="font-bold text-ceramic-text-primary text-lg mt-4">
                {card.title}
              </h3>
              <p className="text-sm text-ceramic-text-secondary mt-2">
                {card.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* ---- Stats Row ---- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
        className="flex flex-col md:flex-row gap-6 justify-center items-center mt-12 max-w-4xl mx-auto"
      >
        {/* Stat 1 — Market size */}
        <div className="bg-ceramic-base rounded-xl p-4 flex items-center gap-3 shadow-ceramic-emboss">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-sm text-ceramic-text-primary">
            Mercado de grants: USD{' '}
            <span className="font-bold tabular-nums">
              <AnimatedNumber value={68.9} />
            </span>
            M &rarr; USD{' '}
            <span className="font-bold tabular-nums">
              <AnimatedNumber value={170.8} />
            </span>
            M ate 2033
          </p>
        </div>

        {/* Stat 2 — Researcher Strength Score */}
        <div className="bg-ceramic-base rounded-xl p-4 flex items-center gap-3 shadow-ceramic-emboss">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-sm text-ceramic-text-primary">
            Researcher Strength Score: h-index + impacto + colaboracao
          </p>
        </div>
      </motion.div>

      {/* ---- CTA Button ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.4, delay: 0.6, ease: 'easeOut' }}
        className="text-center mt-8"
      >
        <a
          href="#waitlist"
          className="border-2 border-ceramic-accent text-ceramic-accent rounded-xl px-6 py-3 font-semibold hover:bg-ceramic-accent hover:text-white transition-colors inline-block"
        >
          Explorar modulo Captacao
        </a>
      </motion.div>
    </section>
  );
}
