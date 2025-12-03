import React, { useState, useEffect, useRef } from 'react';
import { Settings, LogOut, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface SettingsMenuProps {
    userEmail?: string;
    onLogout?: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ userEmail, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
                console.log('Session already expired, clearing local storage...');
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
                return;
            }

            // Handle other errors
            if (error) {
                console.error('Logout error:', error);
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
            console.error('Logout failed:', err);
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
                    {/* Header - User Info */}
                    <div className="px-6 py-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full ceramic-inset flex items-center justify-center">
                                <User className="w-5 h-5 text-ceramic-text-secondary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                                    Conta
                                </p>
                                <p className="text-sm font-medium text-ceramic-text-primary truncate">
                                    {userEmail || 'user@example.com'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Divider - Engraved */}
                    <div className="px-4">
                        <div className="h-px bg-gradient-to-r from-transparent via-[#D9CBB6] to-transparent opacity-50"></div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
                                <LogOut className="w-4 h-4 text-ceramic-text-secondary group-hover:text-red-600" />
                            </div>
                            <span className="font-bold text-sm group-hover:text-red-600 transition-colors">
                                Sair
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
