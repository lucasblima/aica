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
      data-testid="grants-card"
      className="ceramic-card p-5 h-full min-h-[180px] flex flex-col cursor-pointer relative overflow-hidden"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
      data-testid="grants-card"
    >
      {/* Decorative Background Icon */}
      <FileText className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-200 opacity-10" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="ceramic-concave w-7 h-7 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">Captação</h2>
            <p className="text-[9px] text-ceramic-text-tertiary mt-0.5">
              {projectCount} {projectCount === 1 ? 'projeto' : 'projetos'}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCreateProject();
          }}
          className="ceramic-concave w-7 h-7 flex items-center justify-center hover:scale-95 transition-transform flex-shrink-0"
          title="Novo Projeto"
        >
          <Plus className="w-3.5 h-3.5 text-blue-600" />
        </button>
      </div>

      {/* Content Area - Flexible */}
      <div className="flex-1 flex flex-col space-y-2 overflow-y-auto min-h-[60px] relative z-10">
        {/* Active Projects Summary */}
        <div className="ceramic-tray p-3 text-center flex-shrink-0">
          {projectCount === 0 ? (
            <div className="space-y-2">
              {/* Potential Funding Amount */}
              <div>
                <p className="text-xl font-black text-ceramic-text-primary">
                  R$ 0
                </p>
                <p className="text-[9px] text-ceramic-text-secondary">
                  em captação potencial
                </p>
              </div>

              {/* Agencies */}
              <p className="text-[9px] text-ceramic-text-secondary leading-tight">
                Explore editais de <span className="font-semibold">FAPERJ</span>,{' '}
                <span className="font-semibold">FINEP</span>, <span className="font-semibold">CNPq</span>
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                <p className="text-[9px] font-bold uppercase tracking-wider text-ceramic-text-secondary">
                  Ativos
                </p>
              </div>
              <p className="text-2xl font-black text-etched">
                {projectCount}
              </p>
            </>
          )}
        </div>

        {/* Upcoming Deadlines */}
        {deadlines.length > 0 && (
          <div className="space-y-1 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-ceramic-text-secondary" />
              <p className="text-[9px] font-bold uppercase tracking-wider text-ceramic-text-secondary">
                Prazos
              </p>
            </div>

            <div className="space-y-1">
              {deadlines.slice(0, 2).map((deadline) => (
                <motion.div
                  key={deadline.opportunity_id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="ceramic-inset px-2 py-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium text-ceramic-text-primary line-clamp-1">
                        {truncate(deadline.opportunity_title, 30)}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5 text-ceramic-text-tertiary flex-shrink-0" />
                        <p className="text-[8px] text-ceramic-text-secondary">
                          {new Date(deadline.deadline).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`text-[9px] font-bold whitespace-nowrap ${getUrgencyColor(deadline.days_remaining)}`}>
                        {formatDaysRemaining(deadline.days_remaining)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="space-y-1 flex-shrink-0 hidden sm:block">
            <p className="text-[9px] font-bold uppercase tracking-wider text-ceramic-text-secondary">
              Recentes
            </p>
            <div className="space-y-1">
              {projects.slice(0, 1).map((project) => (
                <div
                  key={project.id}
                  className="ceramic-groove rounded-lg p-2"
                >
                  <p className="text-[9px] font-medium text-ceramic-text-primary mb-1 line-clamp-1">
                    {truncate(project.project_name, 25)}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="ceramic-trough p-0.5">
                        <div
                          className="h-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300"
                          style={{ width: `${project.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[8px] font-bold text-ceramic-text-secondary flex-shrink-0">
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
        className="w-full ceramic-concave py-2 px-4 font-bold text-sm text-ceramic-text-primary hover:scale-[0.98] active:scale-95 transition-transform flex-shrink-0 mt-2 relative z-10"
        data-testid="grants-open-button"
      >
        Abrir
      </button>
    </motion.div>
  );
};

export default GrantsCard;
