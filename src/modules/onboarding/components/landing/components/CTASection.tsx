import type React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

/**
 * CTASection — Final call-to-action with invite code + waitlist.
 *
 * Renders a warm gradient section with:
 * 1. Primary CTA button (signup)
 * 2. Invite code verification
 * 3. Waitlist email capture
 */

export interface CTASectionProps {
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
  onOpenSignup?: () => void;
}

export function CTASection({
  onJoinWaitlist,
  isSubmitting,
  submitted,
  error,
  inviteCode,
  onCodeChange,
  onCodeSubmit,
  codeValid,
  codeError,
  onOpenSignup,
}: CTASectionProps) {
  const { ref, isInView } = useScrollReveal();
  const [email, setEmail] = useState('');

  const handleWaitlistSubmit = async () => {
    if (!email.trim() || isSubmitting) return;
    await onJoinWaitlist(email.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleWaitlistSubmit();
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onCodeSubmit();
    }
  };

  return (
    <section
      id="waitlist"
      className="py-16 sm:py-24 px-6 bg-gradient-to-br from-ceramic-accent/10 via-ceramic-warm to-ceramic-accent/5"
    >
      <div ref={ref} className="max-w-3xl mx-auto">
        {/* ── Header ── */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-black text-center text-ceramic-text-primary"
        >
          Comece a medir e melhorar sua vida com ciencia
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg text-ceramic-text-secondary text-center mt-4"
        >
          500 creditos gratis. 8 modulos. 18+ modelos cientificos. Sem cartao.
        </motion.p>

        {/* ── Primary CTA ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
          className="flex justify-center mt-8"
        >
          <button
            onClick={onOpenSignup}
            className="bg-ceramic-accent text-white px-8 py-4 sm:px-10 sm:py-5 rounded-xl text-lg sm:text-xl font-semibold hover:bg-ceramic-accent-dark transition-colors inline-flex items-center gap-2"
          >
            Criar minha conta gratis
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* ── Divider ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex items-center gap-4 mt-8 max-w-md mx-auto"
        >
          <hr className="flex-1 border-ceramic-border" />
          <span className="text-sm text-ceramic-text-secondary">ou</span>
          <hr className="flex-1 border-ceramic-border" />
        </motion.div>

        {/* ── Invite Code Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-md mx-auto mt-6"
        >
          <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
            Ja tem convite?
          </label>

          <motion.div
            animate={codeError ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex"
          >
            <input
              type="text"
              placeholder="AICA-XXXX-XXXX"
              value={inviteCode}
              onChange={onCodeChange}
              onKeyDown={handleCodeKeyDown}
              className={`flex-1 px-4 py-3 rounded-l-xl font-mono text-center uppercase border-2 transition-colors bg-white/50 outline-none ${
                codeError
                  ? 'border-ceramic-error text-ceramic-error'
                  : codeValid
                    ? 'border-ceramic-success text-ceramic-success'
                    : 'border-ceramic-border focus:border-ceramic-accent'
              }`}
            />
            <button
              onClick={onCodeSubmit}
              className={`px-6 py-3 rounded-r-xl font-semibold transition-colors ${
                codeValid
                  ? 'bg-ceramic-accent text-white'
                  : 'bg-ceramic-text-secondary/10 text-ceramic-text-primary hover:bg-ceramic-text-secondary/20'
              }`}
            >
              {codeValid ? 'Entrar' : 'Verificar'}
            </button>
          </motion.div>

          {codeError && (
            <p className="text-sm text-ceramic-error mt-2 text-center">{codeError}</p>
          )}

          {codeValid && (
            <p className="text-sm text-ceramic-success mt-2 text-center flex items-center justify-center gap-1">
              <Check className="w-4 h-4" />
              Codigo valido! Clique em &quot;Entrar&quot; para continuar.
            </p>
          )}
        </motion.div>

        {/* ── Waitlist Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-md mx-auto mt-6"
        >
          <p className="text-sm text-ceramic-text-secondary text-center mb-2">
            Ou entre na lista de espera
          </p>

          {submitted ? (
            <div className="flex items-center justify-center gap-2 py-3 text-ceramic-success">
              <Check className="w-5 h-5" />
              <span className="font-medium">Voce esta na lista!</span>
            </div>
          ) : (
            <>
              <div className="flex">
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 rounded-l-xl border-2 border-ceramic-border bg-white/50 outline-none transition-colors focus:border-ceramic-accent disabled:opacity-50"
                />
                <button
                  onClick={handleWaitlistSubmit}
                  disabled={isSubmitting || !email.trim()}
                  className="px-6 py-3 rounded-r-xl font-semibold bg-ceramic-text-primary text-white transition-colors hover:bg-ceramic-text-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Entrar'
                  )}
                </button>
              </div>

              {error && (
                <p className="text-sm text-ceramic-error mt-2 text-center">{error}</p>
              )}
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
