import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  pageTransitionVariants,
  staggerContainer,
  staggerItem,
} from '@/lib/animations/ceramic-motion';

interface EraForgeLandingViewProps {
  status: 'none' | 'pending' | 'rejected' | null;
  requesting: boolean;
  onRequestAccess: () => void;
}

const features = [
  {
    emoji: '\uD83C\uDF0D',
    title: 'Eras Hist\u00F3ricas',
    description: 'Da Pr\u00E9-Hist\u00F3ria \u00E0 Era Espacial',
  },
  {
    emoji: '\uD83E\uDDD9',
    title: 'Conselheiros IA',
    description: 'Guias inteligentes para cada era',
  },
  {
    emoji: '\u2696\uFE0F',
    title: 'Decis\u00F5es & Consequ\u00EAncias',
    description: 'Escolhas que mudam a hist\u00F3ria',
  },
];

const breathingAnimation: import('framer-motion').TargetAndTransition = {
  scale: [1, 1.06, 1],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

export function EraForgeLandingView({
  status,
  requesting,
  onRequestAccess,
}: EraForgeLandingViewProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-ceramic-base to-ceramic-cool flex items-center justify-center"
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
    >
      <div className="max-w-lg mx-auto py-20 px-6 text-center">
        {/* Brand block */}
        <div className="mb-16">
          <motion.div className="text-6xl mb-4" animate={breathingAnimation}>
            {'\uD83C\uDFF0'}
          </motion.div>
          <h1
            className="text-4xl font-bold text-ceramic-text-primary tracking-tight"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            EraForge
          </h1>
          <p className="text-lg text-ceramic-text-secondary mt-2">
            Viaje pela hist\u00F3ria com seus filhos
          </p>
        </div>

        {/* Status CTA block */}
        <div className="mb-16">
          {(status === 'none' || status === null) && (
            <>
              <p className="text-sm text-ceramic-text-secondary mb-6 tracking-widest uppercase">
                Acesso por convite
              </p>
              <button
                onClick={onRequestAccess}
                disabled={requesting}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-8 py-3 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {requesting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Solicitando...
                  </span>
                ) : (
                  'Solicitar Acesso'
                )}
              </button>
            </>
          )}

          {status === 'pending' && (
            <div>
              <div className="bg-ceramic-success/10 text-ceramic-success rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-xl font-medium text-ceramic-text-primary">
                Solicita\u00E7\u00E3o enviada
              </p>
              <p className="text-sm text-ceramic-text-secondary mt-2">
                Voc\u00EA ser\u00E1 notificado quando aprovado
              </p>
            </div>
          )}

          {status === 'rejected' && (
            <p className="text-ceramic-text-secondary">
              Acesso n\u00E3o dispon\u00EDvel no momento
            </p>
          )}
        </div>

        {/* Feature preview */}
        <motion.div
          className="space-y-3 mb-16"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className="bg-ceramic-base/50 rounded-xl p-5 text-left opacity-60"
              variants={staggerItem}
            >
              <span className="text-2xl">{feature.emoji}</span>
              <p className="font-medium text-ceramic-text-primary mt-1">
                {feature.title}
              </p>
              <p className="text-sm text-ceramic-text-secondary">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors cursor-pointer"
        >
          {'\u2190'} Voltar ao in\u00EDcio
        </button>
      </div>
    </motion.div>
  );
}

export default EraForgeLandingView;
