import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { StudioTeamMember } from '../../types/studio';

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-700' },
  editor: { label: 'Editor', className: 'bg-blue-100 text-blue-700' },
  designer: { label: 'Designer', className: 'bg-pink-100 text-pink-700' },
  viewer: { label: 'Visualizador', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  active: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
  revoked: { label: 'Revogado', className: 'bg-red-100 text-red-700' },
};

interface TeamPanelProps {
  projectId?: string;
}

export const TeamPanel: React.FC<TeamPanelProps> = ({ projectId }) => {
  const [members, setMembers] = useState<StudioTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'designer' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from('studio_team_members').select('*').eq('owner_id', user.id);
      if (projectId) query = query.eq('project_id', projectId);

      const { data, error: fetchError } = await query.order('invited_at', { ascending: false });
      if (fetchError) throw fetchError;

      setMembers((data || []).map((m: any) => ({
        ...m,
        memberEmail: m.member_email,
        invitedAt: new Date(m.invited_at),
        acceptedAt: m.accepted_at ? new Date(m.accepted_at) : undefined,
      })));
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: insertError } = await supabase
        .from('studio_team_members')
        .insert({
          owner_id: user.id,
          project_id: projectId || null,
          member_email: inviteEmail.trim(),
          role: inviteRole,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setInviteEmail('');
      setShowInviteForm(false);
      loadMembers();
    } catch (err) {
      console.error('Invite failed:', err);
      setError('Falha ao convidar membro. Verifique o email e tente novamente.');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (memberId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('studio_team_members')
        .update({ status: 'revoked' })
        .eq('id', memberId);

      if (updateError) throw updateError;
      loadMembers();
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  };

  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    return parts.map(p => p[0]?.toUpperCase() || '').slice(0, 2).join('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">Equipe</h3>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
        >
          {showInviteForm ? <X className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
          {showInviteForm ? 'Cancelar' : 'Convidar Membro'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 text-sm text-ceramic-error">
          {error}
        </div>
      )}

      {/* Invite Form */}
      <AnimatePresence>
        {showInviteForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ceramic-card rounded-2xl p-4 space-y-3 overflow-hidden"
          >
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colaborador@exemplo.com"
                className="w-full rounded-xl bg-ceramic-cool border border-ceramic-border px-3 py-2 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary mb-1 block">
                Funcao
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as any)}
                className="w-full rounded-xl bg-ceramic-cool border border-ceramic-border px-3 py-2 text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="designer">Designer</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Enviar Convite
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="ceramic-card rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ceramic-cool animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-ceramic-cool animate-pulse rounded w-1/2" />
                <div className="h-3 bg-ceramic-cool animate-pulse rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="ceramic-inset rounded-2xl p-6 text-center">
          <p className="text-sm text-ceramic-text-secondary">Nenhum membro na equipe ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.viewer;
            const statusInfo = STATUS_LABELS[member.status] || STATUS_LABELS.pending;
            return (
              <div key={member.id} className="ceramic-card rounded-2xl p-4 flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-bold flex-shrink-0">
                  {getInitials(member.memberEmail)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ceramic-text-primary truncate">{member.memberEmail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleInfo.className}`}>
                      {roleInfo.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Revoke */}
                {member.status !== 'revoked' && (
                  <button
                    onClick={() => handleRevoke(member.id)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors px-2 py-1"
                  >
                    Revogar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
