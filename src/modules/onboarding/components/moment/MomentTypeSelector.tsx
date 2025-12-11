/**
 * Moment Type Selector Component
 * Step 2.1 - Visual grid to select type of moment
 *
 * Options:
 * - Desafio Superado (Challenge)
 * - Alegria/Celebração (Joy)
 * - Aprendizado/Insight (Learning)
 * - Reflexão Profunda (Reflection)
 * - Luta/Dificuldade (Struggle)
 * - Mudança/Transformação (Transformation)
 *
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';

export interface MomentTypeOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  examples?: string[];
}

export const MOMENT_TYPES: MomentTypeOption[] = [
  {
    id: 'challenge',
    label: 'Desafio Superado',
    icon: '⛰️',
    description: 'Um obstáculo que você venceu',
    color: '#FF922B',
    examples: ['Tive coragem para pedir um aumento', 'Enfrentei meu medo de falar em público'],
  },
  {
    id: 'joy',
    label: 'Alegria/Celebração',
    icon: '🎉',
    description: 'Um momento de felicidade ou vitória',
    color: '#51CF66',
    examples: ['Minha promoção foi aprovada', 'Passei no exame que estava estudando'],
  },
  {
    id: 'learning',
    label: 'Aprendizado/Insight',
    icon: '💡',
    description: 'Algo importante que você aprendeu',
    color: '#6B9EFF',
    examples: ['Entendi por que reajo assim em certos momentos', 'Descobri um novo padrão em minha vida'],
  },
  {
    id: 'reflection',
    label: 'Reflexão Profunda',
    icon: '🪞',
    description: 'Pensamentos sobre quem você é',
    color: '#845EF7',
    examples: ['Refleti sobre meus valores fundamentais', 'Questionei meu rumo de vida'],
  },
  {
    id: 'struggle',
    label: 'Luta/Dificuldade',
    icon: '⚡',
    description: 'Um desafio que está enfrentando',
    color: '#FA5252',
    examples: ['Estou me sentindo sozinho ultimamente', 'Tenho dificuldade em relaxar e desconectar'],
  },
  {
    id: 'transformation',
    label: 'Mudança/Transformação',
    icon: '🦋',
    description: 'Você está mudando em alguma forma',
    color: '#845EF7',
    examples: ['Sinto-me diferente após a mudança que fiz', 'Minha perspectiva sobre isso evoluiu'],
  },
];

interface MomentTypeSelectorProps {
  selected?: string;
  onSelect: (typeId: string) => void;
}

const MomentTypeSelector: React.FC<MomentTypeSelectorProps> = ({
  selected,
  onSelect,
}) => {
  const selectedType = selected ? MOMENT_TYPES.find(t => t.id === selected) : null;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Que tipo de momento você quer compartilhar?
        </h2>
        <p className="text-[#5C554B]">
          Escolha a categoria que melhor descreve sua experiência
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOMENT_TYPES.map((type, index) => {
          const isSelected = selected === type.id;

          return (
            <motion.button
              key={type.id}
              onClick={() => onSelect(type.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-6 rounded-xl transition-all border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 text-left ${
                isSelected
                  ? 'border-current bg-opacity-10'
                  : 'border-transparent hover:border-[#E8E6E0]'
              }`}
              style={{
                backgroundColor: isSelected ? `${type.color}20` : '#FFFFFF',
                borderColor: isSelected ? type.color : undefined,
                boxShadow: isSelected ? `0 0 0 2px ${type.color}40` : 'none',
              }}
              aria-pressed={isSelected}
              aria-label={`Selecionar ${type.label}`}
            >
              {/* Icon */}
              <div className="text-4xl mb-3">{type.icon}</div>

              {/* Title */}
              <h3 className="font-bold text-lg text-[#2B1B17] mb-1">
                {type.label}
              </h3>

              {/* Description */}
              <p className="text-sm text-[#5C554B] mb-3">
                {type.description}
              </p>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-sm font-semibold"
                  style={{ color: type.color }}
                >
                  ✓ Selecionado
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Examples */}
      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#F8F7F5] rounded-lg p-6 border border-[#E8E6E0]"
        >
          <p className="text-xs font-semibold text-[#948D82] mb-3 uppercase tracking-wide">
            Exemplos de {selectedType.label}:
          </p>
          <ul className="space-y-2">
            {selectedType.examples?.map((example, i) => (
              <li
                key={i}
                className="text-sm text-[#5C554B] flex items-start gap-2"
              >
                <span className="text-[#6B9EFF] font-bold mt-1">•</span>
                <span>{example}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
};

export default MomentTypeSelector;
