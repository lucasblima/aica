import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Eye } from 'lucide-react';
import { ChaosPanel } from './components/ChaosPanel';
import { OrderPanel } from './components/OrderPanel';
import { ProcessingPipeline } from './components/ProcessingPipeline';
import { FounderStorySection } from './components/FounderStorySection';
import { ModulesOverviewSection } from './components/ModulesOverviewSection';
import { WaitlistSection } from './components/WaitlistSection';
import { FooterSection } from './components/FooterSection';
import { demoProcessingService } from './services/demoProcessingService';
import { AuthSheet } from '@/components/layout';
import { Logo } from '@/components/ui';
import { useWaitlist } from '@/hooks/useWaitlist';
import {
  validateInviteCode,
  storeInviteCode,
  getStoredInviteCode,
} from '@/services/inviteSystemService';
import type { DemoMessage, ProcessedModules, ProcessingStage } from './types';

/**
 * LandingPage - Redesigned for conversion
 *
 * Structure:
 * 1. Header (fixed)
 * 2. Hero (Life OS value prop)
 * 3. Modules Overview (8 modules)
 * 4. Interactive Demo (Chaos → Order)
 * 5. Founder Story
 * 6. Testimonials
 * 7. How It Works (3 steps)
 * 8. Waitlist + Invite Code
 * 9. Security Badges
 * 10. Final CTA
 * 11. Footer
 */
