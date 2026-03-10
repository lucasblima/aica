import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Loader2, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { StudioTeamMember } from '../../types/studio';

const log = createNamespacedLogger('TeamPanel');

const ROLE_OPTIONS: { value: string; label: string; description: string; className: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Acesso total ao projeto', className: 'bg-purple-100 text-purple-700' },
  { value: 'editor', label: 'Editor', description: 'Pode editar conteudo e midias', className: 'bg-blue-100 text-blue-700' },
  { value: 'designer', label: 'Designer', description: 'Pode editar elementos visuais', className: 'bg-pink-100 text-pink-700' },
  { value: 'viewer', label: 'Visualizador', description: 'Somente leitura', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
];

const ROLE_LABELS: Record<string, { label: string; className: string }> = Object.fromEntries(
  ROLE_OPTIONS.map(r => [r.value, { label: r.label, className: r.className }])
);

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  active: { label: 'Ativo', className: 'bg-ceramic-success/10 text-ceramic-success' },
  revoked: { label: 'Revogado', className: 'bg-ceramic-error/10 text-ceramic-error' },
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const query = supabase.from('studio_team_members').select('*').eq('user_id', user.id);

      const { data, error: fetchError } = await query.order('invited_at', { ascending: false });
      if (fetchError) throw fetchError;

      setMembers((data || []).map((m: any) => ({
        ...m,
        userId: m.user_id,
        memberEmail: m.member_email,
        invitedAt: new Date(m.invited_at),
        acceptedAt: m.accepted_at ? new Date(m.accepted_at) : undefined,
      })));
    } catch (err) {
      log.error('Failed to load team members:', err);
      setError('Falha ao carregar membros da equipe.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setError('Email inválido. Verifique o formato e tente novamente.');
      return;
    }
    try {
      setInviting(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: insertError } = await supabase
        .from('studio_team_members')
        .insert({
          user_id: user.id,
<<<<<<< HEAD
          project_id: projectId || null,
=======
>>>>>>> 5cabae5e (fix(studio): use correct column names in TeamPanel (user_id, not owner_id))
          member_email: inviteEmail.trim(),
          role: inviteRole,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setSuccessMessage(`Convite enviado para ${inviteEmail.trim()}`);
      setInviteEmail('');
      setShowInviteForm(false);
      loadMembers();
    } catch (err) {
      log.error('Invite failed:', err);
      setError('Falha ao convidar membro. Verifique o email e tente novamente.');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (memberId: string) => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('studio_team_members')
        .update({ status: 'revoked' })
        .eq('id', memberId);

      if (updateError) throw updateError;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'revoked' as const } : m));
    } catch (err) {
      log.error('Revoke failed:', err);
      setError('Falha ao revogar acesso do membro.');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      setChangingRole(memberId);
      setError(null);
      const { error: updateError } = await supabase
        .from('studio_team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (updateError) throw updateError;
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: newRole as StudioTeamMember['role'] } : m
      ));
    } catch (err) {
      log.error('Role change failed:', err);
      setError('Falha ao alterar funcao do membro.');
    } finally {
      setChangingRole(null);
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

      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-ceramic-success/10 border border-ceramic-success/30 text-sm text-ceramic-success font-medium"
          >
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error with Retry */}
      {error && (
        <div className="p-3 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 text-sm text-ceramic-error flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadMembers}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-ceramic-error hover:bg-ceramic-error/10 transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Tentar novamente
          </button>
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
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.description}
                  </option>
                ))}
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
          <UserPlus className="w-8 h-8 text-ceramic-text-secondary/40 mx-auto mb-2" />
          <p className="text-sm text-ceramic-text-secondary">
            Nenhum membro na equipe. Convide alguem!
          </p>
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
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {/* Role badge / dropdown */}
                    {member.status !== 'revoked' ? (
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.id, e.target.value)}
                          disabled={changingRole === member.id}
                          className={`appearance-none cursor-pointer px-2 py-0.5 pr-5 rounded text-[10px] font-bold border-0 focus:outline-none focus:ring-1 focus:ring-amber-400/50 ${roleInfo.className} ${changingRole === member.id ? 'opacity-50' : ''}`}
                        >
                          {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleInfo.className}`}>
                        {roleInfo.label}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Revoke */}
                {member.status !== 'revoked' && (
                  <button
                    onClick={() => handleRevoke(member.id)}
                    className="text-xs font-bold text-ceramic-error hover:text-ceramic-error/80 transition-colors px-2 py-1"
                  >
                    Remover
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
