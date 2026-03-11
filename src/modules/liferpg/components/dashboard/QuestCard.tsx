/**
 * QuestCard — Card with icon, title, priority, XP reward, deadline.
 * Actions: Accept, Complete, Skip.
 */

import React, { useState, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import type { EntityQuest, QuestPriority, QuestType } from '../../types/liferpg';

interface QuestCardProps {
  quest: EntityQuest;
  onAccept?: (questId: string) => Promise<boolean>;
  onComplete?: (questId: string, notes?: string, photos?: string[]) => Promise<{ success: boolean; xpAwarded?: number; leveledUp?: boolean }>;
  onSkip?: (questId: string) => Promise<boolean>;
}

const priorityConfig: Record<QuestPriority, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critico', color: 'text-ceramic-error', bgColor: 'bg-ceramic-error/10' },
  high: { label: 'Alto', color: 'text-ceramic-warning', bgColor: 'bg-ceramic-warning/10' },
  medium: { label: 'Medio', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  low: { label: 'Baixo', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
};

const questTypeIcons: Record<QuestType, string> = {
  maintenance: '\u{1F527}',
  repair: '\u{1F6E0}',
  upgrade: '\u{2B06}',
  social: '\u{1F91D}',
  financial: '\u{1F4B0}',
  inventory: '\u{1F4E6}',
  emergency: '\u{1F6A8}',
  seasonal: '\u{1F343}',
  routine: '\u{1F504}',
};

export const QuestCard: React.FC<QuestCardProps> = ({
  quest,
  onAccept,
  onComplete,
  onSkip,
}) => {
  const [acting, setActing] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || uploading) return;

    setUploading(true);
    const filesToUpload = Array.from(files).slice(0, 2 - completionPhotos.length);

    for (const file of filesToUpload) {
      const path = `quest-evidence/${quest.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('liferpg-photos').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('liferpg-photos').getPublicUrl(path);
        if (urlData.publicUrl) {
          setCompletionPhotos((prev) => (prev.length < 2 ? [...prev, urlData.publicUrl] : prev));
        }
      }
    }

    setUploading(false);
    // Reset input
    e.target.value = '';
  };

  const priority = priorityConfig[quest.priority] || priorityConfig.medium;
  const icon = questTypeIcons[quest.quest_type] || '\u{2753}';
  const isActive = quest.status === 'pending' || quest.status === 'accepted' || quest.status === 'in_progress';

  const handleAccept = async () => {
    if (!onAccept) return;
    setActing(true);
    await onAccept(quest.id);
    setActing(false);
  };

  const handleComplete = async () => {
    if (!onComplete) return;
    setActing(true);
    const result = await onComplete(
      quest.id,
      completionNotes || undefined,
      completionPhotos.length > 0 ? completionPhotos : undefined
    );
    setActing(false);
    setShowCompleteForm(false);
    setCompletionPhotos([]);
    if (result.leveledUp) {
      // Could trigger a celebration animation here
    }
  };

  const handleSkip = async () => {
    if (!onSkip) return;
    setActing(true);
    await onSkip(quest.id);
    setActing(false);
  };

  const dueLabel = quest.due_date
    ? new Date(quest.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null;

  const isOverdue = quest.due_date && new Date(quest.due_date) < new Date();

  return (
    <div
      className={`bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss border border-ceramic-border transition-all ${
        !isActive ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-2xl" role="img" aria-label={quest.quest_type}>
          {icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-ceramic-text-primary truncate">
              {quest.title}
            </h4>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${priority.color} ${priority.bgColor}`}>
              {priority.label}
            </span>
          </div>

          {quest.description && (
            <p className="text-xs text-ceramic-text-secondary line-clamp-2 mb-2">
              {quest.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-[10px] text-ceramic-text-secondary">
            <span className="font-medium text-amber-600">+{quest.xp_reward} XP</span>
            {quest.difficulty && (
              <span className="capitalize">{quest.difficulty}</span>
            )}
            {quest.estimated_minutes && (
              <span>~{quest.estimated_minutes}min</span>
            )}
            {dueLabel && (
              <span className={isOverdue ? 'text-ceramic-error font-semibold' : ''}>
                {isOverdue ? 'Atrasada: ' : ''}{dueLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {isActive && (
        <div className="mt-3 flex gap-2">
          {quest.status === 'pending' && onAccept && (
            <button
              onClick={handleAccept}
              disabled={acting}
              className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-border transition-colors disabled:opacity-50"
            >
              Aceitar
            </button>
          )}
          {(quest.status === 'accepted' || quest.status === 'in_progress') && onComplete && (
            <>
              {!showCompleteForm ? (
                <button
                  onClick={() => setShowCompleteForm(true)}
                  disabled={acting}
                  className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  Completar
                </button>
              ) : (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Notas (opcional)..."
                    className="w-full text-xs py-1.5 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border"
                  />
                  {/* Photo upload */}
                  <div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploading || completionPhotos.length >= 2}
                      className="inline-flex items-center gap-1 text-[10px] text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors disabled:opacity-50"
                    >
                      {uploading ? 'Enviando...' : `${'\u{1F4F7}'} Adicionar foto (opcional)`}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    {completionPhotos.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {completionPhotos.map((url, idx) => (
                          <div key={idx} className="relative w-12 h-12">
                            <img
                              src={url}
                              alt={`Foto ${idx + 1}`}
                              className="w-12 h-12 rounded-lg object-cover border border-ceramic-border"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setCompletionPhotos((prev) => prev.filter((_, pi) => pi !== idx))
                              }
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ceramic-error text-white text-[8px] flex items-center justify-center leading-none"
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleComplete}
                      disabled={acting}
                      className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      {acting ? 'Salvando...' : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCompleteForm(false);
                        setCompletionPhotos([]);
                      }}
                      className="text-xs py-1.5 px-3 rounded-lg bg-ceramic-cool text-ceramic-text-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {onSkip && (
            <button
              onClick={handleSkip}
              disabled={acting}
              className="text-xs py-1.5 px-3 rounded-lg text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors disabled:opacity-50"
            >
              Pular
            </button>
          )}
        </div>
      )}

      {/* Completed badge */}
      {quest.status === 'completed' && (
        <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
          <span>Completada</span>
          {quest.completed_at && (
            <span className="text-ceramic-text-secondary">
              em {new Date(quest.completed_at).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
