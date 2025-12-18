import React from 'react';
import { motion } from 'framer-motion';
import { Mic, HelpCircle, TrendingUp } from 'lucide-react';
import { ScrollStorySection } from './ScrollStorySection';

/**
 * ScrollStory Section
 *
 * "How it Works" reimagined as a scroll-triggered narrative.
 * Three sections with zig-zag layout:
 * 1. "Fale." - Microphone UI
 * 2. "Reflita." - Daily Question Card
 * 3. "Evolua." - Level/XP Bar
 *
 * Each section fades in as user scrolls, creating an engaging story.
 */
export function ScrollStory() {
  return (
    <div className="bg-ceramic-base">
      {/* Section Header */}
      <motion.div
        className="text-center py-16 md:py-20 px-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-ceramic-text-primary tracking-tight mb-4">
          Simples e poderoso
        </h2>
        <p className="text-lg text-ceramic-text-secondary max-w-xl mx-auto">
          Tres passos para transformar sua vida
        </p>
      </motion.div>

      {/* Story Sections */}
      <ScrollStorySection
        index={0}
        title="Fale."
        description="Capture pensamentos na velocidade da fala. Sem digitacao, sem atrito. Apenas voce e suas ideias."
        visual={<SpeakVisual />}
      />

      <ScrollStorySection
        index={1}
        title="Reflita."
        description="Perguntas que mudam sua perspectiva. Cada dia, uma oportunidade de se conhecer melhor."
        visual={<ReflectVisual />}
      />

      <ScrollStorySection
        index={2}
        title="Evolua."
        description="Visualize seu progresso tangivel. Niveis, conquistas e metricas que celebram sua jornada."
        visual={<EvolveVisual />}
      />
    </div>
  );
}

/**
 * "Fale." Visual - Microphone Recording UI
 */
function SpeakVisual() {
  return (
    <div className="w-64 sm:w-72 md:w-80 bg-ceramic-base p-6 md:p-8 rounded-2xl md:rounded-3xl">
      {/* Recording indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <motion.div
          className="w-2 h-2 rounded-full bg-red-500"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-sm text-ceramic-text-secondary">Gravando...</span>
      </div>

      {/* Mic Button */}
      <div className="flex justify-center mb-6">
        <motion.div
          className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-ceramic-base flex items-center justify-center"
          style={{
            boxShadow: `
              inset 6px 6px 12px rgba(163, 158, 145, 0.30),
              inset -6px -6px 12px rgba(255, 255, 255, 1.0)
            `
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Mic className="w-10 h-10 md:w-12 md:h-12 text-ceramic-accent" strokeWidth={1.5} />
        </motion.div>
      </div>

      {/* Waveform placeholder */}
      <div className="flex items-center justify-center gap-1 h-12">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1 bg-ceramic-accent/60 rounded-full"
            animate={{
              height: [8, 24 + Math.random() * 16, 8],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.05,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Time */}
      <p className="text-center text-sm text-ceramic-text-secondary mt-4">0:24</p>
    </div>
  );
}

/**
 * "Reflita." Visual - Daily Question Card
 */
function ReflectVisual() {
  return (
    <div className="w-64 sm:w-72 md:w-80 bg-ceramic-base p-6 md:p-8 rounded-2xl md:rounded-3xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-ceramic-accent" />
        <span className="text-xs font-semibold text-ceramic-text-secondary uppercase tracking-wider">
          Pergunta do dia
        </span>
      </div>

      {/* Question */}
      <p className="text-lg md:text-xl font-medium text-ceramic-text-primary leading-relaxed mb-6">
        "O que voce faria diferente se soubesse que ninguem te julgaria?"
      </p>

      {/* Input placeholder */}
      <div
        className="rounded-xl p-4 min-h-[80px]"
        style={{
          boxShadow: `
            inset 3px 3px 6px rgba(163, 158, 145, 0.25),
            inset -3px -3px 6px rgba(255, 255, 255, 0.9)
          `
        }}
      >
        <p className="text-sm text-ceramic-text-secondary/50 italic">
          Toque para refletir...
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-4 text-xs text-ceramic-text-secondary">
        <span>+15 XP</span>
        <span>Dia 7 de reflexao</span>
      </div>
    </div>
  );
}

/**
 * "Evolua." Visual - Level/XP Progress
 */
function EvolveVisual() {
  return (
    <div className="w-64 sm:w-72 md:w-80 bg-ceramic-base p-6 md:p-8 rounded-2xl md:rounded-3xl">
      {/* Level Badge */}
      <div className="flex items-center justify-center mb-6">
        <motion.div
          className="ceramic-badge-gold flex items-center gap-3 px-6 py-3"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-xl font-black">Nivel 5</span>
          <span className="text-sm font-medium">Explorador</span>
        </motion.div>
      </div>

      {/* XP Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-ceramic-text-secondary mb-2">
          <span>1,240 XP</span>
          <span>1,800 XP</span>
        </div>
        <div className="ceramic-progress-groove h-3">
          <motion.div
            className="ceramic-progress-fill h-full"
            initial={{ width: 0 }}
            whileInView={{ width: '69%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        </div>
        <p className="text-xs text-ceramic-text-secondary mt-1 text-center">
          560 XP para Nivel 6
        </p>
      </div>

      {/* Recent achievements */}
      <div className="space-y-2 mt-6">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-ceramic-warm/30">
          <span className="text-lg">🔥</span>
          <div className="flex-1">
            <p className="text-xs font-medium text-ceramic-text-primary">Sequencia de 7 dias</p>
            <p className="text-[10px] text-ceramic-text-secondary">Conquistado hoje</p>
          </div>
          <span className="text-xs font-bold text-ceramic-accent">+50 XP</span>
        </div>
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/30">
          <span className="text-lg">🎯</span>
          <div className="flex-1">
            <p className="text-xs font-medium text-ceramic-text-primary">10 reflexoes</p>
            <p className="text-[10px] text-ceramic-text-secondary">Ontem</p>
          </div>
          <span className="text-xs font-bold text-ceramic-accent">+30 XP</span>
        </div>
      </div>
    </div>
  );
}

export default ScrollStory;
