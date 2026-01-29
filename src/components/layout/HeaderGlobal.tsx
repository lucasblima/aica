import React, { useState } from 'react';
import { User, Users } from 'lucide-react';
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
    onTabChange
}) => {
    const [showInviteModal, setShowInviteModal] = useState(false);

    return (
        <>
        <header className="flex-none pt-8 px-6 pb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <Logo variant="default" width={44} className="rounded-lg" />
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
