import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Logo } from './ui/Logo';

export default function Login({ onLogin }: { onLogin: () => void }) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        // Escopos do Google Calendar para funcionamento completo
        // - calendar: Acesso total ao calendário (leitura e escrita)
        // - calendar.events: Gerenciamento de eventos
        // - calendar.readonly: Leitura de calendários
        // - userinfo.email: Email do usuário
        const googleCalendarScopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
        ].join(' ');

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                scopes: googleCalendarScopes,
                queryParams: {
                    access_type: 'offline', // Garante refresh_token
                    prompt: 'consent',      // Força tela de consentimento para novas permissões
                },
            }
        });

        setLoading(false);
        if (error) setError(error.message);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#F0EFE9] relative overflow-hidden">
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-[#5C554B] to-transparent pointer-events-none"></div>

            {/* Login Card - Ceramic Floating Block */}
            <div
                className="bg-[#F0EFE9] p-10 w-full max-w-md relative z-10 rounded-[40px]"
                style={{ boxShadow: '20px 20px 60px #bebebe, -20px -20px 60px #ffffff' }}
            >
                {/* Logo/Header */}
                <div className="text-center mb-10">
                    <div
                        className="inline-flex items-center justify-center bg-[#F0EFE9] rounded-2xl mb-6 overflow-hidden"
                        style={{ boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff' }}
                    >
                        <Logo variant="default" width={80} className="rounded-2xl" />
                    </div>
                    <h1 className="text-2xl font-black text-ceramic-text-primary text-etched mb-2">Aica Life OS</h1>
                    <p className="text-sm text-[#948D82]">Sistema operacional para sua vida</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div
                        className="mb-6 p-4 bg-[#EBE9E4] rounded-xl text-[#5C554B] text-sm text-center"
                        style={{ boxShadow: 'inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff' }}
                    >
                        {error}
                    </div>
                )}

                {/* Google Login Button */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-[#F0EFE9] text-[#5C554B] py-5 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:shadow-[inset_4px_4px_8px_#c5c5c5,inset_-4px_-4px_8px_#ffffff] hover:scale-[1.02]"
                    style={{ boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff' }}
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {loading ? 'Entrando...' : 'Entrar com Google'}
                </button>

                {/* Subtle footer note */}
                <p className="text-xs text-[#948D82] text-center mt-8 leading-relaxed">
                    Ao continuar, você concorda com nossos<br />
                    termos de serviço e política de privacidade
                </p>
            </div>
        </div>
    );
}
