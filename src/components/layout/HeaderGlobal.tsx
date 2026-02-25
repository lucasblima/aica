import React, { useState, useMemo } from 'react';
import { User, Users, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { SettingsMenu } from './SettingsMenu';
import { CeramicTabSelector, Logo } from '../ui';
import { InviteBadge, InviteModal } from '../features';

interface HeaderGlobalProps {
    title: string;
    subtitle?: string;
    userEmail?: string;
    avatarUrl?: string;
    userName?: string;
    onLogout?: () => void;
    onNavigateToAICost?: () => void;
    onNavigateToFileSearch?: () => void;
    onOpenProfile?: () => void;
    showTabs?: boolean;
    activeTab?: 'personal' | 'network';
    onTabChange?: (tab: 'personal' | 'network') => void;
    level?: number;
    levelName?: string;
    levelColor?: string;
    progressPercentage?: number;
    totalPoints?: number;
    currentStreak?: number;
    onAvatarClick?: () => void;
    /** Click handler for the AICA logo — used for navigation in focused modes (e.g., Studio) */
    onLogoClick?: () => void;
}

export const HeaderGlobal: React.FC<HeaderGlobalProps> = ({
    title,
    subtitle = 'LIFE OS',
    userEmail,
    avatarUrl,
    userName,
    onLogout,
    onNavigateToAICost,
    onNavigateToFileSearch,
    onOpenProfile,
    showTabs = false,
    activeTab = 'personal',
    onTabChange,
    level,
    levelName,
    levelColor,
    progressPercentage = 0,
    totalPoints = 0,
    currentStreak = 0,
    onAvatarClick,
    onLogoClick,
}) => {
    const [showInviteModal, setShowInviteModal] = useState(false);

    const initials = useMemo(() => {
        if (userName) return userName.slice(0, 2).toUpperCase();
        if (userEmail) return userEmail.slice(0, 2).toUpperCase();
        return '??';
    }, [userName, userEmail]);

    const handleAvatarClick = onAvatarClick || onOpenProfile;

    return (
        <>
        <header className="flex-none pt-8 px-6 pb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <Logo variant="default" width={44} className="rounded-lg" onClick={onLogoClick} />
                    <div>
                        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5 text-etched">
                            {subtitle}
                        </p>
                        <h1 className="text-3xl font-black text-ceramic-text-primary text-etched tracking-tight">
                            {title}
                        </h1>
                    </div>
                </div>
                {/* Invite Badge & Settings Menu */}
                <div className="flex items-center gap-3">
                    <InviteBadge onClick={() => setShowInviteModal(true)} />
                    <SettingsMenu
                        userEmail={userEmail}
                        avatarUrl={avatarUrl}
                        userName={userName}
                        onLogout={onLogout}
                        onNavigateToAICost={onNavigateToAICost}
                        onNavigateToFileSearch={onNavigateToFileSearch}
                        onOpenProfile={onOpenProfile}
                    />
                </div>
            </div>

            {/* Identity Bar — only renders when level is provided */}
            {level !== undefined && (
                <div className="flex items-center gap-3 mb-4">
                    {/* Avatar */}
                    <button
                        onClick={handleAvatarClick}
                        className="flex-shrink-0 ceramic-avatar-recessed rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        aria-label="Abrir perfil"
                    >
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={userName || 'Avatar'}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                style={{ backgroundColor: levelColor || '#d97706' }}
                            >
                                {initials}
                            </div>
                        )}
                    </button>

                    {/* Level Badge */}
                    <div className="ceramic-badge-gold flex items-center gap-1 px-2 py-0.5 flex-shrink-0">
                        <span className="text-sm font-black">{level}</span>
                        <span className="text-[10px] font-medium">{levelName}</span>
                    </div>

                    {/* XP Progress Bar */}
                    <div className="flex-1 min-w-0">
                        <div
                            className="ceramic-progress-groove"
                            role="progressbar"
                            aria-valuenow={progressPercentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Progresso XP"
                        >
                            <motion.div
                                className="ceramic-progress-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[10px] text-ceramic-text-secondary">
                                {totalPoints.toLocaleString()} CP
                            </span>
                            <span className="text-[10px] text-ceramic-text-secondary">
                                {progressPercentage.toFixed(0)}%
                            </span>
                        </div>
                    </div>

                    {/* Streak Badge */}
                    {currentStreak > 0 && (
                        <div className="ceramic-inset-sm flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0">
                            <Flame className="w-3.5 h-3.5 text-ceramic-warning" />
                            <span className="text-[10px] font-bold text-ceramic-text-primary">
                                {currentStreak}d
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Optional Tabs - CeramicTabSelector */}
            {showTabs && onTabChange && (
                <CeramicTabSelector
                    tabs={[
                        { id: 'personal', label: 'Pessoal', icon: <User className="h-4 w-4" /> },
                        { id: 'network', label: 'Conexões', icon: <Users className="h-4 w-4" /> }
                    ]}
                    activeTab={activeTab}
                    onChange={onTabChange}
                />
            )}
        </header>

        {/* Invite Modal */}
        <InviteModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
        />
        </>
    );
};
