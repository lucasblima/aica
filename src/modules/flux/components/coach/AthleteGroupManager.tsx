/**
 * AthleteGroupManager - CRUD para grupos de atletas
 *
 * Permite ao coach criar, renomear, excluir grupos e atribuir atletas.
 * Dados persistidos no Supabase (athlete_groups + athlete_group_members).
 * Migra automaticamente dados legados do localStorage na primeira carga.
 * Segue Ceramic Design System.
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Check, Users, Tag, Loader2, Link2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { Athlete, AthleteGroup, AthleteGroupData } from '../../types/flux';
import { GROUP_COLORS, getGroupColorClasses } from '../../types/flux';
import { CoachInviteLinkService } from '../../services/coachInviteLinkService';

// ============================================
// Supabase persistence helpers
// ============================================

const LEGACY_STORAGE_KEY_PREFIX = 'flux_athlete_groups_';

/**
 * One-time migration from localStorage to Supabase.
 * Runs on first load; removes localStorage key after success.
 */
async function migrateFromLocalStorage(coachUserId: string): Promise<void> {
  const storageKey = `${LEGACY_STORAGE_KEY_PREFIX}${coachUserId}`;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const localData = JSON.parse(raw) as AthleteGroupData;
    if (!localData.groups?.length) {
      localStorage.removeItem(storageKey);
      return;
    }

    for (const group of localData.groups) {
      const { data: inserted } = await supabase
        .from('athlete_groups')
        .upsert(
          {
            id: group.id,
            user_id: coachUserId,
            name: group.name,
            color: group.color,
            created_at: group.createdAt,
          },
          { onConflict: 'user_id,name' }
        )
        .select()
        .single();

      if (!inserted) continue;

      const athleteIds = Object.entries(localData.assignments)
        .filter(([, groupIds]) => groupIds.includes(group.id))
        .map(([athleteId]) => athleteId);

      if (athleteIds.length > 0) {
        await supabase.from('athlete_group_members').upsert(
          athleteIds.map((aid) => ({ group_id: inserted.id, athlete_id: aid })),
          { onConflict: 'group_id,athlete_id' }
        );
      }
    }

    localStorage.removeItem(storageKey);
    // eslint-disable-next-line no-console -- one-time migration diagnostic log
    console.log('[AthleteGroupManager] Migrated groups from localStorage to Supabase');
  } catch (err) {
    console.error('[AthleteGroupManager] Migration failed:', err);
  }
}

/**
 * Load all groups + membership from Supabase.
 * Triggers localStorage migration on first call.
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function loadGroupData(coachUserId: string): Promise<AthleteGroupData> {
  // Migrate legacy data first (no-op if already migrated)
  await migrateFromLocalStorage(coachUserId);

  const { data: groups, error: groupsError } = await supabase
    .from('athlete_groups')
    .select('*')
    .eq('user_id', coachUserId)
    .order('created_at');
  if (groupsError) throw groupsError;

  const groupIds = (groups || []).map((g) => g.id);

  let members: { group_id: string; athlete_id: string }[] = [];
  if (groupIds.length > 0) {
    const { data, error: membersError } = await supabase
      .from('athlete_group_members')
      .select('group_id, athlete_id')
      .in('group_id', groupIds);
    if (membersError) throw membersError;
    members = data || [];
  }

  const assignments: Record<string, string[]> = {};
  for (const m of members) {
    if (!assignments[m.athlete_id]) assignments[m.athlete_id] = [];
    assignments[m.athlete_id].push(m.group_id);
  }

  return {
    groups: (groups || []).map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      createdAt: g.created_at,
    })),
    assignments,
  };
}

/**
 * @deprecated No longer needed — mutations go directly to Supabase.
 * Kept for backward compatibility; does nothing.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function saveGroupData(_coachUserId: string, _data: AthleteGroupData): void {
  // no-op — persistence is now handled per-mutation via Supabase
}

/**
 * Get groups assigned to a specific athlete
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getAthleteGroups(data: AthleteGroupData, athleteId: string): AthleteGroup[] {
  const groupIds = data.assignments[athleteId] || [];
  return data.groups.filter((g) => groupIds.includes(g.id));
}

/**
 * Get all unique group names (for filter pills)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getAllGroups(data: AthleteGroupData): AthleteGroup[] {
  return data.groups;
}

/**
 * Check if an athlete is in a specific group
 */
// eslint-disable-next-line react-refresh/only-export-components
export function isAthleteInGroup(data: AthleteGroupData, athleteId: string, groupId: string): boolean {
  return (data.assignments[athleteId] || []).includes(groupId);
}

// ============================================
// Component Props
// ============================================

