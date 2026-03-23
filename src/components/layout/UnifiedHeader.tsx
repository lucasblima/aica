// src/components/layout/UnifiedHeader.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../ui';
import { SettingsMenu } from './SettingsMenu';
import { AgentNotificationBell, InviteBadge, InviteModal } from '../features';
import { useScrollCollapse } from '@/hooks/useScrollCollapse';

interface BreadcrumbSegment {
  label: string;
  onClick: () => void;
}

interface IdentityBarProps {
  level: number;
  levelName: string;
  levelColor: string;
  progressPercentage: number;
  totalPoints: number;
  currentStreak: number;
}

interface UnifiedHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbSegment[];
  actions?: React.ReactNode;
  identityBar?: IdentityBarProps;
  avatarUrl?: string;
  currentStreak?: number;
  showNotifications?: boolean;
  collapsible?: boolean;
  onLogoClick?: () => void;
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  onNavigateToFileSearch?: () => void;
  onOpenProfile?: () => void;
}

export function UnifiedHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  identityBar,
  avatarUrl,
  currentStreak,
  showNotifications = true,
  collapsible = true,
  onLogoClick,
  userEmail,
  userName,
  onLogout,
  onNavigateToFileSearch,
  onOpenProfile,
}: UnifiedHeaderProps) {
  const navigate = useNavigate();
  const { isCollapsed } = useScrollCollapse({ enabled: collapsible });
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleLogoClick = onLogoClick || (() => navigate('/'));
  const isHome = breadcrumbs === undefined;
  const isModule = breadcrumbs !== undefined && breadcrumbs.length === 0;

  return (
    <>
      <header className="sticky top-0 z-40 bg-ceramic-base/95 backdrop-blur-sm transition-all duration-200 ease-out">
        {/* Main header row */}
        <div
          className={`flex items-center justify-between px-6 transition-all duration-200 ease-out ${
            isCollapsed
              ? isModule ? 'py-2 justify-center' : 'py-2'
              : 'pt-6 pb-3'
          }`}
        >
          {/* Left: Logo + Breadcrumb + Title */}
          <div className={`flex items-center gap-2 min-w-0 ${
            isCollapsed && isModule ? 'justify-center' : ''
          }`}>
            <button
              onClick={handleLogoClick}
              className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded-lg"
              aria-label="Ir para página inicial"
            >
              <Logo
                variant="default"
                width={isCollapsed ? 28 : 36}
                className="rounded-lg transition-all duration-200"
              />
            </button>

            {/* Breadcrumbs */}
            {breadcrumbs !== undefined && (
              <nav aria-label="Navegação" className="flex items-center gap-1 min-w-0">
                <span className="text-ceramic-text-secondary text-xs flex-shrink-0">›</span>
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={i}>
                    <button
                      onClick={crumb.onClick}
                      className="text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors truncate max-w-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded"
                    >
                      {crumb.label}
                    </button>
                    <span className="text-ceramic-text-secondary text-xs flex-shrink-0">›</span>
                  </React.Fragment>
                ))}
                <span
                  className={`font-bold text-ceramic-text-primary truncate transition-all duration-200 ${
                    isCollapsed ? 'text-sm' : 'text-base'
                  }`}
                  aria-current="page"
                >
                  {title}
                </span>
              </nav>
            )}

            {/* Home title (no breadcrumbs) */}
            {isHome && (
              <div className={`transition-all duration-200 ${isCollapsed ? 'ml-1' : 'ml-2'}`}>
                {!isCollapsed && subtitle && (
                  <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5 text-etched">
                    {subtitle}
                  </p>
                )}
                <h1
                  className={`font-black text-ceramic-text-primary text-etched tracking-tight transition-all duration-200 ${
                    isCollapsed ? 'text-sm' : 'text-2xl'
                  }`}
                >
                  {title}
                </h1>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <AnimatePresence>
            {!(isCollapsed && isModule) && (
              <motion.div
                className="flex items-center gap-2 flex-shrink-0"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {currentStreak != null && currentStreak > 0 && (
                  <div className="flex items-center gap-0.5 text-xs text-ceramic-warning font-semibold">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{currentStreak}</span>
                  </div>
                )}

                {actions ? (
                  actions
                ) : (
                  <>
                    {showNotifications && <AgentNotificationBell />}
                    <InviteBadge onClick={() => setShowInviteModal(true)} />
                    <SettingsMenu
                      userEmail={userEmail}
                      avatarUrl={avatarUrl}
                      userName={userName}
                      onLogout={onLogout}
                      onNavigateToFileSearch={onNavigateToFileSearch}
                      onOpenProfile={onOpenProfile}
                    />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Identity Bar (Home only, collapsible) */}
        {identityBar && (
          <motion.div
            className="px-6 pb-3 overflow-hidden"
            animate={{
              height: isCollapsed ? 0 : 'auto',
              opacity: isCollapsed ? 0 : 1,
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenProfile}
                disabled={!onOpenProfile}
                className="flex-shrink-0 ceramic-avatar-recessed rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 disabled:cursor-default"
                aria-label="Abrir perfil"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName || 'Avatar'} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: identityBar.levelColor || '#d97706' }}
                  >
                    {(userName || userEmail || '??').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </button>

              <div className="ceramic-badge-gold flex items-center gap-1 px-2 py-0.5 flex-shrink-0">
                <span className="text-sm font-black">{identityBar.level}</span>
                <span className="text-[10px] font-medium">{identityBar.levelName}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="ceramic-progress-groove"
                  role="progressbar"
                  aria-valuenow={identityBar.progressPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progresso XP"
                >
                  <motion.div
                    className="ceramic-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${identityBar.progressPercentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-ceramic-text-secondary">
                    {identityBar.totalPoints.toLocaleString()} CP
                  </span>
                  <span className="text-[10px] text-ceramic-text-secondary">
                    {identityBar.progressPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {identityBar.currentStreak > 0 && (
                <div className="ceramic-inset-sm flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0">
                  <Flame className="w-3.5 h-3.5 text-ceramic-warning" />
                  <span className="text-[10px] font-bold text-ceramic-text-primary">
                    {identityBar.currentStreak}d
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="h-px bg-ceramic-border/30" />
      </header>

      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
    </>
  );
}
