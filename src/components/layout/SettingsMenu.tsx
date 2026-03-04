import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, LogOut, FileSearch, Crown, LayoutGrid, Ticket, Shield, FileText, Activity, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('SettingsMenu');

interface SettingsMenuProps {
    userEmail?: string;
    avatarUrl?: string;
    userName?: string;
    onLogout?: () => void;
    onNavigateToFileSearch?: () => void;
    onOpenProfile?: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
    userEmail,
    avatarUrl,
    userName,
    onLogout,
    onNavigateToFileSearch,
    onOpenProfile
}) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Compute initials for avatar fallback
    const initials = useMemo(() => {
        if (userName) return userName.slice(0, 2).toUpperCase();
        if (userEmail) return userEmail.slice(0, 2).toUpperCase();
        return 'US';
    }, [userName, userEmail]);

    const showAvatarImage = avatarUrl && !avatarError;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLogout = async () => {
        try {
            // Try to sign out via Supabase API
            const { error } = await supabase.auth.signOut();

            // If error is session missing, just clear storage and reload
            if (error && error.message.includes('session')) {
                log.debug('Session already expired, clearing local storage...');
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
                return;
            }

            // Handle other errors
            if (error) {
                log.error('Logout error:', { error });
                // Even with error, try to clear and restart
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
                return;
            }

            // Successful logout
            setIsOpen(false);
            if (onLogout) {
                onLogout();
            } else {
                window.location.href = '/';
            }
        } catch (err) {
            log.error('Logout failed:', { error: err });
            // Force logout by clearing everything
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-10 h-10 ceramic-card flex items-center justify-center text-ceramic-text-secondary hover:text-ceramic-text-primary transition-all ${isOpen ? 'rotate-90 scale-95' : 'hover:rotate-90'
                    }`}
            >
                <Settings className="w-5 h-5" />
            </button>

            {/* Floating Menu */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-4 w-64 bg-[#F0EFE9] rounded-2xl z-50 animate-scale-in"
                    style={{
                        boxShadow: '8px 8px 16px rgba(163, 158, 145, 0.2), -8px -8px 16px rgba(255, 255, 255, 0.8)'
                    }}
                >
                    {/* Header - User Info (clickable to open profile) */}
                    <div className="px-6 py-4">
                        <button
                            onClick={() => {
                                if (onOpenProfile) {
                                    onOpenProfile();
                                    setIsOpen(false);
                                }
                            }}
                            className="w-full flex items-center gap-3 mb-2 hover:bg-white/30 rounded-xl p-2 -m-2 transition-colors cursor-pointer"
                            aria-label="Abrir perfil"
                        >
                            <div className="w-10 h-10 rounded-full ceramic-inset flex items-center justify-center overflow-hidden">
                                {showAvatarImage ? (
                                    <img
                                        src={avatarUrl}
                                        alt={userName || userEmail || 'Avatar'}
                                        className="w-10 h-10 rounded-full object-cover"
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
                                        {initials}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                    Conta
                                </p>
                                <p className="text-sm font-medium text-ceramic-text-primary truncate">
                                    {userEmail || 'user@example.com'}
                                </p>
                            </div>
                        </button>
                    </div>

                    {/* Divider - Engraved */}
                    <div className="px-4">
                        <div className="h-px bg-gradient-to-r from-transparent via-[#D9CBB6] to-transparent opacity-50"></div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                        {/* Pricing / Plan Button */}
                        <button
                            onClick={() => {
                                navigate('/pricing');
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Crown className="w-4 h-4 text-ceramic-text-secondary group-hover:text-amber-500" />
                            </div>
                            <span className="font-bold text-sm transition-colors">
                                Meu Plano
                            </span>
                        </button>

                        {/* AI Cost / Usage Analytics */}
                        <button
                            onClick={() => {
                                navigate('/usage');
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Activity className="w-4 h-4 text-ceramic-text-secondary group-hover:text-amber-500" />
                            </div>
                            <span className="font-bold text-sm transition-colors">
                                Custos de IA
                            </span>
                        </button>

                        {/* File Search Analytics Button - Always visible */}
                        <button
                            onClick={() => {
                                if (onNavigateToFileSearch) {
                                    onNavigateToFileSearch();
                                } else {
                                    navigate('/file-search');
                                }
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FileSearch className="w-4 h-4 text-ceramic-text-secondary group-hover:text-ceramic-info" />
                            </div>
                            <span className="font-bold text-sm transition-colors">
                                File Search Analytics
                            </span>
                        </button>

                        {/* Module Hub Button */}
                        <button
                            onClick={() => {
                                navigate('/modules');
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <LayoutGrid className="w-4 h-4 text-ceramic-text-secondary group-hover:text-purple-500" />
                            </div>
                            <span className="font-bold text-sm transition-colors">
                                Modulos
                            </span>
                        </button>

                        {/* Invites Button */}
                        <button
                            onClick={() => {
                                navigate('/invites');
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Ticket className="w-4 h-4 text-ceramic-text-secondary group-hover:text-amber-500" />
                            </div>
                            <span className="font-bold text-sm transition-colors">
                                Convites
                            </span>
                        </button>

                        {/* Admin Portal (only visible to admins) */}
                        {user?.user_metadata?.is_admin && (
                            <button
                                onClick={() => {
                                    navigate('/admin');
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                            >
                                <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Shield className="w-4 h-4 text-ceramic-text-secondary group-hover:text-amber-500" />
                                </div>
                                <span className="font-bold text-sm transition-colors">
                                    Admin Portal
                                </span>
                            </button>
                        )}

                        {/* Life Score Analytics */}
                        <button
                            onClick={() => {
                                navigate('/life-score');
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <BarChart3 className="w-4 h-4 text-ceramic-text-secondary group-hover:text-ceramic-accent" />
                            </div>
                            <span className="font-bold text-sm transition-colors">
                                Life Score
                            </span>
                        </button>

                        {/* Legal Section Divider */}
                        <div className="px-2 my-1">
                            <div className="h-px bg-gradient-to-r from-transparent via-[#D9CBB6] to-transparent opacity-50"></div>
                        </div>

                        {/* Status & Roadmap */}
                        <button
                            onClick={() => {
                                navigate('/status');
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Activity className="w-4 h-4 text-ceramic-text-secondary group-hover:text-ceramic-success" />
                            </div>
                            <span className="font-bold text-sm transition-colors">
                                Status & Roadmap
                            </span>
                        </button>

                        {/* Privacy Policy */}
                        <button
                            onClick={() => {
                                navigate('/privacy-policy');
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Shield className="w-4 h-4 text-ceramic-text-secondary group-hover:text-ceramic-info" />
                            </div>
                            <span className="font-bold text-sm transition-colors">
                                Privacidade
                            </span>
                        </button>

                        {/* Terms of Service */}
                        <button
                            onClick={() => {
                                navigate('/terms');
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FileText className="w-4 h-4 text-ceramic-text-secondary group-hover:text-ceramic-info" />
                            </div>
                            <span className="font-bold text-sm transition-colors">
                                Termos de Servico
                            </span>
                        </button>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <LogOut className="w-4 h-4 text-ceramic-text-secondary group-hover:text-ceramic-error" />
                            </div>
                            <span className="font-bold text-sm group-hover:text-ceramic-error transition-colors">
                                Sair
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