interface AthleteGroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  coachUserId: string;
  athletes: Athlete[];
  groupData: AthleteGroupData;
  onGroupDataChange: (data: AthleteGroupData) => void;
}

// ============================================
// Component
// ============================================

export function AthleteGroupManager({
  isOpen,
  onClose,
  coachUserId,
  athletes,
  groupData,
  onGroupDataChange,
}: AthleteGroupManagerProps) {
  // Local state for editing
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0].id);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState<string | null>(null);

  const newGroupInputRef = useRef<HTMLInputElement>(null);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && newGroupInputRef.current) {
      setTimeout(() => newGroupInputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Derived
  const { groups, assignments } = groupData;

  /** Reload data from Supabase and notify parent */
  const reloadData = async () => {
    const updated = await loadGroupData(coachUserId);
    onGroupDataChange(updated);
  };

  // CREATE group
  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;

    // Check duplicate name
    if (groups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('athlete_groups')
        .insert({ user_id: coachUserId, name: trimmed, color: newGroupColor });
      if (error) throw error;

      await reloadData();
      setNewGroupName('');
      // Cycle to next color
      const currentIdx = GROUP_COLORS.findIndex((c) => c.id === newGroupColor);
      setNewGroupColor(GROUP_COLORS[(currentIdx + 1) % GROUP_COLORS.length].id);
    } catch (err) {
      console.error('[AthleteGroupManager] Failed to create group:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // RENAME group
  const handleRenameGroup = async (groupId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('athlete_groups')
        .update({ name: trimmed, updated_at: new Date().toISOString() })
        .eq('id', groupId);
      if (error) throw error;

      await reloadData();
      setEditingGroupId(null);
      setEditingName('');
    } catch (err) {
      console.error('[AthleteGroupManager] Failed to rename group:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // DELETE group
  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const memberCount = Object.values(assignments).filter(ids => ids.includes(groupId)).length;
    const msg = memberCount > 0
      ? `Excluir grupo "${group?.name}"? ${memberCount} atleta(s) serão removidos.`
      : `Excluir grupo "${group?.name}"?`;
    if (!window.confirm(msg)) return;

    setIsSaving(true);
    try {
      // Members cascade-delete via FK
      const { error } = await supabase.from('athlete_groups').delete().eq('id', groupId);
      if (error) throw error;

      await reloadData();

      // If we were viewing this group, deselect
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
    } catch (err) {
      console.error('[AthleteGroupManager] Failed to delete group:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // TOGGLE athlete in group
  const handleToggleAthleteInGroup = async (athleteId: string, groupId: string) => {
    setIsSaving(true);
    try {
      const { data: existing, error: selectError } = await supabase
        .from('athlete_group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('athlete_id', athleteId)
        .maybeSingle();
      if (selectError) throw selectError;

      if (existing) {
        const { error: deleteError } = await supabase.from('athlete_group_members').delete().eq('id', existing.id);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase.from('athlete_group_members').insert({ group_id: groupId, athlete_id: athleteId });
        if (insertError) throw insertError;
      }

      await reloadData();
    } catch (err) {
      console.error('[AthleteGroupManager] Failed to toggle athlete:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // COPY group invite link
  const handleCopyGroupLink = async (groupId: string) => {
    setLinkLoading(groupId);
    try {
      const defaultHealthConfig = {
        requires_cardio_exam: false,
        requires_clearance_cert: false,
        allow_parq_onboarding: false,
      };
      const { data: link, error } = await CoachInviteLinkService.getOrCreateLink(
        defaultHealthConfig,
        10,
        groupId
      );
      if (error) throw error;
      if (link) {
        const url = `https://aica.guru/join/${link.token}`;
        await navigator.clipboard.writeText(url);
        setCopiedGroupId(groupId);
        setTimeout(() => setCopiedGroupId(null), 3000);
      }
    } catch (err) {
      console.error('[AthleteGroupManager] Failed to copy group link:', err);
    } finally {
      setLinkLoading(null);
    }
  };

  // Athletes filtered by search
  const filteredAthletes = athletes.filter((a) => {
    if (!searchQuery.trim()) return true;
    return a.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  // Athletes in selected group
  const athletesInSelectedGroup = selectedGroupId
    ? filteredAthletes.filter((a) => (assignments[a.id] || []).includes(selectedGroupId))
    : [];

  const athletesNotInSelectedGroup = selectedGroupId
    ? filteredAthletes.filter((a) => !(assignments[a.id] || []).includes(selectedGroupId))
    : filteredAthletes;

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
              <Tag className="w-5 h-5 text-ceramic-text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ceramic-text-primary">Grupos de Atletas</h2>
              <p className="text-xs text-ceramic-text-secondary">Organize seus atletas em grupos</p>
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
          {/* Create new group */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Novo Grupo
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={newGroupInputRef}
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateGroup();
                }}
                placeholder="Nome do grupo..."
                className="flex-1 ceramic-inset px-3 py-2.5 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                maxLength={40}
                disabled={isSaving}
              />
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || isSaving}
                className="ceramic-card p-2.5 hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                title="Criar grupo"
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
                  onClick={() => setNewGroupColor(color.id)}
                  className={`w-7 h-7 rounded-full ${color.bg} border-2 transition-all ${
                    newGroupColor === color.id
                      ? 'border-ceramic-text-primary scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Existing groups list */}
          {groups.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Meus Grupos ({groups.length})
              </label>
              <div className="space-y-2">
                {groups.map((group) => {
                  const colors = getGroupColorClasses(group.color);
                  const memberCount = Object.values(assignments).filter((ids) =>
                    ids.includes(group.id)
                  ).length;
                  const isEditing = editingGroupId === group.id;
                  const isSelected = selectedGroupId === group.id;

                  return (
                    <div
                      key={group.id}
                      className={`ceramic-card p-3 transition-all ${
                        isSelected ? 'ring-2 ring-ceramic-accent' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Color dot */}
                        <div className={`w-3 h-3 rounded-full ${colors.bg} border border-black/10 flex-shrink-0`} />

                        {/* Name (editable) */}
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameGroup(group.id);
                              if (e.key === 'Escape') {
                                setEditingGroupId(null);
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
                            onClick={() => setSelectedGroupId(isSelected ? null : group.id)}
                            className="flex-1 text-left"
                          >
                            <span className="text-sm font-bold text-ceramic-text-primary">
                              {group.name}
                            </span>
                            <span className="ml-2 text-xs text-ceramic-text-secondary">
                              {memberCount} atleta{memberCount !== 1 ? 's' : ''}
                            </span>
                          </button>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Copy group invite link */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyGroupLink(group.id);
                            }}
                            disabled={isSaving || linkLoading === group.id}
                            className={`p-1.5 rounded transition-colors ${
                              copiedGroupId === group.id
                                ? 'bg-ceramic-success/10'
                                : 'hover:bg-ceramic-info/10'
                            }`}
                            title={copiedGroupId === group.id ? 'Link copiado!' : 'Copiar link de convite do grupo'}
                          >
                            {linkLoading === group.id ? (
                              <Loader2 className="w-3.5 h-3.5 text-ceramic-text-secondary animate-spin" />
                            ) : copiedGroupId === group.id ? (
                              <Check className="w-3.5 h-3.5 text-ceramic-success" />
                            ) : (
                              <Link2 className="w-3.5 h-3.5 text-ceramic-info" />
                            )}
                          </button>

                          {isEditing ? (
                            <button
                              onClick={() => handleRenameGroup(group.id)}
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
                                setEditingGroupId(group.id);
                                setEditingName(group.name);
                              }}
                              className="p-1.5 hover:bg-ceramic-cool rounded transition-colors"
                              title="Renomear"
                            >
                              <Pencil className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id);
                            }}
                            className="p-1.5 hover:bg-ceramic-error/10 rounded transition-colors"
                            title="Excluir grupo"
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

          {/* Athlete assignment (when a group is selected) */}
          {selectedGroupId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Atribuir Atletas - {groups.find((g) => g.id === selectedGroupId)?.name}
                </label>
                <button
                  onClick={() => setSelectedGroupId(null)}
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

              {/* Athletes in group */}
              {athletesInSelectedGroup.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-ceramic-success uppercase tracking-wider">
                    No grupo ({athletesInSelectedGroup.length})
                  </p>
                  {athletesInSelectedGroup.map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => handleToggleAthleteInGroup(athlete.id, selectedGroupId)}
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

              {/* Athletes NOT in group */}
              {athletesNotInSelectedGroup.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Disponíveis ({athletesNotInSelectedGroup.length})
                  </p>
                  {athletesNotInSelectedGroup.map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => handleToggleAthleteInGroup(athlete.id, selectedGroupId)}
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
          {groups.length === 0 && (
            <div className="ceramic-inset p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto ceramic-card flex items-center justify-center">
                <Users className="w-6 h-6 text-ceramic-text-secondary" />
              </div>
              <p className="text-sm font-bold text-ceramic-text-primary">Nenhum grupo criado</p>
              <p className="text-xs text-ceramic-text-secondary">
                Crie grupos para organizar seus atletas (ex: "Grupo Leme", "Corrida Avancado")
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
