/**
 * Moment Review Component
 * Step 2.7 - Review and confirm before saving moment
 *
 * Features:
 * - Visual summary of all captured data
 * - Edit capability for each field
 * - Confirmation buttons
 * - Loading state
 *
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, CheckCircle } from 'lucide-react';
import { MOMENT_TYPES } from './MomentTypeSelector';
import { EMOTIONS } from './EmotionPicker';
import { LIFE_AREAS } from './LifeAreaSelector';
import { AudioRecording } from './AudioRecorder';

interface MomentReviewProps {
  data: {
    momentTypeId: string;
    emotion: string;
    customEmotion?: string;
    lifeAreas: string[];
    reflection: string;
    audioRecording?: AudioRecording;
  };
  onConfirm: () => void;
  onEdit: (step: number) => void;
  isLoading?: boolean;
}

const MomentReview: React.FC<MomentReviewProps> = ({
  data,
  onConfirm,
  onEdit,
  isLoading = false,
}) => {
  const momentType = MOMENT_TYPES.find(t => t.id === data.momentTypeId);
  const emotion = EMOTIONS.find(e => e.id === data.emotion);
  const selectedAreas = data.lifeAreas
    .map(id => LIFE_AREAS.find(a => a.id === id))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Title */}
      <h2 className="text-2xl font-bold text-[#2B1B17]">
        Revisão do Seu Momento
      </h2>

      {/* Type */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-[#F8F7F5] rounded-lg p-5 border border-[#E8E6E0]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#948D82] uppercase mb-2">Tipo</p>
            <p className="text-lg font-bold text-[#2B1B17] flex items-center gap-2">
              <span className="text-2xl">{momentType?.icon}</span>
              {momentType?.label}
            </p>
          </div>
          <button
            onClick={() => onEdit(1)}
            className="text-[#6B9EFF] font-semibold text-sm hover:underline transition-all flex items-center gap-1"
          >
            <Edit size={16} />
            Editar
          </button>
        </div>
      </motion.div>

      {/* Emotion */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#F8F7F5] rounded-lg p-5 border border-[#E8E6E0]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#948D82] uppercase mb-2">Emoção</p>
            <p className="text-lg font-bold text-[#2B1B17] flex items-center gap-2">
              <span className="text-3xl">{emotion?.emoji}</span>
              {data.customEmotion || emotion?.label}
            </p>
          </div>
          <button
            onClick={() => onEdit(2)}
            className="text-[#6B9EFF] font-semibold text-sm hover:underline transition-all flex items-center gap-1"
          >
            <Edit size={16} />
            Editar
          </button>
        </div>
      </motion.div>

      {/* Life Areas */}
      {selectedAreas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#F8F7F5] rounded-lg p-5 border border-[#E8E6E0]"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-[#948D82] uppercase">Áreas da Vida</p>
            <button
              onClick={() => onEdit(3)}
              className="text-[#6B9EFF] font-semibold text-sm hover:underline transition-all flex items-center gap-1"
            >
              <Edit size={16} />
              Editar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedAreas.map(area => (
              <span
                key={area?.id}
                className="inline-block px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: area?.color }}
              >
                {area?.icon} {area?.label}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Reflection */}
      {data.reflection && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#F8F7F5] rounded-lg p-5 border border-[#E8E6E0]"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-[#948D82] uppercase">Reflexão</p>
            <button
              onClick={() => onEdit(5)}
              className="text-[#6B9EFF] font-semibold text-sm hover:underline transition-all flex items-center gap-1"
            >
              <Edit size={16} />
              Editar
            </button>
          </div>
          <p className="text-[#2B1B17] leading-relaxed text-sm">
            {data.reflection}
          </p>
          <p className="text-xs text-[#948D82] mt-2">
            {data.reflection.length} caracteres
          </p>
        </motion.div>
      )}

      {/* Audio */}
      {data.audioRecording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#F8F7F5] rounded-lg p-5 border border-[#E8E6E0]"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-[#948D82] uppercase">Áudio</p>
            <button
              onClick={() => onEdit(6)}
              className="text-red-600 font-semibold text-sm hover:underline transition-all flex items-center gap-1"
            >
              <Trash2 size={16} />
              Remover
            </button>
          </div>
          <audio
            src={data.audioRecording.url}
            controls
            className="w-full h-10"
          />
          <p className="text-xs text-[#948D82] mt-2">
            Duração: {Math.floor(data.audioRecording.duration / 60)}:{String(data.audioRecording.duration % 60).padStart(2, '0')}
          </p>
        </motion.div>
      )}

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 border border-[#6B9EFF] rounded-lg p-5"
      >
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-[#948D82] mb-1">Campos Completos</p>
            <p className="text-2xl font-bold text-[#6B9EFF]">
              {(!!momentType ? 1 : 0) + (!!emotion || !!data.customEmotion ? 1 : 0) + (selectedAreas.length > 0 ? 1 : 0) + (!!data.reflection ? 1 : 0) + (!!data.audioRecording ? 1 : 0)}/5
            </p>
          </div>
          <div>
            <p className="text-xs text-[#948D82] mb-1">Pontos Estimados</p>
            <p className="text-2xl font-bold text-[#845EF7]">
              {25 + (!!data.reflection ? 5 : 0) + (!!data.audioRecording ? 10 : 0)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-[#E8E6E0]">
        <button
          onClick={() => onEdit(1)}
          className="flex-1 px-4 py-3 border border-[#E8E6E0] text-[#5C554B] font-semibold rounded-lg hover:bg-[#F8F7F5] transition-all"
        >
          ← Voltar
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-[#51CF66] text-white font-bold rounded-lg hover:bg-[#40C057] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Salvar Momento
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MomentReview;
