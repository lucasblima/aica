/**
 * Value Indicator Component
 * Step 2.4 - Motivational message about the value of self-reflection
 *
 * Shows encouraging content about the benefits of capturing moments
 * without using fake/mockup statistics
 *
 * @version 2.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, TrendingUp, Heart } from 'lucide-react';

const ValueIndicator: React.FC = () => {
  const benefits = [
    {
      icon: Brain,
      title: 'Autoconhecimento',
      description: 'Entenda melhor seus padrões de comportamento e emoções',
      color: '#6B9EFF',
    },
    {
      icon: TrendingUp,
      title: 'Evolução Contínua',
      description: 'Acompanhe seu crescimento pessoal ao longo do tempo',
      color: '#845EF7',
    },
    {
      icon: Heart,
      title: 'Bem-estar',
      description: 'Cultive uma relação mais saudável consigo mesmo',
      color: '#FF922B',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#6B9EFF] to-[#845EF7] rounded-full mb-4"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Por que registrar momentos?
        </h2>
        <p className="text-[#5C554B]">
          Cada momento registrado é um passo em direção ao autoconhecimento
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 gap-4">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              className="flex items-start gap-4 bg-white rounded-xl p-5 border border-[#E8E6E0] shadow-sm"
            >
              <div
                className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${benefit.color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color: benefit.color }} />
              </div>
              <div>
                <h3 className="font-bold text-[#2B1B17] mb-1">{benefit.title}</h3>
                <p className="text-sm text-[#5C554B]">{benefit.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Encouragement */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-[#6B9EFF]/10 to-[#845EF7]/10 rounded-xl p-5 text-center border border-[#6B9EFF]/20"
      >
        <p className="text-[#2B1B17] font-medium">
          Não existe momento "certo" ou "errado" para registrar.
        </p>
        <p className="text-sm text-[#5C554B] mt-1">
          O importante é começar. Vamos criar seu primeiro registro juntos?
        </p>
      </motion.div>
    </div>
  );
};

export default ValueIndicator;
