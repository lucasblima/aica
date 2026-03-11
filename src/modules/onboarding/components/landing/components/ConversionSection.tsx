import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ArrowRight, Check, Key, ExternalLink, Sparkles } from 'lucide-react';
import { TelegramPreview } from './TelegramPreview';
import { TrustBadges } from './TrustBadges';

interface ConversionSectionProps {
    waitlistCount: number;
    onJoinWaitlist: (email: string) => Promise<any>;
    isSubmitting: boolean;
    submitted: boolean;
    error: string | null;
    inviteCode: string;
    onCodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCodeSubmit: () => void;
    codeValid: boolean;
    codeError: string;
}

export function ConversionSection({
    waitlistCount,
    onJoinWaitlist,
    isSubmitting,
    submitted,
    error,
    inviteCode,
    onCodeChange,
    onCodeSubmit,
    codeValid,
    codeError
}: ConversionSectionProps) {
    const [email, setEmail] = useState('');
    const [displayCount, setDisplayCount] = useState(0);

    // Mechanical Odometer Effect
    useEffect(() => {
        let start = 0;
        const end = waitlistCount || 0;
        const duration = 2000;

        if (end === 0) {
            setDisplayCount(0);
            return;
        }

        const increment = end / (duration / 16);

        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                clearInterval(timer);
                setDisplayCount(end);
            } else {
                setDisplayCount(Math.floor(start));
            }
        }, 16);

        return () => clearInterval(timer);
    }, [waitlistCount]);

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            await onJoinWaitlist(email);
        }
    };

    return (
        <section id="waitlist" className="py-20 md:py-28 bg-[#E8E6DF] border-t border-white/20">
            <div className="max-w-5xl mx-auto px-6">

                {/* Section heading */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl md:text-4xl font-black text-ceramic-text-primary mb-3">
                        Comece agora. Sem instalar nada.
                    </h2>
                    <p className="text-ceramic-text-secondary text-lg max-w-xl mx-auto">
                        Teste pelo Telegram ou garanta acesso completo com um convite.
                    </p>
                </motion.div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* LEFT: Telegram column */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col"
                    >
                        <TelegramPreview />

                        {/* Badge */}
                        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-ceramic-text-secondary">
                            <Sparkles size={14} className="text-amber-500" />
                            <span>Teste rapido — disponivel 24/7</span>
                        </div>

                        {/* Telegram CTA */}
                        <a
                            href="https://t.me/AicaLifeBot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 mx-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] max-w-sm w-full"
                        >
                            Abrir no Telegram
                            <ExternalLink size={18} />
                        </a>
                    </motion.div>

                    {/* RIGHT: Invite column */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="flex flex-col gap-6"
                    >
                        {/* Invite code card */}
                        <div className="bg-ceramic-base rounded-3xl p-8 md:p-10 ceramic-card relative overflow-hidden border border-amber-500/20">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full" />

                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-sm border border-amber-200">
                                    <Key className="text-amber-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-ceramic-text-primary">Acesso Completo</h3>
                                    <p className="text-ceramic-text-secondary text-sm font-medium">Tem um convite? Seja bem-vindo.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <motion.input
                                        animate={codeError ? { x: [-10, 10, -10, 10, 0] } : {}}
                                        transition={{ duration: 0.4 }}
                                        type="text"
                                        placeholder="AICA-XXXX-XXXX"
                                        value={inviteCode}
                                        onChange={onCodeChange}
                                        className={`w-full bg-white/50 border-2 rounded-xl px-5 py-4 text-center font-mono text-xl tracking-widest outline-none transition-all placeholder:text-ceramic-text-secondary/50 shadow-inner ${codeError
                                            ? 'border-ceramic-error/60 text-ceramic-error'
                                            : codeValid
                                                ? 'border-ceramic-success/60 text-ceramic-success'
                                                : 'border-white/60 focus:border-amber-400 text-ceramic-text-primary'
                                            }`}
                                    />
                                    {codeError && <p className="text-ceramic-error text-sm font-bold mt-2 text-center">{codeError}</p>}
                                </div>

                                <button
                                    onClick={onCodeSubmit}
                                    disabled={inviteCode.length < 9}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${codeValid
                                        ? 'bg-amber-600 text-white shadow-[0_8px_20px_rgba(180,83,9,0.3)] scale-105'
                                        : 'bg-ceramic-text-primary text-white shadow-lg opacity-90 hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                >
                                    {codeValid ? 'Entrar no OS' : 'Verificar'}
                                    <ArrowRight size={20} className={codeValid ? "animate-pulse" : ""} />
                                </button>
                            </div>
                        </div>

                        {/* Waitlist card */}
                        <div className="bg-[#DEDCD5] rounded-3xl p-8 md:p-10 shadow-inner relative overflow-hidden">
                            <h3 className="text-2xl font-black text-ceramic-text-primary mb-2">Proxima Fornada</h3>
                            <p className="text-ceramic-text-secondary font-medium mb-6 text-sm">
                                Nao empilhamos usuarios, esculpimos rotinas.
                            </p>

                            {submitted ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center h-28 bg-ceramic-base rounded-2xl ceramic-shadow text-center p-6"
                                >
                                    <div className="w-10 h-10 bg-ceramic-success/10 rounded-full flex items-center justify-center mb-2">
                                        <Check className="text-ceramic-success" size={20} />
                                    </div>
                                    <p className="font-bold text-ceramic-text-primary text-sm">Enviado a forja. Te avisaremos.</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                                    <input
                                        type="email"
                                        required
                                        placeholder="seu@melhor-email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/40 border border-white/20 rounded-xl px-5 py-3.5 font-medium outline-none focus:bg-white/60 transition-all placeholder:text-ceramic-text-secondary/70 shadow-inner"
                                    />
                                    {error && <p className="text-ceramic-error text-sm font-bold">{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3.5 rounded-xl font-bold bg-ceramic-base text-ceramic-text-primary ceramic-shadow hover:scale-[1.02] transition-all disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Registrando...' : 'Entrar na fila'}
                                    </button>
                                </form>
                            )}

                            {/* Waitlist count + note */}
                            <div className="flex items-center justify-between mt-4 text-sm text-ceramic-text-secondary/70">
                                <span>50 convites por semana</span>
                                {waitlistCount >= 50 && (
                                    <span className="font-mono font-bold text-ceramic-text-primary">
                                        {displayCount.toLocaleString('pt-BR')} na fila
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>

                </div>

                {/* Trust badges */}
                <TrustBadges />

            </div>
        </section>
    );
}
