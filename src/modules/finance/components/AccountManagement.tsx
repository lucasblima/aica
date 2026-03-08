/**
 * AccountManagement Component
 *
 * Full management panel for financial accounts.
 * Add, edit, delete (soft), and set default account.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  CreditCard,
  Landmark,
  Wallet,
  PiggyBank,
  TrendingUp,
} from 'lucide-react';
import type { FinanceAccount } from '../types';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setDefaultAccount,
} from '../services/accountService';

interface AccountManagementProps {
  userId: string;
  onClose?: () => void;
}

const ACCOUNT_TYPE_LABELS: Record<FinanceAccount['account_type'], string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  investment: 'Investimento',
  other: 'Outro',
};

const ACCOUNT_TYPE_ICONS: Record<FinanceAccount['account_type'], React.ElementType> = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: TrendingUp,
  other: Wallet,
};

const COLOR_PRESETS = [
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
];

const BRAZILIAN_BANKS = [
  'Banco do Brasil',
  'Bradesco',
  'Caixa Economica Federal',
  'Itau Unibanco',
  'Santander',
  'Nubank',
  'Inter',
  'C6 Bank',
  'BTG Pactual',
  'Original',
  'Neon',
  'PicPay',
  'Mercado Pago',
  'PagBank',
  'Outro',
];

interface AccountFormData {
  account_name: string;
  bank_name: string;
  account_type: FinanceAccount['account_type'];
  color: string;
}

const INITIAL_FORM: AccountFormData = {
  account_name: '',
  bank_name: '',
  account_type: 'checking',
  color: '#F59E0B',
};

export const AccountManagement: React.FC<AccountManagementProps> = ({
  userId,
  onClose,
}) => {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAccounts(userId);
      setAccounts(data);
    } catch {
      setError('Erro ao carregar contas.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await updateAccount(editingId, {
          account_name: form.account_name.trim(),
          bank_name: form.bank_name || null,
          account_type: form.account_type,
          color: form.color,
        });
      } else {
        await createAccount(userId, {
          account_name: form.account_name.trim(),
          bank_name: form.bank_name || null,
          account_type: form.account_type,
          color: form.color,
          icon: form.account_type,
          is_default: accounts.length === 0,
        });
      }

      setForm(INITIAL_FORM);
      setShowForm(false);
      setEditingId(null);
      await loadAccounts();
    } catch {
      setError(editingId ? 'Erro ao salvar conta. Tente novamente.' : 'Erro ao criar conta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (account: FinanceAccount) => {
    setForm({
      account_name: account.account_name,
      bank_name: account.bank_name || '',
      account_type: account.account_type,
      color: account.color,
    });
    setEditingId(account.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteAccount(id);
      setDeleteConfirmId(null);
      await loadAccounts();
    } catch {
      setError('Erro ao remover conta. Tente novamente.');
    }
  };

  const handleSetDefault = async (id: string) => {
    setError(null);
    try {
      await setDefaultAccount(userId, id);
      await loadAccounts();
    } catch {
      setError('Erro ao definir conta padrão. Tente novamente.');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  return (
    <div className="ceramic-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ceramic-text-primary">
          Gerenciar Contas
        </h3>
        <div className="flex items-center gap-2">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ceramic-accent text-white text-xs font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Conta
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
            >
              <X className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* Error feedback */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ceramic-error/10 text-ceramic-error text-xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:bg-ceramic-error/20 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="ceramic-inset p-4 space-y-3">
          <p className="text-xs font-bold text-ceramic-text-primary">
            {editingId ? 'Editar Conta' : 'Nova Conta'}
          </p>

          {/* Account name */}
          <div>
            <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
              Nome da Conta
            </label>
            <input
              type="text"
              value={form.account_name}
              onChange={(e) => setForm({ ...form, account_name: e.target.value })}
              placeholder="Ex: Conta Principal"
              className="mt-1 w-full px-3 py-2 text-sm bg-ceramic-base border border-ceramic-border rounded-lg text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-ceramic-accent"
              required
            />
          </div>

          {/* Bank */}
          <div>
            <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
              Banco
            </label>
            <select
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm bg-ceramic-base border border-ceramic-border rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-1 focus:ring-ceramic-accent"
            >
              <option value="">Selecione (opcional)</option>
              {BRAZILIAN_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          {/* Account type */}
          <div>
            <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
              Tipo
            </label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(Object.keys(ACCOUNT_TYPE_LABELS) as FinanceAccount['account_type'][]).map(
                (type) => {
                  const Icon = ACCOUNT_TYPE_ICONS[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, account_type: type })}
                      className={`
                        flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium
                        transition-colors
                        ${
                          form.account_type === type
                            ? 'bg-ceramic-accent/15 text-ceramic-accent border border-ceramic-accent/30'
                            : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
                        }
                      `}
                    >
                      <Icon className="w-3 h-3" />
                      {ACCOUNT_TYPE_LABELS[type]}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
              Cor
            </label>
            <div className="mt-1 flex items-center gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: preset.value })}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    form.color === preset.value
                      ? 'scale-110 ring-2 ring-offset-2 ring-ceramic-accent'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !form.account_name.trim()}
              className="flex-1 px-3 py-2 rounded-lg bg-ceramic-accent text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Adicionar'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-3 py-2 rounded-lg ceramic-inset text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Account List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="ceramic-inset p-3 animate-pulse">
              <div className="h-4 bg-ceramic-cool rounded w-32 mb-1" />
              <div className="h-3 bg-ceramic-cool rounded w-20" />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="ceramic-inset p-6 text-center">
          <Wallet className="w-8 h-8 text-ceramic-text-secondary/30 mx-auto mb-2" />
          <p className="text-xs text-ceramic-text-secondary">
            Nenhuma conta cadastrada. Adicione sua primeira conta.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => {
            const Icon = ACCOUNT_TYPE_ICONS[account.account_type] || Wallet;

            return (
              <div
                key={account.id}
                className="ceramic-tray p-3 flex items-center gap-3"
              >
                {/* Color dot + icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${account.color}20` }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: account.color }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ceramic-text-primary truncate">
                      {account.account_name}
                    </p>
                    {account.is_default && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-ceramic-accent/10 text-ceramic-accent font-bold uppercase">
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-ceramic-text-secondary">
                    {account.bank_name || ACCOUNT_TYPE_LABELS[account.account_type]}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!account.is_default && (
                    <button
                      onClick={() => handleSetDefault(account.id)}
                      className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
                      title="Definir como padrão"
                    >
                      <Star className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                  </button>
                  {deleteConfirmId === account.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="flex items-center px-2 py-1 text-[10px] rounded bg-ceramic-error/10 text-ceramic-error font-medium hover:bg-ceramic-error/20 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Confirmar
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 text-[10px] rounded ceramic-inset text-ceramic-text-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(account.id)}
                      className="p-1.5 rounded-lg hover:bg-ceramic-error/10 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
