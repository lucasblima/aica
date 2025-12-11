/**
 * Life Area Selector Component
 * Step 2.3 - Multiple choice selection of life areas affected
 *
 * Options:
 * - Saúde Mental
 * - Saúde Física
 * - Relacionamentos
 * - Trabalho/Carreira
 * - Financeiro
 * - Pessoal/Espiritual
 *
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';

export interface LifeArea {
  id: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
}

export const LIFE_AREAS: LifeArea[] = [
  {
    id: 'mental_health',
    label: 'Saúde Mental',
    icon: '🧠',
    color: '#6B9EFF',
    description: 'Bem-estar emocional, ansiedade, depressão',
  },
  {
    id: 'physical_health',
    label: 'Saúde Física',
    icon: '💪',
    color: '#FF6B6B',
    description: 'Exercício, nutrição, energia',
  },
  {
    id: 'relationships',
    label: 'Relacionamentos',
    icon: '👥',
    color: '#FF922B',
    description: 'Família, amigos, amor',
  },
  {
    id: 'work',
    label: 'Trabalho/Carreira',
    icon: '💼',
    color: '#4C6EF5',
    description: 'Profissão, desenvolvimento, oportunidades',
  },
  {
    id: 'finance',
    label: 'Financeiro',
    icon: '💰',
    color: '#51CF66',
    description: 'Dinheiro, dívidas, gastos',
  },
  {
    id: 'personal',
    label: 'Pessoal/Espiritual',
    icon: '✨',
    color: '#845EF7',
    description: 'Propósito, valores, crescimento',
  },
];

interface LifeAreaSelectorProps {
  selected: string[];
  onToggle: (areaId: string) => void;
}

const LifeAreaSelector: React.FC<LifeAreaSelectorProps> = ({
  selected,
  onToggle,
}) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Isso está relacionado a...?
        </h2>
        <p className="text-[#5C554B]">
          Escolha uma ou mais áreas (opcional)
        </p>
      </div>

      {/* Area Chips */}
      <div className="flex flex-wrap gap-3">
        {LIFE_AREAS.map((area, index) => {
          const isSelected = selected.includes(area.id);

          return (
            <motion.button
              key={area.id}
              onClick={() => onToggle(area.id)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-3 rounded-full transition-all border-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isSelected
                  ? 'border-current text-white'
                  : 'border-[#E8E6E0] text-[#5C554B] hover:border-[#948D82]'
              }`}
              style={{
                backgroundColor: isSelected ? area.color : 'transparent',
                borderColor: isSelected ? area.color : undefined,
              }}
              title={area.description}
              aria-pressed={isSelected}
            >
              <span className="mr-2">{area.icon}</span>
              {area.label}
              {isSelected && <span className="ml-2">✓</span>}
            </motion.button>
          );
        })}
      </div>

      {/* Selection Info */}
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-[#6B9EFF] rounded-lg p-4"
        >
          <p className="text-sm text-[#5C554B]">
            Você selecionou <strong>{selected.length}</strong> área(s).
            Isso nos ajuda a personalizar recomendações de módulos.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default LifeAreaSelector;
