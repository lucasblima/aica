import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, Sparkles } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: () => void }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
            }
        });

        setLoading(false);
        if (error) {
            setError(error.message);
        } else {
            setSuccess('✨ Magic link enviado! Verifique seu email.');
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
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
                <div className="text-center mb-8">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 bg-[#F0EFE9] rounded-2xl mb-4"
                        style={{ boxShadow: '6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff' }}
                    >
                        <Sparkles className="w-8 h-8 text-[#5C554B]" />
                    </div>
                    <h2 className="text-3xl font-black text-[#5C554B]">Aica Login</h2>
                    <p className="text-sm text-[#948D82] mt-1">Entre para acessar o dashboard</p>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div
                        className="mb-4 p-3 bg-[#EBE9E4] rounded-xl text-[#5C554B] text-sm"
                        style={{ boxShadow: 'inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff' }}
                    >
                        {error}
                    </div>
                )}
                {success && (
                    <div
                        className="mb-4 p-3 bg-[#EBE9E4] rounded-xl text-[#5C554B] text-sm"
                        style={{ boxShadow: 'inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff' }}
                    >
                        {success}
                    </div>
                )}

                {/* Magic Link Form */}
                <form onSubmit={handleMagicLink} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-[#5C554B] mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#948D82]" />
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-[#EBE9E4] text-[#5C554B] placeholder-[#948D82] rounded-2xl border-none outline-none font-medium"
                                style={{ boxShadow: 'inset 5px 5px 10px #bebebe, inset -5px -5px 10px #ffffff' }}
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#F0EFE9] text-[#5C554B] py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:shadow-[inset_4px_4px_8px_#c5c5c5,inset_-4px_-4px_8px_#ffffff]"
                        style={{ boxShadow: '6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff' }}
                    >
                        <Sparkles className="w-5 h-5" />
                        {loading ? 'Enviando...' : 'Enviar Magic Link'}
                    </button>
                    <p className="text-xs text-[#948D82] text-center">
                        Você receberá um link mágico no seu email para fazer login sem senha
                    </p>
                </form>

                {/* Divider - Engraved */}
                <div className="relative my-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-[#D9CBB6] to-transparent opacity-50"></div>
                    <div className="relative flex justify-center -mt-3">
                        <span className="px-4 bg-[#F0EFE9] text-[#948D82] font-medium text-sm">ou continue com</span>
                    </div>
                </div>

                {/* Google Login */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-[#F0EFE9] text-[#5C554B] py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:shadow-[inset_4px_4px_8px_#c5c5c5,inset_-4px_-4px_8px_#ffffff]"
                    style={{ boxShadow: '6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff' }}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Entrar com Google
                </button>
            </div>
        </div>
    );
}
