/**
 * ApprovedProjectModal - Modal para cadastro de projetos aprovados via Lei de Incentivo
 * Issue #96 - Cadastro de projetos para captação incentivada
 *
 * @module modules/grants/components/ApprovedProjectModal
 */

import React, { useState } from 'react';
import { X, FileText, Calendar, DollarSign, Hash, Landmark, Check } from 'lucide-react';
import { useIncentiveLaws } from '../hooks/useIncentiveLaws';
import { IncentiveLawCardCompact } from './IncentiveLawCard';
import type { IncentiveLaw } from '../types/incentiveLaws';

interface ApprovedProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    project_name: string;
    incentive_law_id: string;
    approval_number?: string;
    approved_value?: number;
    capture_deadline?: string;
  }) => Promise<void>;
}

export function ApprovedProjectModal({
  isOpen,
  onClose,
  onSave,
}: ApprovedProjectModalProps) {
  // Form state
  const [projectName, setProjectName] = useState('');
  const [selectedLaw, setSelectedLaw] = useState<IncentiveLaw | null>(null);
  const [approvalNumber, setApprovalNumber] = useState('');
  const [approvedValue, setApprovedValue] = useState('');
  const [captureDeadline, setCaptureDeadline] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load incentive laws
  const { laws, loading: loadingLaws } = useIncentiveLaws();

  // Reset form
  const resetForm = () => {
    setProjectName('');
    setSelectedLaw(null);
    setApprovalNumber('');
    setApprovedValue('');
    setCaptureDeadline('');
    setError(null);
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!projectName.trim()) {
      setError('Nome do projeto é obrigatório');
      return;
    }
    if (!selectedLaw) {
      setError('Selecione uma lei de incentivo');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        project_name: projectName.trim(),
        incentive_law_id: selectedLaw.id,
        approval_number: approvalNumber.trim() || undefined,
        approved_value: approvedValue ? parseFloat(approvedValue.replace(/\D/g, '')) / 100 : undefined,
        capture_deadline: captureDeadline || undefined,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar projeto');
    } finally {
      setIsSaving(false);
    }
  };

  // Format currency input
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = (parseInt(value || '0') / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    setApprovedValue(formatted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative ceramic-card w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl ceramic-inset-shallow">
              <Landmark className="w-6 h-6 text-ceramic-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ceramic-text-primary">
                Cadastrar Projeto Aprovado
              </h2>
              <p className="text-sm text-ceramic-text-secondary font-medium">
                Projeto aprovado via lei de incentivo fiscal
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-ceramic-warm-hover rounded-full transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5 text-ceramic-text-primary" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl border-2 border-ceramic-negative bg-red-50 text-ceramic-negative font-semibold text-sm">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-3">
              <FileText className="w-4 h-4 inline mr-2 text-ceramic-accent" />
              Nome do Projeto *
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Festival de Jazz 2026"
              className="w-full px-4 py-3 ceramic-input text-ceramic-text-primary placeholder:text-ceramic-neutral focus:outline-none focus:ring-2 focus:ring-ceramic-accent transition-shadow"
              required
            />
          </div>

          {/* Incentive Law Selection */}
          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-3">
              <Landmark className="w-4 h-4 inline mr-2 text-ceramic-accent" />
              Lei de Incentivo *
            </label>
            {loadingLaws ? (
              <div className="p-6 text-center text-ceramic-text-secondary font-medium">
                Carregando leis de incentivo...
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto p-1 ceramic-tray">
                {laws.map((law) => (
                  <div
                    key={law.id}
                    onClick={() => setSelectedLaw(law)}
                    className={`cursor-pointer transition-all ${
                      selectedLaw?.id === law.id ? 'ring-2 ring-ceramic-accent' : ''
                    }`}
                  >
                    <IncentiveLawCardCompact
                      law={law}
                      selected={selectedLaw?.id === law.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approval Number */}
          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-3">
              <Hash className="w-4 h-4 inline mr-2 text-ceramic-accent" />
              Número de Aprovação (PRONAC/Processo)
            </label>
            <input
              type="text"
              value={approvalNumber}
              onChange={(e) => setApprovalNumber(e.target.value)}
              placeholder="Ex: PRONAC 231234 ou Processo nº 12345/2026"
              className="w-full px-4 py-3 ceramic-input text-ceramic-text-primary placeholder:text-ceramic-neutral focus:outline-none focus:ring-2 focus:ring-ceramic-accent transition-shadow"
            />
          </div>

          {/* Approved Value */}
          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-3">
              <DollarSign className="w-4 h-4 inline mr-2 text-ceramic-accent" />
              Valor Aprovado para Captação
            </label>
            <input
              type="text"
              value={approvedValue}
              onChange={handleValueChange}
              placeholder="R$ 0,00"
              className="w-full px-4 py-3 ceramic-input text-ceramic-text-primary placeholder:text-ceramic-neutral focus:outline-none focus:ring-2 focus:ring-ceramic-accent transition-shadow"
            />
          </div>

          {/* Capture Deadline */}
          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-3">
              <Calendar className="w-4 h-4 inline mr-2 text-ceramic-accent" />
              Prazo para Captação
            </label>
            <input
              type="date"
              value={captureDeadline}
              onChange={(e) => setCaptureDeadline(e.target.value)}
              className="w-full px-4 py-3 ceramic-input text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent transition-shadow"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-ceramic-text-secondary/20 bg-ceramic-cool">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-6 py-3 ceramic-button-secondary font-semibold transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving || !projectName.trim() || !selectedLaw}
            className="flex items-center gap-2 px-6 py-3 ceramic-button-primary font-bold transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Cadastrar Projeto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApprovedProjectModal;
