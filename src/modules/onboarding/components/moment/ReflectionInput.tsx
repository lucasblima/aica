/**
 * Reflection Input Component
 * Step 2.5 - Optional text input for moment reflection
 *
 * Features:
 * - Dynamic prompts based on moment type
 * - Character counter
 * - Optional input with helpful hints
 * - Responsive textarea
 *
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

export const REFLECTION_PROMPTS: Record<string, string[]> = {
  challenge: [
    'Como você enfrentou isso?',
    'O que aprendeu neste desafio?',
    'Como isso mudou sua perspectiva?',
  ],
  joy: [
    'Por que esse momento foi tão especial?',
    'Com quem você compartilhou essa alegria?',
    'Como se sentiu depois?',
  ],
  learning: [
    'Como essa descoberta mudou você?',
    'Quando você percebeu isso?',
    'Como vai usar esse conhecimento?',
  ],
  reflection: [
    'Por que está refletindo sobre isso agora?',
    'Qual conclusão você chegou?',
    'O que essa reflexão revelou sobre você?',
  ],
  struggle: [
    'Há quanto tempo está lidando com isso?',
    'Que apoio você gostaria?',
    'Como isso o afeta?',
  ],
  transformation: [
    'Quando começou essa mudança?',
    'Como você se sente sobre ela?',
    'Que diferença está fazendo?',
  ],
};

interface ReflectionInputProps {
  momentTypeId?: string;
  value: string;
  onChange: (text: string) => void;
  minChars?: number;
  maxChars?: number;
}

const ReflectionInput: React.FC<ReflectionInputProps> = ({
  momentTypeId,
  value,
  onChange,
  minChars = 0,
  maxChars = 1000,
}) => {
  const prompts = momentTypeId ? REFLECTION_PROMPTS[momentTypeId] || [] : [];
  const randomPrompt = prompts.length > 0
    ? prompts[Math.floor(Math.random() * prompts.length)]
    : 'Descreva seu momento em suas próprias palavras...';

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Descreva um pouco mais
        </h2>
        <p className="text-[#5C554B] text-sm">
          Opcional - deixe vazio se preferir continuar
        </p>
      </div>

      {/* Textarea */}
      <motion.textarea
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        value={value}
        onChange={e => onChange(e.target.value.slice(0, maxChars))}
        placeholder={randomPrompt}
        rows={4}
        className="w-full px-4 py-3 border border-[#E8E6E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] resize-none bg-white text-[#2B1B17] placeholder-[#948D82]"
      />

      {/* Counter and Feedback */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-[#948D82]">
          {value.length} / {maxChars} caracteres
        </div>

        {value.length > 100 && value.length < maxChars && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-[#51CF66] font-medium"
          >
            ✓ Reflexão bem desenvolvida!
          </motion.div>
        )}

        {value.length >= maxChars - 50 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-[#FF922B] font-medium"
          >
            Aproximando do limite
          </motion.div>
        )}
      </div>

      {/* Helpful Hint */}
      {!value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#F8F7F5] rounded-lg p-4 border border-[#E8E6E0] flex gap-3"
        >
          <Lightbulb size={18} className="text-[#FF922B] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#948D82] mb-1">DICA:</p>
            <p className="text-sm text-[#5C554B]">{randomPrompt}</p>
          </div>
        </motion.div>
      )}

      {/* Character guidelines */}
      <div className="text-xs text-[#948D82] italic text-center pt-2">
        {value.length === 0
          ? 'Deixe em branco para continuar ou adicione uma reflexão pessoal'
          : value.length < 50
          ? 'Você pode adicionar mais detalhes se desejar'
          : 'Excelente reflexão! Você pode continuar ou salvar assim'}
      </div>
    </div>
  );
};

export default ReflectionInput;