export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);

  // Waitlist hook
  const {
    joinWaitlist,
    waitlistCount,
    isSubmitting: waitlistSubmitting,
    submitted: waitlistSubmitted,
    error: waitlistError,
  } = useWaitlist();

  // Demo state
  const [messages, setMessages] = useState<DemoMessage[]>(() =>
    demoProcessingService.generateDemoMessages()
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage | null>(null);
  const [processedModules, setProcessedModules] = useState<ProcessedModules | null>(null);

  // Invite code state
  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeValid, setCodeValid] = useState(false);
  const [hasStoredInvite, setHasStoredInvite] = useState(() => !!getStoredInviteCode());

  // Check URL params for invite code on mount
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      const formatted = codeParam.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (formatted.length >= 8) {
        const code = `${formatted.slice(0, 4)}-${formatted.slice(4, 8)}`;
        storeInviteCode(code);
        setHasStoredInvite(true);
        setInviteCode(code);
        setCodeValid(true);
      }
    }
  }, [searchParams]);

  // SEO Meta Tags
  useEffect(() => {
    document.title = 'Aica Life OS — Seu sistema operacional de vida pessoal';

    const metaTags: { name?: string; property?: string; content: string }[] = [
      { name: 'description', content: '8 módulos de IA que organizam suas tarefas, reflexões, finanças, treinos, podcasts e conexões. Tudo integrado, tudo inteligente.' },
      { property: 'og:title', content: 'Aica Life OS — Seu sistema operacional de vida pessoal' },
      { property: 'og:description', content: '8 módulos de IA que organizam tarefas, reflexões, finanças, treinos, podcasts e conexões.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://aica.guru/landing' },
      { property: 'og:image', content: 'https://aica.guru/og-image.png' },
    ];

    metaTags.forEach(({ name, property, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        if (name) tag.setAttribute('name', name);
        if (property) tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    window.scrollTo(0, 0);
  }, []);

  // Smooth scroll to section
  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Format invite code input
  const handleCodeInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length <= 8) {
      const formatted = raw.length > 4
        ? `${raw.slice(0, 4)}-${raw.slice(4)}`
        : raw;
      setInviteCode(formatted);
      setCodeError('');
      setCodeValid(false);
    }
  }, []);

  // Validate and store invite code
  const handleCodeSubmit = useCallback(async () => {
    const cleanCode = inviteCode.replace(/-/g, '').trim();
    if (cleanCode.length !== 8) return;

    const result = await validateInviteCode(inviteCode);
    if (result.valid) {
      storeInviteCode(inviteCode);
      setCodeValid(true);
      setCodeError('');
      setHasStoredInvite(true);
    } else {
      setCodeError(result.error || 'Código inválido ou expirado');
      setCodeValid(false);
    }
  }, [inviteCode]);

  // Handle processing demo
  const handleProcessChaos = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessedModules(null);

    await demoProcessingService.processMessages(
      messages,
      (stage) => setProcessingStage(stage as ProcessingStage),
      (modules) => {
        setProcessedModules(modules);
        setIsProcessing(false);
        setProcessingStage(null);
      }
    );
  };

  // Reset demo
  const handleResetDemo = () => {
    setProcessedModules(null);
    setIsProcessing(false);
    setProcessingStage(null);
    setMessages(demoProcessingService.generateDemoMessages());
  };

  // Auth handlers
  const handleOpenLogin = () => setIsAuthSheetOpen(true);
  const handleAuthSuccess = () => navigate('/');

  return (
    <div className="min-h-screen bg-ceramic-base font-sans overflow-x-hidden" data-testid="landing-page">
      {/* Skip to main content - Accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ceramic-text-primary focus:text-white focus:rounded-lg focus:outline-none"
      >
        Pular para o conteúdo principal
      </a>

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ceramic-base/80 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="default" width={44} className="rounded-lg" />
            <span className="font-black text-2xl text-ceramic-text-primary tracking-tighter">Aica</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => scrollToSection('waitlist')}
              className="hidden sm:block px-5 py-2 rounded-full font-bold text-sm text-ceramic-text-primary transition-all hover:scale-105 ceramic-card"
            >
              Lista de Espera
            </button>
            <button
              onClick={handleOpenLogin}
              className={`px-6 py-2.5 rounded-full font-bold text-sm text-white transition-all hover:scale-105 ${
                hasStoredInvite
                  ? 'bg-amber-600 shadow-[4px_4px_10px_rgba(180,83,9,0.25)]'
                  : 'bg-[#5C554B] shadow-[4px_4px_10px_rgba(92,85,75,0.25)]'
              }`}
            >
              {hasStoredInvite ? 'Entrar com Convite' : 'Entrar'}
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="pt-24 pb-16">
        {/* ── 1. Hero Section ── */}
        <section className="max-w-7xl mx-auto px-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-8xl font-black text-ceramic-text-primary mb-8 leading-[0.9] tracking-tighter">
              Seu sistema operacional{' '}
              <br className="hidden md:block" />
              de{' '}
              <span className="bg-gradient-to-r from-ceramic-info via-ceramic-accent to-ceramic-warning bg-clip-text text-transparent">
                vida pessoal
              </span>
              .
            </h1>
            <p className="text-xl md:text-2xl text-ceramic-text-secondary max-w-3xl mx-auto font-medium leading-relaxed">
              8 módulos de IA que organizam suas tarefas, reflexões, finanças, treinos, podcasts, conexões e muito mais. Tudo a partir das suas conversas do dia a dia.
            </p>

            {/* Hero CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
            >
              <button
                onClick={() => scrollToSection('waitlist')}
                className="px-10 py-4 rounded-full font-bold text-lg text-white transition-all hover:scale-[1.02] bg-amber-600 shadow-[8px_8px_24px_rgba(180,83,9,0.25)] hover:bg-amber-700"
              >
                Entrar na lista de espera
              </button>
              <button
                onClick={() => scrollToSection('demo')}
                className="px-8 py-4 rounded-full font-bold text-lg text-ceramic-text-secondary transition-all hover:scale-[1.02] ceramic-card"
              >
                Ver demonstração
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* ── 2. Modules Overview ── */}
        <ModulesOverviewSection />

        {/* ── 3. Interactive Demo ── */}
        <section id="demo" className="scroll-mt-20">
          <div className="max-w-7xl mx-auto px-6 mb-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary mb-4 tracking-tighter">
                Veja o AICA em ação
              </h2>
              <p className="text-lg text-ceramic-text-secondary font-medium uppercase tracking-widest opacity-60">
                Mensagens caóticas se transformam em clareza
              </p>
            </motion.div>
          </div>

          {/* Processing Pipeline */}
          <div className="h-24 flex items-center justify-center mb-8">
            <AnimatePresence>
              {isProcessing && processingStage && (
                <ProcessingPipeline
                  stage={processingStage}
                  messageCount={messages.length}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Demo Panels */}
          <div className="max-w-7xl mx-auto px-6 mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <ChaosPanel messages={messages} isProcessing={isProcessing} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <OrderPanel modules={processedModules} isProcessing={isProcessing} />
              </motion.div>
            </div>

            {/* Demo CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mt-12 gap-4"
            >
              {!processedModules ? (
                <button
                  onClick={handleProcessChaos}
                  disabled={isProcessing}
                  className="px-12 py-5 rounded-full font-bold text-xl text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed bg-[#5C554B] shadow-[8px_8px_24px_rgba(92,85,75,0.25)]"
                >
                  {isProcessing ? 'Destilando...' : 'Organizar meu WhatsApp'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleResetDemo}
                    className="px-8 py-4 rounded-full font-bold text-lg text-ceramic-text-secondary transition-all hover:scale-[1.02] bg-ceramic-base ceramic-shadow"
                  >
                    Reiniciar
                  </button>
                  <button
                    onClick={() => scrollToSection('waitlist')}
                    className="px-12 py-5 rounded-full font-bold text-xl text-white transition-all hover:scale-[1.02] bg-amber-600 shadow-[8px_8px_24px_rgba(180,83,9,0.25)]"
                  >
                    Quero experimentar
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </section>

        {/* ── 4. Founder Story ── */}
        <FounderStorySection />

        {/* ── 5. How It Works ── */}
        <section className="max-w-7xl mx-auto px-6 py-16 border-t border-white/20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary mb-4 tracking-tighter">
              Como funciona
            </h2>
            <p className="text-lg text-ceramic-text-secondary font-medium uppercase tracking-widest opacity-60">
              Sua rotina, seus dados, organizados automaticamente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '📱',
                title: 'Conecte suas mensagens',
                description: 'Importe conversas do WhatsApp que você deseja processar de forma segura.'
              },
              {
                icon: '🧠',
                title: 'IA classifica tudo',
                description: 'Nossa IA identifica tarefas, reflexões e conexões importantes na sua vida.'
              },
              {
                icon: '✨',
                title: 'Organize sua vida',
                description: 'Tenha uma visão clara e estruturada para agir e refletir com precisão.'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="p-10 text-center ceramic-card-light group hover:ceramic-card transition-all duration-300"
              >
                <div className="text-6xl mb-6 transition-transform group-hover:scale-110">{feature.icon}</div>
                <h3 className="text-2xl font-black text-ceramic-text-primary mb-4 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-ceramic-text-secondary font-medium leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 7. Waitlist + Invite Code ── */}
        <div id="waitlist" className="scroll-mt-20">
          <WaitlistSection
            waitlistCount={waitlistCount}
            onJoinWaitlist={joinWaitlist}
            isSubmitting={waitlistSubmitting}
            submitted={waitlistSubmitted}
            error={waitlistError}
            inviteCode={inviteCode}
            onCodeChange={handleCodeInput}
            onCodeSubmit={handleCodeSubmit}
            codeValid={codeValid}
            codeError={codeError}
          />
        </div>

        {/* ── 8. Security Badges ── */}
        <motion.section
          className="max-w-4xl mx-auto px-6 py-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-8 text-ceramic-text-secondary">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-ceramic-success" />
              <span className="text-sm font-bold">LGPD Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-ceramic-success" />
              <span className="text-sm font-bold">Dados criptografados</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-ceramic-success" />
              <span className="text-sm font-bold">Sem acesso a senhas</span>
            </div>
          </div>
        </motion.section>

        {/* ── 9. Final CTA ── */}
        <section className="max-w-6xl mx-auto px-6 text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="p-16 ceramic-card relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ceramic-info via-ceramic-accent to-ceramic-warning opacity-40" />
            <h2 className="text-4xl md:text-6xl font-black text-ceramic-text-primary mb-8 tracking-tighter leading-tight">
              Pronto para organizar{' '}
              <br className="hidden md:block" />
              sua vida?
            </h2>
            <p className="text-xl text-ceramic-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Junte-se aos primeiros usuários que estão transformando o caos digital em clareza com inteligência artificial.
            </p>
            <button
              onClick={() => scrollToSection('waitlist')}
              className="px-16 py-6 rounded-full font-black text-xl text-white transition-all hover:scale-[1.02] bg-amber-600 shadow-[12px_12px_32px_rgba(180,83,9,0.3)] hover:bg-amber-700"
            >
              Quero entrar
            </button>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ── */}
      <FooterSection />

      {/* Auth Sheet */}
      <AuthSheet
        isOpen={isAuthSheetOpen}
        onClose={() => setIsAuthSheetOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default LandingPage;
