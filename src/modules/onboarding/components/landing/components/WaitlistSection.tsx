import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Mail, Check, AlertCircle } from 'lucide-react';

interface WaitlistSectionProps {
  waitlistCount?: number;
  onJoinWaitlist?: (email: string) => Promise<any>;
  isSubmitting?: boolean;
  submitted?: boolean;
  error?: string | null;
  inviteCode?: string;
  onCodeChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCodeSubmit?: () => void;
  codeValid?: boolean;
  codeError?: string;
}

export function WaitlistSection({
  waitlistCount,
  onJoinWaitlist,
  isSubmitting = false,
  submitted = false,
  error = null,
  inviteCode = '',
  onCodeChange,
  onCodeSubmit,
  codeValid = false,
  codeError,
}: WaitlistSectionProps) {
  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary mb-4 tracking-tighter">
          Junte-se ao AICA
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-0 items-stretch">
        {/* Card A: Invite Code */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="p-8 ceramic-card relative overflow-hidden flex flex-col"
        >
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 opacity-50" />
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Ticket className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-xl font-black text-ceramic-text-primary mb-2 tracking-tight text-center">
            Tenho um codigo de convite
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-6 leading-relaxed text-center">
            Digite seu codigo para acesso imediato.
          </p>
          <div className="flex gap-2 mt-auto">
            <input
              type="text"
              placeholder="XXXX-XXXX"
              maxLength={9}
              value={inviteCode}
              onChange={onCodeChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inviteCode.replace(/-/g, '').length === 8) {
                  onCodeSubmit?.();
                }
              }}
              className="flex-1 px-4 py-3 rounded-xl text-center font-mono text-lg uppercase tracking-[0.2em] text-ceramic-text-primary placeholder:text-ceramic-text-tertiary/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-shadow"
              style={{ boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.7)' }}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={onCodeSubmit}
              disabled={inviteCode.replace(/-/g, '').length !== 8}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {codeValid ? <Check className="w-5 h-5" /> : 'Entrar'}
            </button>
          </div>
          <AnimatePresence>
            {codeError && (
              <motion.p
                className="flex items-center justify-center gap-1.5 text-sm text-ceramic-error mt-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {codeError}
              </motion.p>
            )}
            {codeValid && (
              <motion.p
                className="text-sm text-ceramic-success mt-3 font-medium text-center"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                Codigo valido! Clique em &quot;Entrar com Convite&quot; no topo.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Divider */}
        <div className="hidden md:flex flex-col items-center justify-center px-6">
          <div className="w-px h-full bg-ceramic-text-secondary/20 relative">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-ceramic-base px-2 py-1 text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest">
              ou
            </span>
          </div>
        </div>
        <div className="flex md:hidden items-center justify-center">
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-ceramic-text-secondary/20" />
            <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-ceramic-text-secondary/20" />
          </div>
        </div>

        {/* Card B: Waitlist */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="p-8 ceramic-card relative overflow-hidden flex flex-col"
        >
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-ceramic-info via-ceramic-info to-ceramic-info opacity-30" />
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-ceramic-info/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-ceramic-info" />
          </div>
          <h3 className="text-xl font-black text-ceramic-text-primary mb-2 tracking-tight text-center">
            Entrar na lista de espera
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-6 leading-relaxed text-center">
            Receba um convite quando houver vaga.
          </p>

          {submitted ? (
            <div className="mt-auto text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-ceramic-success/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-ceramic-success" />
              </div>
              <p className="text-sm font-medium text-ceramic-success">
                Voce esta na lista! Avisaremos quando houver vaga.
              </p>
            </div>
          ) : (
            <form
              className="mt-auto"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const email = formData.get('email') as string;
                if (email && onJoinWaitlist) {
                  await onJoinWaitlist(email);
                }
              }}
            >
              <div className="flex gap-2">
                <input
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  required
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-tertiary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-info/40 transition-shadow"
                  style={{ boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.7)' }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-3 rounded-xl bg-ceramic-info hover:bg-ceramic-info/90 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {isSubmitting ? '...' : 'Entrar'}
                </button>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p
                    className="flex items-center justify-center gap-1.5 text-sm text-ceramic-error mt-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          )}
        </motion.div>
      </div>

      {/* Counter */}
      {waitlistCount != null && waitlistCount > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8 text-sm text-ceramic-text-secondary font-medium"
        >
          <span className="font-black text-ceramic-text-primary">{waitlistCount}</span>{' '}
          pessoas aguardando acesso
        </motion.p>
      )}
    </section>
  );
}
