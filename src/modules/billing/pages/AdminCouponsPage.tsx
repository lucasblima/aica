import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Coins, Ticket, ToggleLeft, ToggleRight } from 'lucide-react';
import { PageShell } from '@/components/ui';
import { Logo } from '@/components/ui/Logo';
import { useAdminCoupons } from '@/hooks/useAdminCoupons';

export function AdminCouponsPage() {
  const navigate = useNavigate();
  const { coupons, isLoading, createCoupon, toggleCoupon, topUp } = useAdminCoupons();

  // Top-up form
  const [topUpUserId, setTopUpUserId] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpReason, setTopUpReason] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpMessage, setTopUpMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Create coupon form
  const [newCode, setNewCode] = useState('');
  const [newCredits, setNewCredits] = useState('');
  const [newMaxRedemptions, setNewMaxRedemptions] = useState('');
  const [newMaxPerUser, setNewMaxPerUser] = useState('1');
  const [newCampaign, setNewCampaign] = useState('');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [newPlans, setNewPlans] = useState<string[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ text: string; success: boolean } | null>(null);

  const handleTopUp = async () => {
    if (!topUpUserId.trim() || !topUpAmount) return;
    setTopUpLoading(true);
    setTopUpMessage(null);
    const result = await topUp(topUpUserId.trim(), parseInt(topUpAmount, 10), topUpReason || 'Admin top-up');
    setTopUpMessage({ text: result.message, success: result.success });
    if (result.success) {
      setTopUpUserId('');
      setTopUpAmount('');
      setTopUpReason('');
    }
    setTopUpLoading(false);
    setTimeout(() => setTopUpMessage(null), 4000);
  };

  const handleCreateCoupon = async () => {
    if (!newCode.trim() || !newCredits) return;
    setCreateLoading(true);
    setCreateMessage(null);
    const result = await createCoupon({
      code: newCode.trim(),
      credits: parseInt(newCredits, 10),
      maxRedemptions: newMaxRedemptions ? parseInt(newMaxRedemptions, 10) : null,
      maxPerUser: parseInt(newMaxPerUser, 10) || 1,
      allowedPlans: newPlans.length > 0 ? newPlans : null,
      campaign: newCampaign.trim() || null,
      expiresAt: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
    });
    setCreateMessage({ text: result.message, success: result.success });
    if (result.success) {
      setNewCode('');
      setNewCredits('');
      setNewMaxRedemptions('');
      setNewMaxPerUser('1');
      setNewCampaign('');
      setNewExpiresAt('');
      setNewPlans([]);
    }
    setCreateLoading(false);
    setTimeout(() => setCreateMessage(null), 4000);
  };

  const togglePlan = (plan: string) => {
    setNewPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-6">
        <Logo width={36} onClick={() => navigate('/vida')} className="rounded-lg" />
        <button
          onClick={() => navigate('/admin')}
          className="w-9 h-9 ceramic-card-flat flex items-center justify-center rounded-full"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
        </button>
        <h1 className="text-2xl font-bold text-ceramic-text-primary">Admin — Cupons</h1>
      </div>

      <div className="space-y-6">
        {/* Section 1: Top-Up Manual */}
        <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">
              Top-Up Manual
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={topUpUserId}
              onChange={(e) => setTopUpUserId(e.target.value)}
              placeholder="User ID (UUID)"
              className="border border-ceramic-border rounded-lg px-3 py-2 text-sm bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <input
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="Creditos"
              min="1"
              className="border border-ceramic-border rounded-lg px-3 py-2 text-sm bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <input
              type="text"
              value={topUpReason}
              onChange={(e) => setTopUpReason(e.target.value)}
              placeholder="Motivo (opcional)"
              className="border border-ceramic-border rounded-lg px-3 py-2 text-sm bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleTopUp}
              disabled={topUpLoading || !topUpUserId.trim() || !topUpAmount}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
            >
              {topUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar Creditos'}
            </button>
            {topUpMessage && (
              <span className={`text-sm font-medium ${topUpMessage.success ? 'text-ceramic-success' : 'text-ceramic-error'}`}>
                {topUpMessage.text}
              </span>
            )}
          </div>
        </div>

        {/* Section 2: Criar Cupom */}
        <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">
              Criar Cupom
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Codigo</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="AICA50"
                className="w-full border border-ceramic-border rounded-lg px-3 py-2 text-sm uppercase bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Creditos</label>
              <input
                type="number"
                value={newCredits}
                onChange={(e) => setNewCredits(e.target.value)}
                placeholder="50"
                min="1"
                className="w-full border border-ceramic-border rounded-lg px-3 py-2 text-sm bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Limite total</label>
              <input
                type="number"
                value={newMaxRedemptions}
                onChange={(e) => setNewMaxRedemptions(e.target.value)}
                placeholder="Ilimitado"
                min="1"
                className="w-full border border-ceramic-border rounded-lg px-3 py-2 text-sm bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Por usuario</label>
              <input
                type="number"
                value={newMaxPerUser}
                onChange={(e) => setNewMaxPerUser(e.target.value)}
                placeholder="1"
                min="1"
                className="w-full border border-ceramic-border rounded-lg px-3 py-2 text-sm bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Campanha</label>
              <input
                type="text"
                value={newCampaign}
                onChange={(e) => setNewCampaign(e.target.value)}
                placeholder="launch, onboarding, partner..."
                className="w-full border border-ceramic-border rounded-lg px-3 py-2 text-sm bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">Expira em</label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                className="w-full border border-ceramic-border rounded-lg px-3 py-2 text-sm bg-ceramic-base text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-ceramic-text-secondary mb-2">Planos permitidos</label>
            <div className="flex gap-3">
              {['free', 'pro', 'teams'].map((plan) => (
                <label key={plan} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlans.includes(plan)}
                    onChange={() => togglePlan(plan)}
                    className="rounded border-ceramic-border text-amber-500 focus:ring-amber-500/30"
                  />
                  <span className="capitalize text-ceramic-text-primary">{plan}</span>
                </label>
              ))}
              <span className="text-xs text-ceramic-text-secondary ml-2 self-center">
                {newPlans.length === 0 && '(todos)'}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleCreateCoupon}
              disabled={createLoading || !newCode.trim() || !newCredits}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
            >
              {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Cupom'}
            </button>
            {createMessage && (
              <span className={`text-sm font-medium ${createMessage.success ? 'text-ceramic-success' : 'text-ceramic-error'}`}>
                {createMessage.text}
              </span>
            )}
          </div>
        </div>

        {/* Section 3: Cupons Existentes */}
        <div className="bg-ceramic-50 rounded-xl shadow-ceramic-emboss overflow-hidden">
          <div className="p-5 pb-3 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">
              Cupons Existentes
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="px-5 pb-5">
              <p className="text-sm text-ceramic-text-secondary italic">
                Nenhum cupom criado ainda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ceramic-text-secondary/10">
                    <th className="text-left px-5 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Codigo
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Creditos
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Usos
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary hidden md:table-cell">
                      Campanha
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary hidden md:table-cell">
                      Expira
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Ativo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr
                      key={coupon.id}
                      className="border-b border-ceramic-text-secondary/5 hover:bg-ceramic-text-secondary/5 transition-colors"
                    >
                      <td className="px-5 py-3 text-ceramic-text-primary font-bold font-mono">
                        {coupon.code}
                      </td>
                      <td className="px-3 py-3 text-right text-amber-600 font-bold">
                        {coupon.credits}
                      </td>
                      <td className="px-3 py-3 text-right text-ceramic-text-secondary">
                        {coupon.current_redemptions}/{coupon.max_redemptions ?? '\u221E'}
                      </td>
                      <td className="px-3 py-3 text-ceramic-text-secondary hidden md:table-cell">
                        {coupon.campaign ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-ceramic-text-secondary hidden md:table-cell">
                        {formatDate(coupon.expires_at)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleCoupon(coupon.id, !coupon.is_active)}
                          className="inline-flex items-center"
                          title={coupon.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {coupon.is_active ? (
                            <ToggleRight className="w-6 h-6 text-ceramic-success" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-ceramic-text-secondary" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default AdminCouponsPage;
