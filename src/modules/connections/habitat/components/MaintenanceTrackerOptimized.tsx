/**
 * MAINTENANCE TRACKER - OPTIMIZED
 * Displays and manages maintenance records with pagination
 * Optimized for large lists of maintenance records
 */

import React, { useState, useMemo } from 'react';
import { useMaintenance } from '../hooks/useMaintenance';
import { ListItemSkeleton } from '../../components/skeletons';
import type { MaintenanceStatus, MaintenanceUrgency } from '../types';

interface MaintenanceTrackerProps {
  propertyId: string;
}

const urgencyColors: Record<MaintenanceUrgency, string> = {
  baixa: 'bg-ceramic-info/15 text-ceramic-info border-ceramic-info/30',
  normal: 'bg-ceramic-cool text-ceramic-text-primary border-ceramic-border',
  alta: 'bg-ceramic-warning/15 text-ceramic-warning border-ceramic-warning/30',
  emergencia: 'bg-ceramic-error/15 text-ceramic-error border-ceramic-error/30',
};

const urgencyLabels: Record<MaintenanceUrgency, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  emergencia: 'Emergência',
};

const statusLabels: Record<MaintenanceStatus, string> = {
  pending: 'Pendente',
  scheduled: 'Agendada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const ITEMS_PER_PAGE = 10;

export const MaintenanceTrackerOptimized: React.FC<MaintenanceTrackerProps> = ({
  propertyId,
}) => {
  const { records, loading, filterByStatus, clearFilters } = useMaintenance(propertyId);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleStatusFilter = async (status: string) => {
    if (status === selectedStatus) {
      setSelectedStatus(null);
      await clearFilters();
    } else {
      setSelectedStatus(status);
      await filterByStatus(status);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return records.slice(startIndex, endIndex);
  }, [records, currentPage]);

  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of maintenance tracker
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="bg-ceramic-base border-2 border-ceramic-border rounded-lg p-6">
        <ListItemSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="bg-ceramic-base border-2 border-ceramic-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-ceramic-text-primary">Manutenções</h3>
          {records.length > 0 && (
            <p className="text-sm text-ceramic-text-secondary mt-1">
              {records.length} {records.length === 1 ? 'registro' : 'registros'}
            </p>
          )}
        </div>
        <button className="px-4 py-2 bg-amber-700 text-white font-medium rounded-lg hover:bg-amber-800 transition-colors">
          + Nova Manutenção
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['pending', 'scheduled', 'in_progress'] as MaintenanceStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
              selectedStatus === status
                ? 'bg-amber-700 text-white border-amber-700'
                : 'bg-ceramic-cool text-ceramic-text-primary border-ceramic-border hover:bg-ceramic-cool'
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
        {selectedStatus && (
          <button
            onClick={() => {
              setSelectedStatus(null);
              clearFilters();
            }}
            className="px-3 py-1 rounded-full text-sm font-medium bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-border transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Maintenance List */}
      {records.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔧</div>
          <p className="text-ceramic-text-secondary">
            {selectedStatus
              ? `Nenhuma manutenção com status "${statusLabels[selectedStatus as MaintenanceStatus]}"`
              : 'Nenhuma manutenção registrada'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {paginatedRecords.map((record) => (
              <div
                key={record.id}
                className="border-2 border-ceramic-border rounded-lg p-4 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-ceramic-text-primary">{record.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          urgencyColors[record.urgency]
                        }`}
                      >
                        {urgencyLabels[record.urgency]}
                      </span>
                    </div>
                    {record.description && (
                      <p className="text-sm text-ceramic-text-secondary">{record.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium text-ceramic-text-primary">
                      {statusLabels[record.status]}
                    </div>
                    {record.estimated_cost && (
                      <div className="text-xs text-ceramic-text-secondary">
                        R$ {record.estimated_cost.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-4 text-xs text-ceramic-text-secondary mt-3">
                  {record.scheduled_date && (
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>{new Date(record.scheduled_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  {record.provider_name && (
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <span>{record.provider_name}</span>
                    </div>
                  )}
                  {record.category && (
                    <div className="flex items-center gap-1">
                      <span>🏷️</span>
                      <span className="capitalize">{record.category}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-ceramic-border">
              <div className="text-sm text-ceramic-text-secondary">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-ceramic-cool text-ceramic-text-primary rounded hover:bg-ceramic-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Anterior
                </button>

                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded ${
                          currentPage === pageNum
                            ? 'bg-amber-700 text-white'
                            : 'bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-border'
                        } transition-colors`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-ceramic-cool text-ceramic-text-primary rounded hover:bg-ceramic-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MaintenanceTrackerOptimized;
