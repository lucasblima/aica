/**
 * InvitesPage — Dedicated page for managing invites
 * Quick view for coaches to see pending invites and invite history.
 * Wraps InviteModal content in a full page with PageShell.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ticket,
  Copy,
  Share2,
  Check,
  Clock,
  UserPlus,
  Gift,
  Loader2,
  Trash2,
  Link2,
  Users,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PageShell } from '@/components/ui';
import { useInviteSystem } from '@/hooks/useInviteSystem';
import type { EnrichedReferral } from '@/services/inviteSystemService';
import { staggerContainer, staggerItem } from '@/lib/animations/ceramic-motion';

function StatusBadge({ status, isActive }: { status: EnrichedReferral['status']; isActive: boolean }) {
  if (status === 'accepted') {
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        isActive ? 'bg-ceramic-success/10 text-ceramic-success' : 'bg-ceramic-cool text-ceramic-text-secondary'
      }`}>
        {isActive ? 'Ativo' : 'Inativo'}
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ceramic-warning/10 text-ceramic-warning">
        Pendente
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ceramic-cool text-ceramic-text-secondary">
      Expirado
    </span>
  );
}

export default function InvitesPage() {
  const navigate = useNavigate();

  const {
    stats,
    enrichedReferrals,
    conversionRate,
    loading,
    generating,
    revoking,
    currentUrl,
    currentCode,
    hasInvites,
    availableCount,
    generateInvite,
    copyLink,
    shareLink,
    refreshDashboard,
    revokeInvite,
  } = useInviteSystem();

  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    setDashboardError(null);
    refreshDashboard().catch((err) => {
      console.error('[InvitesPage] Dashboard load failed:', err);
      setDashboardError('Não foi possível carregar os dados de convites. Verifique sua conexão e tente novamente.');
    });
  }, [refreshDashboard]);

  useEffect(() => {
    if (copied) { const t = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(t); }
  }, [copied]);

  useEffect(() => {
    if (copiedCode) { const t = setTimeout(() => setCopiedCode(false), 2000); return () => clearTimeout(t); }
  }, [copiedCode]);

  const handleCopy = async () => { if (await copyLink()) setCopied(true); };
  const handleCopyCode = async () => {
    if (!currentCode) return;
    try { await navigator.clipboard.writeText(currentCode); setCopiedCode(true); } catch { setCopiedCode(true); }
  };
  const handleRevoke = async (id: string) => { if (await revokeInvite(id)) refreshDashboard(); };
  const copyInviteUrl = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(true); }
  };

  const formatCode = (code: string) => code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
  const getDaysRemaining = (expiresAt: string) => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));

  const pendingCount = enrichedReferrals.filter(r => r.status === 'pending').length;
  const acceptedCount = enrichedReferrals.filter(r => r.status === 'accepted').length;

  if (loading) {
    return (
      <PageShell title="Convites" onBack={() => navigate('/')}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-ceramic-text-secondary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Convites" onBack={() => navigate('/')}>
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Error banner */}
        {dashboardError && (
          <div className="ceramic-inset p-4 rounded-xl flex items-start gap-3 border border-ceramic-error/20">
            <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-ceramic-error mb-0.5">Erro ao carregar</div>
              <div className="text-xs text-ceramic-text-secondary">{dashboardError}</div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: stats?.available ?? 0, label: 'Disponíveis', color: 'text-ceramic-accent' },
            { value: stats?.total_sent ?? 0, label: 'Enviados', color: 'text-ceramic-text-primary' },
            { value: stats?.total_accepted ?? 0, label: 'Aceitos', color: 'text-ceramic-success' },
            { value: conversionRate > 0 ? `${Math.round(conversionRate * 100)}%` : '--', label: 'Conversão', color: 'text-ceramic-info' },
          ].map(({ value, label, color }) => (
            <div key={label} className="ceramic-inset p-3 text-center rounded-xl">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-ceramic-text-secondary">{label}</div>
            </div>
          ))}
        </div>

        {/* QR + Actions */}
        {hasInvites && currentUrl ? (
          <div className="ceramic-card p-5 rounded-2xl space-y-4">
            <div className="flex gap-4 items-start">
              <QRCodeSVG value={currentUrl} size={112} bgColor="#F5F4EF" fgColor="#44403C" level="M" />
              <div className="flex-1 min-w-0 space-y-3">
                {currentCode && (
                  <div>
                    <div className="text-[10px] text-ceramic-text-secondary font-medium mb-1">Código</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-ceramic-text-primary tracking-wider">{formatCode(currentCode)}</span>
                      <button onClick={handleCopyCode} className="p-1 rounded hover:bg-ceramic-cool transition-colors">
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-ceramic-success" /> : <Copy className="w-3.5 h-3.5 text-ceramic-text-secondary" />}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-ceramic-text-secondary font-medium mb-1">Link</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ceramic-text-secondary font-mono truncate">{currentUrl.replace(/^https?:\/\//, '').slice(0, 28)}...</span>
                    <button onClick={handleCopy} className="p-1 rounded hover:bg-ceramic-cool transition-colors">
                      {copied ? <Check className="w-3.5 h-3.5 text-ceramic-success" /> : <Link2 className="w-3.5 h-3.5 text-ceramic-text-secondary" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={shareLink} className="w-full p-3 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Share2 className="w-4 h-4" /> Compartilhar convite
            </button>
          </div>
        ) : hasInvites ? (
          <button onClick={generateInvite} disabled={generating} className="w-full ceramic-card p-4 flex items-center justify-center gap-2 text-ceramic-accent hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 rounded-2xl">
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gift className="w-5 h-5" />}
            <span className="font-bold">Gerar Convite</span>
          </button>
        ) : (
          <div className="ceramic-inset p-6 rounded-2xl text-center space-y-2">
            <div className="text-4xl mb-2">📭</div>
            <div className="text-ceramic-text-primary font-bold">Sem convites disponíveis</div>
            <div className="text-sm text-ceramic-text-secondary">
              Você ganha +2 convites sempre que alguem aceitar seu convite e se tornar ativo.
            </div>
            <div className="pt-2 text-xs text-ceramic-text-secondary bg-ceramic-cool/50 rounded-lg p-3">
              <span className="font-semibold text-ceramic-text-primary">Como funciona:</span> Cada convite aceito gera
              XP para você e para quem foi convidado. Convites expiram em 7 dias se não forem usados.
            </div>
          </div>
        )}

        {/* Pending section (highlighted) */}
        {pendingCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-ceramic-warning" />
              <h3 className="text-sm font-bold text-ceramic-text-primary">Aguardando aceite</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-ceramic-warning/10 text-ceramic-warning">{pendingCount}</span>
            </div>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
              {enrichedReferrals.filter(r => r.status === 'pending').map((ref) => (
                <motion.div key={ref.id} variants={staggerItem} className="ceramic-card p-3 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-ceramic-warning/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-ceramic-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {ref.invite_code && <span className="text-xs font-mono font-bold text-ceramic-text-primary">{formatCode(ref.invite_code)}</span>}
                      <StatusBadge status="pending" isActive={false} />
                    </div>
                    <div className="text-[10px] text-ceramic-text-secondary">{getDaysRemaining(ref.expires_at)} dias restantes</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => copyInviteUrl(ref.invite_token)} className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors" title="Copiar link">
                      <Copy className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                    </button>
                    <button onClick={() => handleRevoke(ref.id)} disabled={revoking === ref.id} className="p-1.5 rounded-lg hover:bg-ceramic-error/5 transition-colors disabled:opacity-50" title="Revogar">
                      {revoking === ref.id ? <Loader2 className="w-3.5 h-3.5 text-ceramic-error animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-ceramic-error" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Accepted section */}
        {acceptedCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-ceramic-success" />
              <h3 className="text-sm font-bold text-ceramic-text-primary">Aceitos</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-ceramic-success/10 text-ceramic-success">{acceptedCount}</span>
            </div>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
              {enrichedReferrals.filter(r => r.status === 'accepted').map((ref) => (
                <motion.div key={ref.id} variants={staggerItem} className="ceramic-card p-3 rounded-xl flex items-center gap-3">
                  {ref.invitee_avatar ? (
                    <img src={ref.invitee_avatar} alt={ref.invitee_name ?? ''} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-ceramic-success/10 flex items-center justify-center flex-shrink-0">
                      <UserPlus className="w-4 h-4 text-ceramic-success" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ceramic-text-primary truncate">{ref.invitee_name ?? 'Usuario'}</span>
                      <StatusBadge status="accepted" isActive={ref.is_active} />
                    </div>
                    <div className="text-[10px] text-ceramic-text-secondary">
                      Aceito {new Date(ref.accepted_at!).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-ceramic-success flex-shrink-0">+{ref.xp_awarded} XP</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Empty state — no referrals at all */}
        {enrichedReferrals.length === 0 && !dashboardError && (
          <div className="ceramic-inset p-8 rounded-2xl text-center space-y-2">
            <Ticket className="w-8 h-8 text-ceramic-text-secondary mx-auto mb-3" />
            <div className="text-sm font-bold text-ceramic-text-primary">Nenhum convite enviado ainda</div>
            <div className="text-sm text-ceramic-text-secondary">
              Gere seu primeiro convite acima e compartilhe com quem você quer trazer para o Aica.
            </div>
          </div>
        )}

        {/* Minha Rede — link to Connections (#488) */}
        <button
          onClick={() => navigate('/connections')}
          className="w-full ceramic-card p-4 rounded-2xl flex items-center gap-4 hover:scale-[1.01] active:scale-[0.99] transition-transform text-left"
        >
          <div className="w-10 h-10 rounded-full bg-ceramic-info/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-ceramic-info" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-ceramic-text-primary">Minha Rede</div>
            <div className="text-xs text-ceramic-text-secondary">
              Veja sua rede completa de conexoes e contatos
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
        </button>
      </div>
    </PageShell>
  );
}
