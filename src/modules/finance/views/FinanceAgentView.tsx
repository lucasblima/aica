/**
 * Finance Agent View
 *
 * Full-screen chat interface for the Finance AI Agent.
 */

import React, { useEffect, useState } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { ArrowLeft, Sparkles, RefreshCw, Eye, EyeOff } from 'lucide-react';

const log = createNamespacedLogger('FinanceAgentView');
import { AgentChat } from '../components/FinanceAgent/AgentChat';
import { financeAgentService } from '../services/financeAgentService';
import type { AgentContext } from '../types';

// =====================================================
// Types
// =====================================================

interface FinanceAgentViewProps {
  userId: string;
  onBack: () => void;
}

// =====================================================
// Component
// =====================================================

export const FinanceAgentView: React.FC<FinanceAgentViewProps> = ({ userId, onBack }) => {
  const [context, setContext] = useState<AgentContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isValuesVisible, setIsValuesVisible] = useState(false);

  useEffect(() => {
    loadContext();
  }, [userId]);

  const loadContext = async () => {
    try {
      setLoading(true);
      setError(null);
      const ctx = await financeAgentService.buildContext(userId);
      setContext(ctx);
    } catch (err) {
      log.error('Error loading context:', err);
      setError('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const startNewSession = () => {
    setSessionId(crypto.randomUUID());
  };

  const formatCurrency = (value: number) => {
    if (!isValuesVisible) {
      return 'R$ ••••••';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toggleVisibility = () => {
    setIsValuesVisible(!isValuesVisible);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-ceramic-base overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 ceramic-inset flex items-center justify-center hover:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-ceramic-text-primary" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-ceramic-text-primary">Aica Finance</h1>
                <p className="text-xs text-ceramic-text-secondary">Assistente Financeiro</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleVisibility}
              className="ceramic-concave w-10 h-10 flex items-center justify-center hover:scale-95 transition-transform"
              title={isValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
            >
              {isValuesVisible ? (
                <EyeOff className="w-4 h-4 text-ceramic-text-secondary" />
              ) : (
                <Eye className="w-4 h-4 text-ceramic-text-secondary" />
              )}
            </button>
            <button
              onClick={startNewSession}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Nova conversa"
            >
              <RefreshCw className="w-5 h-5 text-ceramic-text-secondary" />
            </button>
          </div>
        </div>

        {/* Context Summary */}
        {context && !loading && (
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-ceramic-text-secondary">Receitas:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(context.summary.totalIncome)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-ceramic-text-secondary">Despesas:</span>
              <span className="font-medium text-red-600">
                {formatCurrency(context.summary.totalExpenses)}
              </span>
            </div>
            {isValuesVisible && (
              <div className="flex items-center gap-1">
                <span className="text-ceramic-text-secondary">Transacoes:</span>
                <span className="font-medium text-ceramic-text-primary">
                  {context.summary.transactionCount}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm text-ceramic-text-secondary">
                Carregando seus dados financeiros...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={loadContext}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : context ? (
          <AgentChat
            key={sessionId}
            userId={userId}
            context={context}
            sessionId={sessionId}
            onNewSession={setSessionId}
          />
        ) : null}
      </div>
    </div>
  );
};

export default FinanceAgentView;
