/**
 * WelcomeStep Component
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * First step of the onboarding flow:
 * - Hero message about bringing order to WhatsApp chaos
 * - Feature highlights
 * - Credits bonus display
 * - CTA to connect WhatsApp
 *
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import { motion } from 'framer-motion';
import { MessageCircle, Users, Brain, Gift, ArrowRight, Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  /** Number of bonus credits */
  creditsBonus?: number;
  /** Callback when user clicks continue */
  onContinue: () => void;
  /** Optional className */
  className?: string;
}

const features = [
  {
    icon: Users,
    title: 'Organize seus contatos',
    description: 'Visualize e categorize suas conversas automaticamente',
  },
  {
    icon: Brain,
    title: 'Análise inteligente',
    description: 'Entenda padrões e priorize o que importa',
  },
  {
    icon: MessageCircle,
    title: 'Resumos de conversas',
    description: 'Nunca mais perca informações importantes',
  },
];

export function WelcomeStep({
  creditsBonus = 10,
  onContinue,
  className = '',
}: WelcomeStepProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-6 shadow-lg shadow-green-200">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-ceramic-900 mb-3">
          Ordem ao Caos do WhatsApp
        </h1>

        <p className="text-lg text-ceramic-600 max-w-md">
          Transforme centenas de conversas em informações organizadas e acionáveis
        </p>
      </motion.div>

      {/* Credits Bonus */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mb-8 w-full max-w-sm"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-amber-200 rounded-full opacity-50" />
          <div className="relative flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Gift className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-amber-900">
                {creditsBonus} créditos de boas-vindas!
              </p>
              <p className="text-sm text-amber-700">
                Use para analisar suas conversas
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid gap-4 w-full max-w-sm mb-8"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="flex items-start gap-4 p-4 rounded-xl bg-ceramic-50 text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <feature.icon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-ceramic-800">{feature.title}</h3>
              <p className="text-sm text-ceramic-500">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300"
        >
          <MessageCircle className="w-5 h-5" />
          Conectar WhatsApp
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="mt-4 text-sm text-ceramic-400">
          Seus dados são criptografados e nunca compartilhados
        </p>
      </motion.div>
    </div>
  );
}

export default WelcomeStep;
