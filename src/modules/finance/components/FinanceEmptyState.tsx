import React from 'react';
import {
  Upload,
  Target,
  MessageSquare,
  FileText,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// =====================================================
// FinanceEmptyState — Onboarding for New Finance Users
// =====================================================

interface FinanceEmptyStateProps {
  onUploadPDF: () => void;
  onUploadCSV: () => void;
  onNavigateBudget: () => void;
}

const staggerKeyframes = `
@keyframes financeStaggerIn {
  0% {
    opacity: 0;
    transform: translateY(24px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

export const FinanceEmptyState: React.FC<FinanceEmptyStateProps> = ({
  onUploadPDF,
  onUploadCSV,
  onNavigateBudget,
}) => {
  return (
    <>
      <style>{staggerKeyframes}</style>
      <div className="flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
        {/* ── Welcome header ── */}
        <div
          className="text-center mb-8"
          style={{ animation: 'financeStaggerIn 0.5s ease-out forwards' }}
        >
          <div className="ceramic-inset w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Comece sua jornada financeira
          </h2>
          <p className="text-sm text-ceramic-text-secondary max-w-md">
            Organize suas finanças de forma inteligente. Importe seus extratos,
            configure orçamentos e deixe a IA trabalhar por você.
          </p>
        </div>

        {/* ── Step cards ── */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Step 1: Import */}
          <div
            className="ceramic-card p-5 flex flex-col items-center text-center"
            style={{
              opacity: 0,
              animation: 'financeStaggerIn 0.5s ease-out 0.15s forwards',
            }}
          >
            <div className="ceramic-concave w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                Passo 1
              </span>
            </div>
            <h3 className="text-sm font-bold text-ceramic-text-primary mb-1">
              Importe seu extrato
            </h3>
            <p className="text-xs text-ceramic-text-secondary mb-4">
              Envie o extrato do seu banco em PDF ou CSV.
            </p>
            <div className="flex flex-col gap-2 w-full mt-auto">
              <button
                onClick={onUploadPDF}
                className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>
              <button
                onClick={onUploadCSV}
                className="flex items-center justify-center gap-1.5 w-full ceramic-inset rounded-lg px-3 py-2 text-xs font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>
          </div>

          {/* Step 2: Budget */}
          <div
            className="ceramic-card p-5 flex flex-col items-center text-center"
            style={{
              opacity: 0,
              animation: 'financeStaggerIn 0.5s ease-out 0.3s forwards',
            }}
          >
            <div className="ceramic-concave w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                Passo 2
              </span>
            </div>
            <h3 className="text-sm font-bold text-ceramic-text-primary mb-1">
              Configure orçamentos
            </h3>
            <p className="text-xs text-ceramic-text-secondary mb-4">
              Defina limites por categoria e acompanhe seus gastos em tempo real.
            </p>
            <button
              onClick={onNavigateBudget}
              className="flex items-center justify-center gap-2 w-full ceramic-inset rounded-lg px-3 py-2 text-xs font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors mt-auto"
            >
              Configurar orçamentos
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 3: AI Agent */}
          <div
            className="ceramic-card p-5 flex flex-col items-center text-center"
            style={{
              opacity: 0,
              animation: 'financeStaggerIn 0.5s ease-out 0.45s forwards',
            }}
          >
            <div className="ceramic-concave w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                Passo 3
              </span>
            </div>
            <h3 className="text-sm font-bold text-ceramic-text-primary mb-1">
              Converse com o agente
            </h3>
            <p className="text-xs text-ceramic-text-secondary mb-4">
              Pergunte sobre seus gastos, peça insights e receba sugestões personalizadas
              da IA financeira.
            </p>
            <div className="w-full ceramic-inset rounded-lg px-3 py-2 mt-auto">
              <p className="text-[10px] text-ceramic-text-secondary italic">
                "Quanto gastei com alimentação esse mês?" "Onde posso economizar?"
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
