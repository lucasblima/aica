import React from 'react';
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { ERA_CONFIG } from '../types/eraforge.types';
import type { Era } from '../types/eraforge.types';

// Era emoji mapping — visual identity per era
const ERA_EMOJI: Record<string, string> = {
   stone_age: '🪨',
   ancient_egypt: '🏛️',
   medieval: '⚔️',
   renaissance: '🎨',
   industrial: '⚙️',
   future: '🚀',
   ancient_greece: '🏺',
   roman_empire: '🏟️',
   age_of_exploration: '🧭',
};

// Featured eras for the home view
const FEATURED_ERAS: Era[] = ['stone_age', 'ancient_egypt', 'medieval', 'renaissance'];

// Warm gradient backgrounds per era
const ERA_GRADIENTS: Record<string, string> = {
   stone_age: 'linear-gradient(135deg, #E8E0D4 0%, #D4C5B0 100%)',
   ancient_egypt: 'linear-gradient(135deg, #F5E6C8 0%, #E8D5A8 100%)',
   medieval: 'linear-gradient(135deg, #D4DDE8 0%, #B8C5D4 100%)',
   renaissance: 'linear-gradient(135deg, #E8D8E8 0%, #D4C0D4 100%)',
};

interface EraForgeMainViewProps {
   onBack: () => void;
}

export const EraForgeMainView: React.FC<EraForgeMainViewProps> = ({ onBack }) => {
   return (
      <div className="min-h-screen bg-ceramic-base">
         {/* Header — frosted glass */}
         <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-ceramic-border">
            <div className="flex items-center gap-3 px-4 py-3">
               <button
                  onClick={onBack}
                  className="p-2 -ml-2 rounded-lg hover:bg-ceramic-cool transition-colors"
                  aria-label="Voltar"
               >
                  <ArrowLeft className="w-5 h-5 text-ceramic-text-secondary" />
               </button>
               <div className="flex items-center gap-2">
                  <span className="text-xl">🏛️</span>
                  <h1
                     className="text-lg font-bold text-ceramic-text-primary"
                     style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
                  >
                     EraForge
                  </h1>
               </div>
            </div>
         </div>

         <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
            {/* Welcome Section */}
            <motion.div
               initial={{ opacity: 0, y: 12 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4 }}
               className="text-center space-y-2"
            >
               <h2
                  className="text-2xl font-bold text-ceramic-text-primary"
                  style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
               >
                  Aventuras na Historia
               </h2>
               <p className="text-sm text-ceramic-text-secondary max-w-xs mx-auto">
                  Crie mundos, escolha eras e guie criancas por decisoes que moldaram civilizacoes.
               </p>
            </motion.div>

            {/* Featured Eras */}
            <div className="space-y-3">
               <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Eras Disponiveis
               </h3>
               <div className="grid grid-cols-2 gap-3">
                  {FEATURED_ERAS.map((eraId, idx) => {
                     const config = ERA_CONFIG[eraId];
                     return (
                        <motion.div
                           key={eraId}
                           initial={{ opacity: 0, y: 16 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.08, duration: 0.4 }}
                           className="ceramic-card overflow-hidden cursor-pointer group"
                           style={{ background: ERA_GRADIENTS[eraId] }}
                        >
                           <div className="p-4 space-y-2">
                              <span className="text-2xl">{ERA_EMOJI[eraId] || '🌍'}</span>
                              <div>
                                 <p
                                    className="text-sm font-bold text-ceramic-text-primary"
                                    style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
                                 >
                                    {config?.label || eraId}
                                 </p>
                                 <p className="text-xs text-ceramic-text-secondary">
                                    {config?.period || ''}
                                 </p>
                              </div>
                           </div>
                        </motion.div>
                     );
                  })}
               </div>
            </div>

            {/* Create World CTA */}
            <motion.button
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.4, duration: 0.3 }}
               className="w-full ceramic-card p-4 flex items-center justify-center gap-3 group hover:shadow-lg transition-shadow"
               style={{ background: 'linear-gradient(135deg, #F5E8DC 0%, #FCEBD5 100%)' }}
            >
               <div className="p-2 rounded-full bg-amber-100 group-hover:bg-amber-200 transition-colors">
                  <Plus className="w-5 h-5 text-amber-700" />
               </div>
               <span
                  className="text-sm font-bold text-amber-800"
                  style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
               >
                  Criar Novo Mundo
               </span>
               <Sparkles className="w-4 h-4 text-amber-500 opacity-60" />
            </motion.button>

            {/* Empty state — no worlds yet */}
            <div className="text-center py-8 space-y-2">
               <div className="text-4xl">🌍</div>
               <p className="text-sm text-ceramic-text-secondary">
                  Nenhum mundo criado ainda.
               </p>
               <p className="text-xs text-ceramic-text-secondary/60">
                  Crie seu primeiro mundo e comece a aventura!
               </p>
            </div>
         </div>
      </div>
   );
};
