import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Activity, MoreVertical, Trash2, Edit3, UserPlus } from 'lucide-react';
import { UnifiedHeader } from '@/components/layout/UnifiedHeader';
import { useSpace } from '../hooks/useSpace';
import { useSpaceMembers } from '../hooks/useSpaceMembers';
import { ARCHETYPE_CONFIG } from '../types';
import { AddMemberSheet } from '../components/AddMemberSheet';
import { CeramicLoadingState } from '@/components';
import type { ConnectionMember, MemberRole } from '../types';

type Tab = 'members' | 'activity';

export function SpaceDetailView() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { space, loading: spaceLoading, error: spaceError, deleteSpace } = useSpace(spaceId);
  const {
    members,
    loading: membersLoading,
    isAdmin,
    addMember,
    removeMember,
    updateRole,
    refresh: refreshMembers,
  } = useSpaceMembers(spaceId);

  if (spaceLoading) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex items-center justify-center">
        <CeramicLoadingState variant="page" />
      </div>
    );
  }

  if (spaceError || !space) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex flex-col items-center justify-center px-6">
        <div className="ceramic-card p-8 max-w-md text-center">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Grupo não encontrado
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-4">
            Este grupo pode ter sido removido ou você não tem acesso.
          </p>
          <button
            onClick={() => navigate('/connections')}
            className="ceramic-card px-6 py-2 text-sm font-bold text-ceramic-accent"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const config = ARCHETYPE_CONFIG[space.archetype];

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este grupo?')) return;
    try {
      await deleteSpace();
      navigate('/connections');
    } catch {
      // error handled by hook
    }
  };

  const handleMemberAdded = async () => {
    setShowAddMember(false);
    await refreshMembers();
  };

  const getRoleBadge = (role: MemberRole) => {
    switch (role) {
      case 'owner': return { label: 'Dono', cls: 'bg-ceramic-accent/10 text-ceramic-accent' };
      case 'admin': return { label: 'Admin', cls: 'bg-ceramic-info/10 text-ceramic-info' };
      case 'guest': return { label: 'Convidado', cls: 'bg-ceramic-warning/10 text-ceramic-warning' };
      default: return null;
    }
  };

  const getMemberDisplayName = (member: ConnectionMember) => {
    return member.external_name || member.external_email || member.user_id?.slice(0, 8) || 'Membro';
  };

  const getMemberInitials = (member: ConnectionMember) => {
    const name = getMemberDisplayName(member);
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header */}
      <UnifiedHeader
        title={space?.name || 'Espaço'}
        breadcrumbs={[{ label: 'Conexões', onClick: () => navigate('/connections') }]}
        actions={
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="ceramic-inset w-10 h-10 flex items-center justify-center hover:scale-95 transition-transform"
              aria-label="Menu"
            >
              <MoreVertical className="w-5 h-5 text-ceramic-text-secondary" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-12 z-50 ceramic-card p-2 min-w-[180px] shadow-lg">
                  <button
                    onClick={() => { setShowMenu(false); /* TODO: edit modal */ }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ceramic-text-primary hover:bg-ceramic-accent/5 transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-ceramic-text-secondary" />
                    Editar
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ceramic-error hover:bg-ceramic-error/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        }
        collapsible={false}
        showNotifications={false}
      />

      {/* Space info + Tabs */}
      <div className="px-6 pb-4">
        {/* Space info */}
        <div className="flex items-center gap-4 mb-1">
          <div className="ceramic-inset w-14 h-14 flex items-center justify-center text-3xl flex-shrink-0">
            {space.icon || config?.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-ceramic-text-primary text-etched truncate">
              {space.name}
            </h1>
            <p className="text-xs text-ceramic-text-secondary">
              {config?.icon} {config?.label} · {members.length} {members.length === 1 ? 'membro' : 'membros'}
            </p>
          </div>
        </div>
        {space.description && (
          <p className="text-sm text-ceramic-text-secondary mt-2 line-clamp-2">{space.description}</p>
        )}

        {/* Tabs */}
        <div className="flex mt-4 gap-1">
          {(['members', 'activity'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'ceramic-shadow text-ceramic-accent'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              {tab === 'members' ? <Users className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
              {tab === 'members' ? 'Membros' : 'Atividade'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-40">
        {activeTab === 'members' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="ceramic-card h-16 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {members.map(member => {
                  const badge = getRoleBadge(member.role);
                  return (
                    <div
                      key={member.id}
                      className="ceramic-card p-4 flex items-center gap-3"
                    >
                      {/* Avatar */}
                      <div className="ceramic-concave w-10 h-10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-ceramic-text-secondary">
                        {getMemberInitials(member)}
                      </div>

                      {/* Name + context */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ceramic-text-primary truncate">
                          {getMemberDisplayName(member)}
                        </p>
                        {member.context_label && (
                          <p className="text-xs text-ceramic-text-secondary truncate">
                            {member.context_label}
                          </p>
                        )}
                      </div>

                      {/* Role badge */}
                      {badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}

                      {/* Remove button (admin only, not for owner) */}
                      {isAdmin && member.role !== 'owner' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Remover ${getMemberDisplayName(member)}?`)) {
                              removeMember(member.id);
                            }
                          }}
                          className="ceramic-inset w-8 h-8 flex items-center justify-center hover:scale-95 transition-transform"
                          aria-label="Remover membro"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add member button */}
                {isAdmin && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="ceramic-card w-full p-4 flex items-center gap-3 text-ceramic-accent hover:scale-[1.01] active:scale-[0.99] transition-transform"
                  >
                    <div className="ceramic-inset w-10 h-10 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-ceramic-accent" />
                    </div>
                    <span className="text-sm font-bold">Adicionar membro</span>
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ceramic-tray p-8 text-center"
          >
            <Activity className="w-8 h-8 text-ceramic-text-secondary mx-auto mb-3" />
            <p className="text-sm text-ceramic-text-secondary">
              Atividade recente aparecerá aqui.
            </p>
          </motion.div>
        )}
      </main>

      {/* Add Member Sheet */}
      <AddMemberSheet
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        spaceId={spaceId || ''}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
}

export default SpaceDetailView;
