import React, { useState } from 'react';
import type { BringListItem } from '../types';
import { useUpdateBringList, useAssignBringListItem, useToggleBringListItem } from '../hooks/useRituals';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('BringListEditor');

interface BringListEditorProps {
  occurrenceId: string;
  bringList: BringListItem[];
  memberId?: string;
  members?: Array<{
    id: string;
    displayName: string;
    avatarUrl?: string;
  }>;
  readonly?: boolean;
}

export const BringListEditor: React.FC<BringListEditorProps> = ({
  occurrenceId,
  bringList,
  memberId,
  members = [],
  readonly = false,
}) => {
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateBringListMutation = useUpdateBringList();
  const assignItemMutation = useAssignBringListItem();
  const toggleItemMutation = useToggleBringListItem();

  const handleAddItem = async () => {
    if (!newItem.trim()) return;

    const updatedList: BringListItem[] = [
      ...bringList,
      {
        id: crypto.randomUUID(),
        item: newItem.trim(),
        completed: false,
      },
    ];

    try {
      await updateBringListMutation.mutateAsync({
        occurrenceId,
        bringList: updatedList,
      });
      setNewItem('');
    } catch (error) {
      log.error('Error adding item:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const updatedList = bringList.filter((item) => item.id !== itemId);

    try {
      await updateBringListMutation.mutateAsync({
        occurrenceId,
        bringList: updatedList,
      });
    } catch (error) {
      log.error('Error removing item:', error);
    }
  };

  const handleToggleItem = async (itemId: string) => {
    try {
      await toggleItemMutation.mutateAsync({
        occurrenceId,
        itemId,
      });
    } catch (error) {
      log.error('Error toggling item:', error);
    }
  };

  const handleAssignItem = async (itemId: string, assignedMemberId: string) => {
    try {
      await assignItemMutation.mutateAsync({
        occurrenceId,
        itemId,
        memberId: assignedMemberId,
      });
      setEditingId(null);
    } catch (error) {
      log.error('Error assigning item:', error);
    }
  };

  const handleVolunteer = async (itemId: string) => {
    if (!memberId) return;
    await handleAssignItem(itemId, memberId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ceramic-900">
          🎒 Lista do que levar
        </h3>
        <span className="text-sm text-ceramic-600">
          {bringList.filter((i) => i.completed).length} / {bringList.length}{' '}
          confirmados
        </span>
      </div>

      {/* Item List */}
      <div className="space-y-2">
        {bringList.length === 0 && (
          <div className="text-center py-8 text-ceramic-500">
            Nenhum item na lista ainda
          </div>
        )}

        {bringList.map((item) => {
          const assignedMember = members.find((m) => m.id === item.assignedTo);
          const isAssignedToMe = item.assignedTo === memberId;
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              className={`p-3 rounded-lg border-2 transition-all ${
                item.completed
                  ? 'bg-ceramic-success/10 border-ceramic-success/30'
                  : item.assignedTo
                  ? 'bg-[#9B4D3A]/5 border-[#9B4D3A]/20'
                  : 'bg-ceramic-base border-ceramic-border'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleItem(item.id)}
                  disabled={readonly || toggleItemMutation.isPending}
                  className="flex-shrink-0 mt-0.5"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      item.completed
                        ? 'bg-ceramic-success border-ceramic-success'
                        : 'border-ceramic-300 hover:border-[#9B4D3A]'
                    }`}
                  >
                    {item.completed && <span className="text-white text-xs">✓</span>}
                  </div>
                </button>

                {/* Item Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium ${
                      item.completed
                        ? 'line-through text-ceramic-500'
                        : 'text-ceramic-900'
                    }`}
                  >
                    {item.item}
                  </div>

                  {/* Assignment Section */}
                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs font-medium text-ceramic-700 mb-1">
                        Atribuir para:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {members.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => handleAssignItem(item.id, member.id)}
                            className="px-3 py-1 bg-[#9B4D3A]/10 hover:bg-[#9B4D3A]/20 text-[#9B4D3A] rounded-full text-xs font-medium transition-colors"
                          >
                            {member.displayName}
                          </button>
                        ))}
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-ceramic-100 hover:bg-ceramic-200 text-ceramic-700 rounded-full text-xs transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : assignedMember ? (
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className="text-[#9B4D3A] font-medium">
                        {assignedMember.displayName}
                        {isAssignedToMe && ' (você)'}
                      </span>
                      {!readonly && (
                        <button
                          onClick={() => setEditingId(item.id)}
                          className="text-xs text-ceramic-500 hover:text-ceramic-700"
                        >
                          alterar
                        </button>
                      )}
                    </div>
                  ) : !readonly ? (
                    <div className="mt-2 flex gap-2">
                      {memberId && (
                        <button
                          onClick={() => handleVolunteer(item.id)}
                          disabled={assignItemMutation.isPending}
                          className="text-xs text-[#9B4D3A] hover:text-[#9B4D3A]/80 font-medium"
                        >
                          🙋 Eu levo
                        </button>
                      )}
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="text-xs text-ceramic-600 hover:text-ceramic-800"
                      >
                        Atribuir
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Remove Button */}
                {!readonly && (
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={updateBringListMutation.isPending}
                    className="flex-shrink-0 text-ceramic-text-tertiary hover:text-ceramic-error transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Item */}
      {!readonly && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder="Adicionar item..."
            className="flex-1 px-4 py-2 border border-ceramic-200 rounded-lg focus:ring-2 focus:ring-[#9B4D3A]/20 focus:border-[#9B4D3A] transition-colors"
          />
          <button
            onClick={handleAddItem}
            disabled={!newItem.trim() || updateBringListMutation.isPending}
            className="px-6 py-2 bg-[#9B4D3A] text-white rounded-lg font-medium hover:bg-[#9B4D3A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
};
