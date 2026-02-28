import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ArrowRight, Check, Key } from 'lucide-react';

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
        const end = waitlistCount || 0; // Using actual count, without fallback
        const duration = 2000;

        if (end === 0) {
            setDisplayCount(0);
            return;
        }

        const increment = end / (duration / 16); // 60fps

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
        <section id="waitlist" className="py-24 bg-[#E8E6DF] border-t border-white/20">
            <div className="max-w-7xl mx-auto px-6">

                {/* Mechanical Odometer Display (Shown only if >= 50) */}
                {waitlistCount >= 50 && (
                    <div className="flex flex-col items-center justify-center mb-16">
                        <div className="flex gap-2">
                            {displayCount.toString().padStart(4, '0').split('').map((num, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: 20, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8, delay: i * 0.1, type: 'spring' }}
                                    className="w-16 h-24 bg-ceramic-text-primary rounded-xl flex items-center justify-center text-5xl font-mono text-ceramic-base shadow-inner border-y-[6px] border-[#312C26] relative overflow-hidden"
                                >
                                    {/* Mechanical split line */}
                                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black/40 z-10" />
                                    <span className="relative z-0 font-bold">{num}</span>
                                </motion.div>
                            ))}
                        </div>
                        <p className="mt-6 text-ceramic-text-secondary font-bold tracking-widest uppercase text-sm">
                            Vidas em orquestração
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">

                    {/* Path 1: Premium Invite (Alfa) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="bg-ceramic-base rounded-3xl p-8 md:p-10 ceramic-card relative overflow-hidden border border-amber-500/20"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full" />

                        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-amber-200">
                            <Key className="text-amber-600" size={28} />
                        </div>

                        <h3 className="text-3xl font-black text-ceramic-text-primary mb-2">Chave do Ateliê</h3>
                        <p className="text-ceramic-text-secondary font-medium mb-8">Tem um convite? Seja bem-vindo de volta.</p>

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
                                        ? 'border-red-400 text-red-600'
                                        : codeValid
                                            ? 'border-green-400 text-green-600'
                                            : 'border-white/60 focus:border-amber-400 text-ceramic-text-primary'
                                        }`}
                                />
                                {codeError && <p className="text-red-500 text-sm font-bold mt-2 text-center">{codeError}</p>}
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
                    </motion.div>

                    {/* Path 2: Waitlist (Fila) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="bg-[#DEDCD5] rounded-3xl p-8 md:p-10 shadow-inner relative overflow-hidden"
                    >
                        <h3 className="text-3xl font-black text-ceramic-text-primary mb-2">Próxima Fornada</h3>
                        <p className="text-ceramic-text-secondary font-medium mb-8">
                            Não empilhamos usuários, esculpimos rotinas. Entre na fila de qualidade.
                        </p>

                        {submitted ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center h-32 bg-ceramic-base rounded-2xl ceramic-shadow text-center p-6"
                            >
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                                    <Check className="text-green-600" size={24} />
                                </div>
                                <p className="font-bold text-ceramic-text-primary">Enviado à forja. Te avisaremos.</p>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                                <input
                                    type="email"
                                    required
                                    placeholder="seu@melhor-email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/40 border border-white/20 rounded-xl px-5 py-4 font-medium text-lg outline-none focus:bg-white/60 transition-all placeholder:text-ceramic-text-secondary/70 shadow-inner"
                                />
                                {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 rounded-xl font-bold text-lg bg-ceramic-base text-ceramic-text-primary ceramic-shadow hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Registrando...' : 'Entrar na fila'}
                                </button>
                            </form>
                        )}

                        <p className="text-sm font-medium text-ceramic-text-secondary/70 text-center mt-6">
                            Apenas 50 convites liberados por semana. Menos caos, mais qualidade.
                        </p>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
