/**
 * Emotion Picker Component
 * Step 2.2 - Select emotional state with emoji buttons
 *
 * Features:
 * - 5 preset emotions with emojis
 * - Custom emotion input option
 * - Single selection
 * - Visual feedback
 *
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface EmotionOption {
  id: string;
  emoji: string;
  label: string;
  aliases?: string[];
}

export const EMOTIONS: EmotionOption[] = [
  {
    id: 'sad',
    emoji: '😢',
    label: 'Triste',
    aliases: ['deprimido', 'desanimado', 'desapontado'],
  },
  {
    id: 'neutral',
    emoji: '😐',
    label: 'Neutro',
    aliases: ['ok', 'calmo', 'equilibrado'],
  },
  {
    id: 'happy',
    emoji: '😊',
    label: 'Alegre',
    aliases: ['feliz', 'contente', 'satisfeito'],
  },
  {
    id: 'excited',
    emoji: '😄',
    label: 'Muito Alegre',
    aliases: ['entusiasmado', 'animado', 'empolgado'],
  },
  {
    id: 'angry',
    emoji: '😡',
    label: 'Bravo',
    aliases: ['frustrado', 'irritado', 'revoltado'],
  },
];

interface EmotionPickerProps {
  selected?: string;
  customEmotion?: string;
  onSelect: (emotionId: string) => void;
  onCustomChange: (text: string) => void;
}

const EmotionPicker: React.FC<EmotionPickerProps> = ({
  selected,
  customEmotion,
  onSelect,
  onCustomChange,
}) => {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Como você está se sentindo?
        </h2>
        <p className="text-[#5C554B]">
          Escolha a emoção que melhor descreve seu estado atual
        </p>
      </div>

      {/* Emotion Buttons */}
      <div className="flex gap-4 justify-center flex-wrap">
        {EMOTIONS.map((emotion, index) => {
          const isSelected = selected === emotion.id && !showCustom;

          return (
            <motion.button
              key={emotion.id}
              onClick={() => {
                onSelect(emotion.id);
                setShowCustom(false);
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center p-4 rounded-xl transition-all ${
                isSelected
                  ? 'ring-4 ring-offset-2 bg-blue-50'
                  : 'hover:bg-[#F8F7F5]'
              }`}
              style={{
                ringColor: isSelected ? '#6B9EFF' : undefined,
              }}
              aria-pressed={isSelected}
              aria-label={emotion.label}
            >
              <span className="text-6xl mb-2">{emotion.emoji}</span>
              <span className="text-sm font-semibold text-[#2B1B17]">
                {emotion.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Custom Emotion Option */}
      <div className="border-t border-[#E8E6E0] pt-6">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="text-[#6B9EFF] font-semibold text-sm hover:underline transition-all"
        >
          {showCustom ? '✕ Cancelar' : '+ Outro sentimento?'}
        </button>

        {showCustom && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <input
              type="text"
              value={customEmotion || ''}
              onChange={e => onCustomChange(e.target.value)}
              placeholder="Ex: Nostálgico, Calmo, Energizado..."
              className="w-full px-4 py-3 border border-[#E8E6E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] bg-white"
            />
            {customEmotion && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-[#948D82] mt-2"
              >
                Você selecionou: <strong>{customEmotion}</strong>
              </motion.p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EmotionPicker;
