/**
 * CustomLevelManager - CRUD para niveis personalizados do coach
 *
 * Permite ao coach criar, renomear, excluir, reordenar niveis customizados e atribuir atletas.
 * Máximo de 10 niveis. Dados persistidos no Supabase (coach_levels).
 * Segue o mesmo padrão visual do AthleteGroupManager (Ceramic Design System).
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Check, ChevronUp, ChevronDown, GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { Athlete, CoachLevel } from '../../types/flux';
import { GROUP_COLORS, getGroupColorClasses } from '../../types/flux';

const MAX_LEVELS = 10;

interface CustomLevelManagerProps {
  isOpen: boolean;
  onClose: () => void;
  coachUserId: string;
  levels: CoachLevel[];
  onLevelsChange: (levels: CoachLevel[]) => void;
  athletes?: Athlete[];
  onAthleteUpdate?: () => void;
}

export function CustomLevelManager({
  isOpen,
  onClose,
  coachUserId,
  levels,
  onLevelsChange,
  athletes = [],
  onAthleteUpdate,
}: CustomLevelManagerProps) {
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelColor, setNewLevelColor] = useState(GROUP_COLORS[0].id);
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedLevelId(null);
      setSearchQuery('');
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const reloadLevels = async () => {
    const { data, error } = await supabase
      .from('coach_levels')
      .select('*')
      .eq('user_id', coachUserId)
      .order('display_order');
    if (error) throw error;
    onLevelsChange((data || []) as CoachLevel[]);
  };

  const handleCreate = async () => {
    const trimmed = newLevelName.trim();
    if (!trimmed || levels.length >= MAX_LEVELS) return;
    if (levels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('coach_levels').insert({
        user_id: coachUserId,
        name: trimmed,
        color: newLevelColor,
        display_order: levels.length,
      });
      if (error) throw error;
      setNewLevelName('');
      const currentIdx = GROUP_COLORS.findIndex((c) => c.id === newLevelColor);
      setNewLevelColor(GROUP_COLORS[(currentIdx + 1) % GROUP_COLORS.length].id);
      await reloadLevels();
    } catch (err) {
      console.error('[CustomLevelManager] Failed to create level:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRename = async (levelId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('coach_levels')
        .update({ name: trimmed, updated_at: new Date().toISOString() })
        .eq('id', levelId);
      if (error) throw error;
      setEditingLevelId(null);
      setEditingName('');
      await reloadLevels();
    } catch (err) {
      console.error('[CustomLevelManager] Failed to rename level:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    const athleteCount = athletes.filter(a => a.custom_level_id === levelId).length;
    const msg = athleteCount > 0
      ? `Excluir nivel "${level?.name}"? ${athleteCount} atleta(s) perderão este nivel.`
      : `Excluir nivel "${level?.name}"?`;
    if (!window.confirm(msg)) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('coach_levels').delete().eq('id', levelId);
      if (error) throw error;
      if (selectedLevelId === levelId) {
        setSelectedLevelId(null);
      }
      await reloadLevels();
    } catch (err) {
      console.error('[CustomLevelManager] Failed to delete level:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    setIsSaving(true);
    try {
      const prev = levels[index - 1];
      const curr = levels[index];
      const results = await Promise.all([
        supabase.from('coach_levels').update({ display_order: index - 1 }).eq('id', curr.id),
        supabase.from('coach_levels').update({ display_order: index }).eq('id', prev.id),
      ]);
      const promiseError = results.find(r => r.error)?.error;
      if (promiseError) throw promiseError;
      await reloadLevels();
    } catch (err) {
      console.error('[CustomLevelManager] Failed to reorder:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= levels.length - 1) return;
    setIsSaving(true);
    try {
      const next = levels[index + 1];
      const curr = levels[index];
      const results = await Promise.all([
        supabase.from('coach_levels').update({ display_order: index + 1 }).eq('id', curr.id),
        supabase.from('coach_levels').update({ display_order: index }).eq('id', next.id),
      ]);
      const promiseError = results.find(r => r.error)?.error;
      if (promiseError) throw promiseError;
      await reloadLevels();
    } catch (err) {
      console.error('[CustomLevelManager] Failed to reorder:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle athlete into/out of a level (exclusive — one level at a time)
  const handleToggleAthleteLevel = async (athleteId: string, levelId: string) => {
    setIsSaving(true);
    try {
      const athlete = athletes.find((a) => a.id === athleteId);
      const newLevelId = athlete?.custom_level_id === levelId ? null : levelId;

      const { error } = await supabase
        .from('athletes')
        .update({ custom_level_id: newLevelId, updated_at: new Date().toISOString() })
        .eq('id', athleteId);

      if (error) throw error;

      onAthleteUpdate?.();
    } catch (err) {
      console.error('[CustomLevelManager] Failed to toggle athlete level:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter athletes by search query
  const filteredAthletes = athletes.filter((a) => {
    if (!searchQuery.trim()) return true;
    return a.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  // Athletes in the selected level
  const athletesInLevel = selectedLevelId
    ? filteredAthletes.filter((a) => a.custom_level_id === selectedLevelId)
    : [];

  // Athletes NOT in the selected level
  const athletesNotInLevel = selectedLevelId
    ? filteredAthletes.filter((a) => a.custom_level_id !== selectedLevelId)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-ceramic-base w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ceramic-border">
          <div className="flex items-center gap-3">
            <div className="ceramic-inset p-2">
              <GraduationCap className="w-5 h-5 text-ceramic-text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ceramic-text-primary">Niveis Personalizados</h2>
              <p className="text-xs text-ceramic-text-secondary">
                Crie niveis para classificar seus atletas (max {MAX_LEVELS})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ceramic-inset p-2 hover:bg-ceramic-cool transition-colors rounded-lg"
          >
            <X className="w-5 h-5 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Create new level */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Novo Nivel
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                placeholder="Nome do nivel..."
                className="flex-1 ceramic-inset px-3 py-2.5 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                maxLength={40}
                disabled={isSaving || levels.length >= MAX_LEVELS}
              />
              <button
                onClick={handleCreate}
                disabled={!newLevelName.trim() || isSaving || levels.length >= MAX_LEVELS}
                className="ceramic-card p-2.5 hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                title={levels.length >= MAX_LEVELS ? `Limite de ${MAX_LEVELS} niveis atingido` : 'Criar nivel'}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 text-ceramic-text-secondary animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 text-ceramic-text-primary" />
                )}
              </button>
            </div>

            {/* Color picker */}
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setNewLevelColor(color.id)}
                  className={`w-7 h-7 rounded-full ${color.bg} border-2 transition-all ${
                    newLevelColor === color.id
                      ? 'border-ceramic-text-primary scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  title={color.label}
                />
              ))}
            </div>

            {levels.length >= MAX_LEVELS && (
              <p className="text-xs text-ceramic-warning font-medium">
                Limite de {MAX_LEVELS} niveis atingido.
              </p>
            )}
          </div>

          {/* Existing levels list */}
          {levels.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Meus Niveis ({levels.length}/{MAX_LEVELS})
              </label>
              <div className="space-y-2">
                {levels.map((level, index) => {
                  const colors = getGroupColorClasses(level.color);
                  const isEditing = editingLevelId === level.id;
                  const isSelected = selectedLevelId === level.id;
                  const memberCount = athletes.filter((a) => a.custom_level_id === level.id).length;

                  return (
                    <div key={level.id} className={`ceramic-card p-3 transition-all ${isSelected ? 'ring-2 ring-ceramic-accent' : ''}`}>
                      <div className="flex items-center gap-3">
                        {/* Color dot */}
                        <div
                          className={`w-3 h-3 rounded-full ${colors.bg} border border-black/10 flex-shrink-0`}
                        />

                        {/* Name (editable or clickable) */}
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(level.id);
                              if (e.key === 'Escape') {
                                setEditingLevelId(null);
                                setEditingName('');
                              }
                            }}
                            className="flex-1 ceramic-inset px-2 py-1 rounded text-sm text-ceramic-text-primary focus:outline-none focus:ring-1 focus:ring-ceramic-accent/50"
                            autoFocus
                            maxLength={40}
                            disabled={isSaving}
                          />
                        ) : (
                          <button
                            onClick={() => setSelectedLevelId(isSelected ? null : level.id)}
                            className="flex-1 text-left"
                          >
                            <span className="text-sm font-bold text-ceramic-text-primary">
                              {level.name}
                            </span>
                            <span className="ml-2 text-xs text-ceramic-text-secondary">
                              {memberCount} atleta{memberCount !== 1 ? 's' : ''}
                            </span>
                          </button>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Reorder arrows */}
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0 || isSaving}
                            className="p-1.5 hover:bg-ceramic-cool rounded transition-colors disabled:opacity-30"
                            title="Mover para cima"
                          >
                            <ChevronUp className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === levels.length - 1 || isSaving}
                            className="p-1.5 hover:bg-ceramic-cool rounded transition-colors disabled:opacity-30"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                          </button>

                          {/* Edit / Confirm */}
                          {isEditing ? (
                            <button
                              onClick={() => handleRename(level.id)}
                              className="p-1.5 hover:bg-ceramic-success/10 rounded transition-colors"
                              title="Salvar"
                              disabled={isSaving}
                            >
                              <Check className="w-3.5 h-3.5 text-ceramic-success" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLevelId(level.id);
                                setEditingName(level.name);
                              }}
                              className="p-1.5 hover:bg-ceramic-cool rounded transition-colors"
                              title="Renomear"
                            >
                              <Pencil className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(level.id);
                            }}
                            className="p-1.5 hover:bg-ceramic-error/10 rounded transition-colors"
                            title="Excluir nivel"
                            disabled={isSaving}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-ceramic-error" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Athlete assignment (when a level is selected) */}
          {selectedLevelId && athletes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Atribuir Atletas - {levels.find((l) => l.id === selectedLevelId)?.name}
                </label>
                <button
                  onClick={() => setSelectedLevelId(null)}
                  className="text-xs text-ceramic-info hover:underline"
                >
                  Fechar
                </button>
              </div>

              {/* Search athletes */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar atleta..."
                className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
              />

              {/* Athletes in this level */}
              {athletesInLevel.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-ceramic-success uppercase tracking-wider">
                    Neste nivel ({athletesInLevel.length})
                  </p>
                  {athletesInLevel.map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => handleToggleAthleteLevel(athlete.id, selectedLevelId)}
                      className="w-full flex items-center gap-3 px-3 py-2 ceramic-card hover:bg-ceramic-cool transition-colors text-left"
                      disabled={isSaving}
                    >
                      <div className="w-2 h-2 rounded-full bg-ceramic-success flex-shrink-0" />
                      <span className="text-sm text-ceramic-text-primary flex-1 truncate">
                        {athlete.name}
                      </span>
                      <Check className="w-4 h-4 text-ceramic-success flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Athletes NOT in this level */}
              {athletesNotInLevel.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Disponíveis ({athletesNotInLevel.length})
                  </p>
                  {athletesNotInLevel.map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => handleToggleAthleteLevel(athlete.id, selectedLevelId)}
                      className="w-full flex items-center gap-3 px-3 py-2 ceramic-inset hover:bg-white/50 transition-colors text-left rounded-lg"
                      disabled={isSaving}
                    >
                      <div className="w-2 h-2 rounded-full bg-ceramic-border flex-shrink-0" />
                      <span className="text-sm text-ceramic-text-secondary flex-1 truncate">
                        {athlete.name}
                      </span>
                      <Plus className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {levels.length === 0 && (
            <div className="ceramic-inset p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto ceramic-card flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-ceramic-text-secondary" />
              </div>
              <p className="text-sm font-bold text-ceramic-text-primary">Nenhum nivel criado</p>
              <p className="text-xs text-ceramic-text-secondary">
                Crie niveis personalizados (ex: "Elite", "Recreativo", "Competicao")
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ceramic-border">
          <button
            onClick={onClose}
            className="w-full py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-[1.01] transition-transform"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
