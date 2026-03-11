/**
 * SettingsView — Finance module settings with 4 sub-tabs.
 *
 * Sub-tabs: Contas, Categorias, Extratos, Preferencias
 */

import React, { useState } from 'react';
import { Building2, Tag, FileText, Settings, Upload, Trash2, FileSpreadsheet } from 'lucide-react';
import { AccountManagement } from '../components/AccountManagement';
import { StatementUpload } from '../components/StatementUpload';
import { CSVUpload } from '../components/CSVUpload';
import { useFinanceContext } from '../contexts/FinanceContext';
import { statementService } from '../services/statementService';
import type { FinanceCategoryRow } from '../services/categoryService';

// =====================================================
// Types
// =====================================================

type SettingsTab = 'accounts' | 'categories' | 'statements' | 'preferences';

interface SettingsViewProps {
  userId: string;
}

const SETTINGS_TABS = [
  { key: 'accounts' as const, label: 'Contas', icon: Building2 },
  { key: 'categories' as const, label: 'Categorias', icon: Tag },
  { key: 'statements' as const, label: 'Extratos', icon: FileText },
  { key: 'preferences' as const, label: 'Preferencias', icon: Settings },
];

// =====================================================
// CategoryManager (inline sub-component)
// =====================================================

const CategoryManager: React.FC<{ userId: string }> = () => {
  const { categories } = useFinanceContext();

  if (!categories || categories.length === 0) {
    return (
      <div className="ceramic-card p-6 text-center">
        <p className="text-sm text-ceramic-text-secondary">Nenhuma categoria encontrada.</p>
        <p className="text-xs text-ceramic-text-secondary mt-1">
          As categorias sao criadas automaticamente ao importar extratos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-ceramic-text-primary">
        Categorias ({categories.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat: FinanceCategoryRow) => (
          <div key={cat.id} className="ceramic-card p-4 flex items-center gap-3">
            <span className="text-2xl">{cat.icon || '📦'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ceramic-text-primary truncate">
                {cat.label}
              </p>
              <p className="text-xs text-ceramic-text-secondary">
                {cat.is_expense ? 'Despesa' : 'Receita'}
              </p>
            </div>
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// =====================================================
// StatementManager (inline sub-component)
// =====================================================

const StatementManager: React.FC<{ userId: string }> = ({ userId }) => {
  const { statements, refreshAll } = useFinanceContext();
  const [showUpload, setShowUpload] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUploadComplete = () => {
    setShowUpload(false);
    setShowCSVUpload(false);
    refreshAll();
  };

  const handleDeleteStatement = async (statementId: string) => {
    if (!confirm('Deletar este extrato e todas as suas transacoes?')) return;
    try {
      setDeleting(true);
      await statementService.deleteStatement(statementId);
      refreshAll();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ceramic-text-primary">
          Extratos ({statements.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
          >
            <Upload className="w-3 h-3" /> PDF
          </button>
          <button
            onClick={() => setShowCSVUpload(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-ceramic-info text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            <FileSpreadsheet className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      {showUpload && (
        <StatementUpload
          userId={userId}
          onUploadComplete={() => handleUploadComplete()}
        />
      )}

      {showCSVUpload && (
        <CSVUpload
          userId={userId}
          onSuccess={() => handleUploadComplete()}
          onClose={() => setShowCSVUpload(false)}
        />
      )}

      {statements.length === 0 ? (
        <div className="ceramic-card p-6 text-center">
          <p className="text-sm text-ceramic-text-secondary">
            Nenhum extrato importado ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {statements.map((s) => (
            <div key={s.id} className="ceramic-card p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ceramic-text-primary truncate">
                  {s.file_name}
                </p>
                <div className="flex gap-3 text-xs text-ceramic-text-secondary mt-1">
                  {s.bank_name && <span>{s.bank_name}</span>}
                  <span>{s.transaction_count} transacoes</span>
                  <span
                    className={`font-medium ${
                      s.processing_status === 'completed'
                        ? 'text-ceramic-success'
                        : s.processing_status === 'failed'
                          ? 'text-ceramic-error'
                          : 'text-ceramic-warning'
                    }`}
                  >
                    {s.processing_status === 'completed'
                      ? 'Concluido'
                      : s.processing_status === 'failed'
                        ? 'Falhou'
                        : 'Processando'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteStatement(s.id)}
                disabled={deleting}
                className="p-2 text-ceramic-text-secondary hover:text-ceramic-error transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =====================================================
// PreferencesPanel (inline sub-component)
// =====================================================

const PreferencesPanel: React.FC = () => {
  const [hideValues, setHideValues] = useState(() => {
    const saved = localStorage.getItem('finance_values_visible');
    return saved !== null ? !JSON.parse(saved) : false;
  });

  return (
    <div className="ceramic-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-ceramic-text-primary">Preferencias</h3>
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-ceramic-text-primary">Ocultar valores por padrao</span>
        <input
          type="checkbox"
          checked={hideValues}
          onChange={(e) => {
            setHideValues(e.target.checked);
            localStorage.setItem(
              'finance_values_visible',
              JSON.stringify(!e.target.checked)
            );
          }}
          className="rounded border-ceramic-border"
        />
      </label>
    </div>
  );
};

// =====================================================
// SettingsView (main component)
// =====================================================

export const SettingsView: React.FC<SettingsViewProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('accounts');

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-ceramic-border pb-2">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-ceramic-cool text-ceramic-text-primary border-b-2 border-amber-500'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      {activeTab === 'accounts' && <AccountManagement userId={userId} />}
      {activeTab === 'categories' && <CategoryManager userId={userId} />}
      {activeTab === 'statements' && <StatementManager userId={userId} />}
      {activeTab === 'preferences' && <PreferencesPanel />}
    </div>
  );
};

export default SettingsView;
