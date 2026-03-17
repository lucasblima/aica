import React from 'react';
import type { TopExpensiveOperation } from '../../types/aiCost';
import { getOperationLabel, getModelLabel, formatCredits, formatBRL } from '../../types/aiCost';

interface TopExpensiveOperationsTableProps {
  operations: TopExpensiveOperation[];
}

export const TopExpensiveOperationsTable: React.FC<TopExpensiveOperationsTableProps> = ({ operations }) => {
  if (operations.length === 0) {
    return (
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Top 5 Operacoes Mais Caras</h3>
        <div className="ceramic-inset p-8 rounded-xl text-center">
          <p className="text-sm text-ceramic-text-secondary">Nenhuma operação registrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ceramic-card p-6">
      <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Top 5 Operacoes Mais Caras</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ceramic-border">
              <th className="text-left py-3 px-2 text-xs font-bold text-ceramic-text-secondary uppercase">Tipo</th>
              <th className="text-left py-3 px-2 text-xs font-bold text-ceramic-text-secondary uppercase">Modelo</th>
              <th className="text-left py-3 px-2 text-xs font-bold text-ceramic-text-secondary uppercase hidden md:table-cell">Módulo</th>
              <th className="text-left py-3 px-2 text-xs font-bold text-ceramic-text-secondary uppercase hidden md:table-cell">Data</th>
              <th className="text-right py-3 px-2 text-xs font-bold text-ceramic-text-secondary uppercase">Créditos</th>
              <th className="text-right py-3 px-2 text-xs font-bold text-ceramic-text-secondary uppercase hidden lg:table-cell">Custo</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op) => (
              <tr key={op.id} className="border-b border-ceramic-border/50 hover:bg-ceramic-base/50 transition-colors">
                <td className="py-3 px-2">
                  <span className="text-sm font-medium text-ceramic-text-primary">{getOperationLabel(op.action)}</span>
                </td>
                <td className="py-3 px-2">
                  <span className="text-sm text-ceramic-text-secondary">{getModelLabel(op.model_used)}</span>
                </td>
                <td className="py-3 px-2 hidden md:table-cell">
                  <span className="text-xs font-bold text-ceramic-accent uppercase">{op.module || '-'}</span>
                </td>
                <td className="py-3 px-2 hidden md:table-cell">
                  <span className="text-xs text-ceramic-text-secondary">
                    {new Date(op.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="text-sm font-bold text-ceramic-text-primary">{formatCredits(op.credits_used)}</span>
                </td>
                <td className="py-3 px-2 text-right hidden lg:table-cell">
                  <span className="text-xs text-ceramic-text-secondary">{formatBRL(op.cost_brl)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
