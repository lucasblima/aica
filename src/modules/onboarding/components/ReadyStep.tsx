/**
 * ReadyStep Component
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Final step of the onboarding flow:
 * - Success celebration
 * - Stats display (credits, contacts, groups)
 * - CTA to start using the app
 *
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import { motion } from 'framer-motion';
import {
  PartyPopper,
  Coins,
  Users,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ReadyStepProps {
  /** Number of credits available */
  credits: number;
  /** Number of contacts synced */
  contactsCount: number;
  /** Number of groups synced */
  groupsCount: number;
  /** Callback when user clicks start */
  onStart: () => void;
  /** Optional className */
  className?: string;
}

const confettiVariants = {
  initial: { opacity: 0, y: -20 },
  animate: (i: number) => ({
    opacity: [0, 1, 1, 0],
    y: [-20, 0, 20, 40],
    x: [0, (i % 2 === 0 ? 1 : -1) * (10 + i * 5), 0],
    rotate: [0, 360],
    transition: {
      duration: 2,
      repeat: Infinity,
      delay: i * 0.2,
    },
  }),
};

export function ReadyStep({
  credits,
  contactsCount,
  groupsCount,
  onStart,
  className = '',
}: ReadyStepProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Celebration Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="relative mb-8"
      >
        {/* Confetti particles */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            custom={i}
            variants={confettiVariants}
            initial="initial"
            animate="animate"
            className="absolute"
            style={{
              left: `${20 + i * 15}%`,
              top: '-10px',
            }}
          >
            <Sparkles
              className={`w-4 h-4 ${
                i % 3 === 0
                  ? 'text-ceramic-warning'
                  : i % 3 === 1
                  ? 'text-ceramic-success'
                  : 'text-ceramic-info'
              }`}
            />
          </motion.div>
        ))}

        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 10 }}
          transition={{
            repeat: Infinity,
            repeatType: 'reverse',
            duration: 0.5,
          }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-200"
        >
          <PartyPopper className="w-12 h-12 text-white" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-ceramic-900 mb-2">
          Tudo pronto!
        </h1>
        <p className="text-lg text-ceramic-600">
          Seu WhatsApp está conectado e sincronizado
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-4 w-full max-w-md mb-8"
      >
        {/* Credits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900">{credits}</p>
          <p className="text-xs text-amber-700">créditos</p>
        </motion.div>

        {/* Contacts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-4 bg-gradient-to-br from-ceramic-info/10 to-ceramic-accent/10 rounded-xl border border-ceramic-info/30"
        >
          <div className="w-10 h-10 rounded-full bg-ceramic-info/10 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-ceramic-info" />
          </div>
          <p className="text-2xl font-bold text-ceramic-text-primary">{contactsCount}</p>
          <p className="text-xs text-ceramic-info">contatos</p>
        </motion.div>

        {/* Groups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-4 bg-gradient-to-br from-ceramic-accent/10 to-ceramic-accent/5 rounded-xl border border-ceramic-accent/30"
        >
          <div className="w-10 h-10 rounded-full bg-ceramic-accent/10 flex items-center justify-center mx-auto mb-2">
            <MessageSquare className="w-5 h-5 text-ceramic-accent" />
          </div>
          <p className="text-2xl font-bold text-ceramic-text-primary">{groupsCount}</p>
          <p className="text-xs text-ceramic-accent">grupos</p>
        </motion.div>
      </motion.div>

      {/* Next Steps Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mb-8 p-4 bg-ceramic-50 rounded-xl max-w-md"
      >
        <h3 className="font-medium text-ceramic-800 mb-2">Próximos passos</h3>
        <ul className="text-sm text-ceramic-600 space-y-1 text-left">
          <li>• Explore sua rede de contatos no painel</li>
          <li>• Selecione conversas para análise com IA</li>
          <li>• Use seus créditos para extrair insights</li>
        </ul>
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        onClick={onStart}
        className="w-full max-w-sm flex items-center justify-center gap-2 px-6 py-4 bg-ceramic-success hover:bg-ceramic-success/80 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-ceramic-success/20 hover:shadow-xl hover:shadow-ceramic-success/30"
      >
        Começar a usar
        <ArrowRight className="w-5 h-5" />
      </motion.button>

      {/* Interview suggestion — only shows once */}
      {!localStorage.getItem('aica_interview_suggested') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="ceramic-card p-5 mt-4 text-center"
        >
          <div className="text-2xl mb-2">🎯</div>
          <h3 className="text-sm font-bold text-ceramic-text-primary mb-1">
            Quer que a AICA te conheça melhor?
          </h3>
          <p className="text-xs text-ceramic-text-secondary mb-3">
            Responda perguntas rápidas para personalizar sua experiência.
          </p>
          <button
            onClick={() => {
              localStorage.setItem('aica_interview_suggested', 'true')
            }}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-all"
          >
            Começar Entrevista
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default ReadyStep;
