import React from 'react';
import { SettingsMenu } from './SettingsMenu';

interface HeaderGlobalProps {
    title: string;
    subtitle?: string;
    userEmail?: string;
    onLogout?: () => void;
    onNavigateToAICost?: () => void;
    onNavigateToFileSearch?: () => void;
    showTabs?: boolean;
    activeTab?: 'personal' | 'network';
    onTabChange?: (tab: 'personal' | 'network') => void;
}

export const HeaderGlobal: React.FC<HeaderGlobalProps> = ({
    title,
    subtitle = 'LIFE OS',
    userEmail,
    onLogout,
    onNavigateToAICost,
    onNavigateToFileSearch,
    showTabs = false,
    activeTab = 'personal',
    onTabChange
}) => {
    return (
        <header className="flex-none pt-8 px-6 pb-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5 text-etched">
                        {subtitle}
                    </p>
                    <h1 className="text-3xl font-black text-ceramic-text-primary text-etched tracking-tight">
                        {title}
                    </h1>
                </div>
                {/* Settings Menu */}
                <SettingsMenu
                    userEmail={userEmail}
                    onLogout={onLogout}
                    onNavigateToAICost={onNavigateToAICost}
                    onNavigateToFileSearch={onNavigateToFileSearch}
                />
            </div>

            {/* Optional Tabs - Trough Effect */}
            {showTabs && onTabChange && (
                <div className="flex p-1 ceramic-trough rounded-full">
                    <button
                        onClick={() => onTabChange('personal')}
                        className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 ${activeTab === 'personal'
                                ? 'ceramic-card text-ceramic-text-primary shadow-sm scale-[0.98]'
                                : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                            }`}
                    >
                        Pessoal
                    </button>
                    <button
                        onClick={() => onTabChange('network')}
                        className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 ${activeTab === 'network'
                                ? 'ceramic-card text-ceramic-text-primary shadow-sm scale-[0.98]'
                                : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                            }`}
                    >
                        Conexões
                    </button>
                </div>
            )}
        </header>
    );
};
