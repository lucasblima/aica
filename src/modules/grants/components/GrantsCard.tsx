import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, FileText, Plus, TrendingUp } from 'lucide-react';
import type { GrantProject, GrantDeadline } from '../types';
import { cardElevationVariants } from '../../../lib/animations/ceramic-motion';

/**
 * GrantsCard Component
 * Dashboard card showing active grant projects, upcoming deadlines, and quick actions
 */

interface GrantsCardProps {
  activeProjects: number;
  upcomingDeadlines: GrantDeadline[];
  recentProjects: GrantProject[];
  onOpenModule: () => void;
  onCreateProject: () => void;
}

export const GrantsCard: React.FC<GrantsCardProps> = ({
  activeProjects,
  upcomingDeadlines,
  recentProjects,
  onOpenModule,
  onCreateProject
}) => {
  // Guard clauses - ensure arrays are valid to prevent .slice() errors
  const deadlines = Array.isArray(upcomingDeadlines) ? upcomingDeadlines : [];
  const projects = Array.isArray(recentProjects) ? recentProjects : [];
  const projectCount = typeof activeProjects === 'number' ? activeProjects : 0;
  /**
   * Format date to relative time (e.g., "5 dias")
   */
  const formatDaysRemaining = (days: number): string => {
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    if (days < 0) return 'Vencido';
    return `${days} dias`;
  };

  /**
   * Get urgency color based on days remaining
   */
  const getUrgencyColor = (days: number): string => {
    if (days < 0) return 'text-red-600';
    if (days <= 3) return 'text-orange-600';
    if (days <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  /**
   * Truncate long text with ellipsis
   */
  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <motion.div
      className="ceramic-card p-6 space-y-6 h-full min-h-[380px] flex flex-col cursor-pointer"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="ceramic-concave w-12 h-12 flex items-center justify-center">
            <FileText className="w-6 h-6 text-ceramic-text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-etched">Captação</h2>
            <p className="text-xs text-ceramic-text-secondary">
              {projectCount} {projectCount === 1 ? 'projeto' : 'projetos'}
            </p>
          </div>
        </div>
        <button
          onClick={onCreateProject}
          className="ceramic-concave w-10 h-10 flex items-center justify-center hover:scale-95 transition-transform"
          title="Novo Projeto"
        >
          <Plus className="w-5 h-5 text-ceramic-text-primary" />
        </button>
      </div>

      {/* Content Area - Flexible */}
      <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
        {/* Active Projects Summary */}
        <div className="ceramic-tray p-4 text-center flex-shrink-0">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-ceramic-text-secondary" />
            <p className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
              Projetos Ativos
            </p>
          </div>
          <p className="text-3xl font-black text-etched">
            {projectCount}
          </p>
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-ceramic-text-secondary" />
          <p className="text-sm font-bold text-ceramic-text-secondary">
            Prazos
          </p>
        </div>

        {deadlines.length === 0 ? (
          <div className="ceramic-inset px-4 py-3 text-center">
            <p className="text-sm text-ceramic-text-tertiary">
              Sem prazos
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {deadlines.slice(0, 3).map((deadline) => (
              <motion.div
                key={deadline.opportunity_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="ceramic-inset px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ceramic-text-primary truncate">
                      {truncate(deadline.opportunity_title, 40)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3 text-ceramic-text-tertiary" />
                      <p className="text-xs text-ceramic-text-secondary">
                        {new Date(deadline.deadline).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-sm font-bold ${getUrgencyColor(deadline.days_remaining)}`}>
                      {formatDaysRemaining(deadline.days_remaining)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="space-y-3 flex-shrink-0">
            <p className="text-sm font-bold text-ceramic-text-secondary">
              Recentes
            </p>
            <div className="space-y-2">
              {projects.slice(0, 2).map((project) => (
                <div
                  key={project.id}
                  className="ceramic-groove rounded-2xl p-3"
                >
                  <p className="text-sm font-medium text-ceramic-text-primary mb-1">
                    {truncate(project.project_name, 35)}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="ceramic-trough p-1">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300"
                          style={{ width: `${project.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-ceramic-text-secondary">
                      {project.completion_percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Open Module Button - Fixed at bottom */}
      <button
        onClick={onOpenModule}
        className="w-full ceramic-concave py-3 px-6 font-bold text-ceramic-text-primary hover:scale-[0.98] active:scale-95 transition-transform flex-shrink-0"
      >
        Abrir Captação
      </button>
    </motion.div>
  );
};

export default GrantsCard;
