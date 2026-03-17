/**
 * AthleteWelcome — onboarding welcome screen for invited athletes
 *
 * Shown once on first visit to /meu-treino (or via ?welcome=true link).
 * Displays coach name, brief feature list, and CTAs to start training
 * or explore the rest of AICA.
 */

import { motion } from 'framer-motion';
import { Dumbbell, CheckCircle, MessageSquare, TrendingUp, ArrowRight, Compass } from 'lucide-react';
import type { MyAthleteProfile } from '../types';
import { MODALITY_CONFIG } from '../types';

const STORAGE_KEY = 'athlete_onboarding_done';

interface AthleteWelcomeProps {
  profile: MyAthleteProfile;
  onStartTraining: () => void;
  onExplore: () => void;
}

const features = [
  {
    icon: CheckCircle,
    text: 'Ver seus treinos e marcar como feito',
  },
  {
    icon: MessageSquare,
    text: 'Dar feedback direto para seu coach',
  },
  {
    icon: TrendingUp,
    text: 'Acompanhar sua evolucao semana a semana',
  },
];

export function AthleteWelcome({ profile, onStartTraining, onExplore }: AthleteWelcomeProps) {
  const modalityConfig = MODALITY_CONFIG[profile.modality];
  const modalityIcon = modalityConfig?.icon || '🏋️';

  const handleStartTraining = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onStartTraining();
  };

  const handleExplore = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onExplore();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Hero icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mb-6 shadow-lg shadow-amber-500/20">
            <span className="text-4xl" role="img" aria-label={modalityConfig?.label || 'treino'}>
              {modalityIcon}
            </span>
          </div>

          <h1 className="text-2xl font-black text-ceramic-text-primary">
            Bem-vindo a AICA, {profile.athlete_name}!
          </h1>

          <p className="mt-3 text-sm text-ceramic-text-secondary leading-relaxed">
            Seu coach <span className="font-bold text-ceramic-text-primary">{profile.coach_name}</span> preparou
            um plano de treino para você
          </p>
        </motion.div>

        {/* Feature bullets */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="space-y-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center gap-3 ceramic-card p-4"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-ceramic-text-primary">{feature.text}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="space-y-3 pt-2"
        >
          <button
            onClick={handleStartTraining}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/20"
          >
            <Dumbbell className="w-5 h-5" />
            Ver Meus Treinos
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleExplore}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-ceramic-cool rounded-xl transition-colors"
          >
            <Compass className="w-4 h-4" />
            Explorar a AICA
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/** Check if the athlete onboarding welcome has been shown before */
AthleteWelcome.hasBeenShown = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export default AthleteWelcome;
