import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MemberProfile } from '../types';

interface MemberDirectoryProps {
  members: MemberProfile[];
  currentUserId?: string;
  onContact?: (memberId: string) => void;
  onViewProfile?: (memberId: string) => void;
  showStats?: boolean;
}

export const MemberDirectory: React.FC<MemberDirectoryProps> = ({
  members,
  currentUserId,
  onContact,
  onViewProfile,
  showStats = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Get unique roles
  const roles = Array.from(new Set(members.map((m) => m.role))).sort();

  const roleColors: Record<string, string> = {
    owner: 'bg-ceramic-accent/15 text-ceramic-accent border-ceramic-accent/30',
    admin: 'bg-ceramic-info/15 text-ceramic-info border-ceramic-info/30',
    moderator: 'bg-ceramic-success/15 text-ceramic-success border-ceramic-success/30',
    member: 'bg-ceramic-100 text-ceramic-700 border-ceramic-300',
  };

  const roleLabels: Record<string, string> = {
    owner: 'Dono',
    admin: 'Admin',
    moderator: 'Moderador',
    member: 'Membro',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ceramic-900">
          👥 Membros ({members.length})
        </h2>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar membros..."
          className="w-full px-4 py-2 border border-ceramic-200 rounded-lg focus:ring-2 focus:ring-[#9B4D3A]/20 focus:border-[#9B4D3A] transition-colors"
        />

        {/* Role Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRoleFilter(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              roleFilter === null
                ? 'bg-[#9B4D3A] text-white'
                : 'bg-ceramic-100 text-ceramic-700 hover:bg-ceramic-200'
            }`}
          >
            Todos
          </button>
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                roleFilter === role
                  ? 'bg-[#9B4D3A] text-white'
                  : 'bg-ceramic-100 text-ceramic-700 hover:bg-ceramic-200'
              }`}
            >
              {roleLabels[role] || role}
            </button>
          ))}
        </div>
      </div>

      {/* Member Grid */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 text-ceramic-500">
          Nenhum membro encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const isCurrentUser = member.userId === currentUserId;

            return (
              <div
                key={member.id}
                className={`bg-ceramic-base rounded-xl border-2 p-4 transition-all hover:shadow-lg ${
                  isCurrentUser
                    ? 'border-[#9B4D3A]/40 bg-[#9B4D3A]/5'
                    : 'border-ceramic-border hover:border-[#9B4D3A]/20'
                }`}
              >
                {/* Avatar & Name */}
                <div className="flex items-start gap-3 mb-3">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.displayName}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-[#9B4D3A]/20 to-[#9B4D3A]/10 rounded-full flex items-center justify-center">
                      <span className="text-[#9B4D3A] text-lg font-semibold">
                        {member.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ceramic-900 truncate">
                      {member.displayName}
                      {isCurrentUser && (
                        <span className="text-[#9B4D3A] ml-2">(você)</span>
                      )}
                    </h3>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                        roleColors[member.role] || roleColors.member
                      }`}
                    >
                      {roleLabels[member.role] || member.role}
                    </span>
                  </div>
                </div>

                {/* Joined Date */}
                <div className="text-xs text-ceramic-600 mb-3">
                  Membro desde{' '}
                  {format(new Date(member.joinedAt), "MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </div>

                {/* Stats */}
                {showStats && (
                  <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-ceramic-50 rounded-lg">
                    {member.rsvpHistory && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-[#9B4D3A]">
                          {member.rsvpHistory.length}
                        </div>
                        <div className="text-xs text-ceramic-600">RSVPs</div>
                      </div>
                    )}
                    {member.contributions && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-[#9B4D3A]">
                          {member.contributions.length}
                        </div>
                        <div className="text-xs text-ceramic-600">
                          Contrib.
                        </div>
                      </div>
                    )}
                    {member.discussionCount !== undefined && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-[#9B4D3A]">
                          {member.discussionCount}
                        </div>
                        <div className="text-xs text-ceramic-600">Posts</div>
                      </div>
                    )}
                  </div>
                )}

                {/* RSVP History Preview */}
                {member.rsvpHistory && member.rsvpHistory.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-ceramic-700 mb-2">
                      Eventos recentes:
                    </div>
                    <div className="space-y-1">
                      {member.rsvpHistory.slice(0, 2).map((rsvp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-ceramic-600"
                        >
                          <span>
                            {rsvp.status === 'yes'
                              ? '✓'
                              : rsvp.status === 'maybe'
                              ? '?'
                              : '✗'}
                          </span>
                          <span className="truncate">{rsvp.ritualName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!isCurrentUser && (
                  <div className="flex gap-2">
                    {onContact && (
                      <button
                        onClick={() => onContact(member.id)}
                        className="flex-1 py-2 bg-[#9B4D3A]/10 text-[#9B4D3A] rounded-lg font-medium text-sm hover:bg-[#9B4D3A]/20 transition-colors"
                      >
                        Contatar
                      </button>
                    )}
                    {onViewProfile && (
                      <button
                        onClick={() => onViewProfile(member.id)}
                        className="flex-1 py-2 bg-ceramic-100 text-ceramic-700 rounded-lg font-medium text-sm hover:bg-ceramic-200 transition-colors"
                      >
                        Ver perfil
                      </button>
                    )}
                  </div>
                )}

                {isCurrentUser && (
                  <div className="text-center text-sm text-ceramic-600">
                    Este é você!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
