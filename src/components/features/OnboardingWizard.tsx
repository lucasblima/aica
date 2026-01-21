import React, { useState } from 'react';
import { Calendar, CheckCircle, X, ArrowRight, Sparkles } from 'lucide-react';
import { connectGoogleCalendar } from '@/services/googleAuthService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('OnboardingWizard');

interface OnboardingWizardProps {
    onComplete: (connectedCalendar: boolean) => void;
    onSkip: () => void;
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
    const [step, setStep] = useState<'welcome' | 'calendar'>('welcome');
    const [loading, setLoading] = useState(false);

    const handleConnectCalendar = async () => {
        setLoading(true);
        try {
            await connectGoogleCalendar();
            // O OAuth redirecionará - a conclusão será tratada no callback
        } catch (error) {
            log.error('Erro ao conectar Calendar:', error);
            setLoading(false);
        }
    };

    const handleSkipCalendar = () => {
        onComplete(false);
    };

    if (step === 'welcome') {
        return (
            <div className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
                <div
                    className="bg-[#F0EFE9] rounded-[40px] p-8 max-w-lg w-full relative"
                    style={{ boxShadow: '20px 20px 60px #bebebe, -20px -20px 60px #ffffff' }}
                >
                    {/* Close button */}
                    <button
                        onClick={onSkip}
                        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[#F0EFE9] text-[#948D82] hover:text-[#5C554B] transition-colors"
                        style={{ boxShadow: '4px 4px 8px #c5c5c5, -4px -4px 8px #ffffff' }}
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div
                            className="w-20 h-20 rounded-2xl bg-[#F0EFE9] flex items-center justify-center"
                            style={{ boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff' }}
                        >
                            <Sparkles className="w-10 h-10 text-[#5C554B]" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-[#5C554B] mb-3">
                            Bem-vindo ao Aica! 🎉
                        </h2>
                        <p className="text-[#948D82] text-base leading-relaxed">
                            Seu sistema operacional pessoal está pronto. Vamos configurar algumas coisas para você começar com tudo.
                        </p>
                    </div>

                    {/* Action */}
                    <button
                        onClick={() => setStep('calendar')}
                        className="w-full bg-[#F0EFE9] text-[#5C554B] py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 hover:scale-[1.02]"
                        style={{ boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff' }}
                    >
                        <span>Continuar</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>

                    <button
                        onClick={onSkip}
                        className="w-full mt-4 text-[#948D82] text-sm font-medium hover:text-[#5C554B] transition-colors"
                    >
                        Pular configuração
                    </button>
                </div>
            </div>
        );
    }

    // Calendar connection step
    return (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div
                className="bg-[#F0EFE9] rounded-[40px] p-8 max-w-lg w-full relative"
                style={{ boxShadow: '20px 20px 60px #bebebe, -20px -20px 60px #ffffff' }}
            >
                {/* Close button */}
                <button
                    onClick={onSkip}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[#F0EFE9] text-[#948D82] hover:text-[#5C554B] transition-colors"
                    style={{ boxShadow: '4px 4px 8px #c5c5c5, -4px -4px 8px #ffffff' }}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div
                        className="w-20 h-20 rounded-2xl bg-[#F0EFE9] flex items-center justify-center"
                        style={{ boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff' }}
                    >
                        <Calendar className="w-10 h-10 text-[#EA4335]" />
                    </div>
                </div>

                {/* Content */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-[#5C554B] mb-3">
                        Conectar Google Calendar?
                    </h2>
                    <p className="text-[#948D82] text-base leading-relaxed mb-6">
                        Sincronize sua agenda do Google com o Aica para ter uma visão completa do seu dia. Você pode usar o Aica como sua agenda principal ou manter ambas sincronizadas.
                    </p>

                    {/* Benefits */}
                    <div className="bg-[#EBE9E4] rounded-2xl p-6 mb-6 text-left"
                        style={{ boxShadow: 'inset 3px 3px 6px #d4d3cd, inset -3px -3px 6px #ffffff' }}
                    >
                        <h3 className="text-sm font-bold text-[#5C554B] mb-4 uppercase tracking-wide">
                            Por que conectar?
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-[#5C554B]">
                                    <strong>Visão unificada</strong> - Todos seus compromissos em um só lugar
                                </span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-[#5C554B]">
                                    <strong>Timeline inteligente</strong> - Organize melhor seu tempo
                                </span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-[#5C554B]">
                                    <strong>Sempre sincronizado</strong> - Mudanças refletem automaticamente
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Privacy note */}
                    <p className="text-xs text-[#948D82] leading-relaxed">
                        🔒 Seus dados são seguros. Você pode desconectar a qualquer momento nas configurações.
                    </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleConnectCalendar}
                        disabled={loading}
                        className="w-full bg-[#F0EFE9] text-[#5C554B] py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff' }}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-[#5C554B] border-t-transparent rounded-full animate-spin" />
                                <span>Conectando...</span>
                            </>
                        ) : (
                            <>
                                <Calendar className="w-5 h-5" />
                                <span>Conectar Google Calendar</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleSkipCalendar}
                        className="w-full text-[#948D82] text-sm font-medium hover:text-[#5C554B] transition-colors py-2"
                    >
                        Agora não, vou conectar depois
                    </button>
                </div>
            </div>
        </div>
    );
}
