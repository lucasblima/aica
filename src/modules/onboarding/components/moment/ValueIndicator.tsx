/**
 * Value Indicator Component
 * Step 2.4 - Social proof showing value of platform
 *
 * Displays:
 * - Weekly moment count
 * - Pattern discovery rate
 * - Average insights per user
 *
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';

interface ValueIndicatorProps {
  weeklyMomentCount?: number;
  patternDiscoveryRate?: number;
  avgInsightsPerUser?: number;
}

const ValueIndicator: React.FC<ValueIndicatorProps> = ({
  weeklyMomentCount = 1234,
  patternDiscoveryRate = 48,
  avgInsightsPerUser = 3.2,
}) => {
  const stats = [
    {
      value: weeklyMomentCount.toLocaleString(),
      label: 'Momentos compartilhados',
      sublabel: 'essa semana',
      color: '#6B9EFF',
      icon: '📝',
    },
    {
      value: `${patternDiscoveryRate}%`,
      label: 'Dos usuários encontram',
      sublabel: 'padrões nos primeiros 3 momentos',
      color: '#845EF7',
      icon: '🎯',
    },
    {
      value: avgInsightsPerUser.toFixed(1),
      label: 'Insights gerados em média',
      sublabel: 'por semana',
      color: '#FF922B',
      icon: '💡',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Veja como outros usam Aica
        </h2>
        <p className="text-[#5C554B]">
          Você não está sozinho nessa jornada
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-[#F8F7F5] to-[#F0EEED] rounded-lg p-6 border border-[#E8E6E0]"
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: stat.color,
            }}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p
                className="text-3xl font-bold mb-1"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-sm text-[#5C554B] mb-1 font-medium">
                {stat.label}
              </p>
              <p className="text-xs text-[#948D82]">
                {stat.sublabel}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Additional context */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 border border-[#6B9EFF] rounded-lg p-6 text-center"
      >
        <p className="text-sm text-[#5C554B] mb-2">
          <strong>Dados agregados e anônimos</strong> de usuários ativos
        </p>
        <p className="text-xs text-[#948D82] italic">
          Todos compartilham voluntariamente para ajudar outros a crescer
        </p>
      </motion.div>

      {/* CTA */}
      <div className="bg-[#F8F7F5] rounded-lg p-4 text-center border border-[#E8E6E0]">
        <p className="text-sm text-[#5C554B]">
          Seus momentos também ajudam a comunidade a se conectar e crescer
        </p>
      </div>
    </div>
  );
};

export default ValueIndicator;
