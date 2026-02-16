import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Check, AlertCircle } from 'lucide-react';
import { ChaosPanel } from './components/ChaosPanel';
import { OrderPanel } from './components/OrderPanel';
import { ProcessingPipeline } from './components/ProcessingPipeline';
import { demoProcessingService } from './services/demoProcessingService';
import { AuthSheet } from '@/components/layout';
import { Logo } from '@/components/ui';
import {
  validateInviteCode,
  storeInviteCode,
  getStoredInviteCode,
} from '@/services/inviteSystemService';
import type { DemoMessage, ProcessedModules, ProcessingStage } from './types';

/**
 * LandingPage - "Ordem ao Caos" Concept
 */
export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);

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

  // Format invite code input: uppercase, auto-dash
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

  // SEO Meta Tags
  useEffect(() => {
    // Title
    document.title = 'Aica Life OS - Transforme o caos em ordem';

    // Meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'O Life OS que refina suas conversas do WhatsApp em clareza absoluta. Tarefas, reflexões e conexões, destiladas por IA.');

    // Open Graph tags for social sharing
    const ogTags = [
      { property: 'og:title', content: 'Aica Life OS - Transforme o caos em ordem' },
      { property: 'og:description', content: 'O Life OS que refina suas conversas do WhatsApp em clareza absoluta.' },
      { property: 'og:type', content: 'website' },
    ];

    ogTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    // Scroll to top
    window.scrollTo(0, 0);
  }, []);

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
    const newMessages = demoProcessingService.generateDemoMessages();
    setMessages(newMessages);
  };

  // Auth handlers
  const handleOpenLogin = () => {
    setIsAuthSheetOpen(true);
  };

  const handleAuthSuccess = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-ceramic-base font-sans overflow-x-hidden" data-testid="landing-page">
      {/* Skip to main content - Accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ceramic-text-primary focus:text-white focus:rounded-lg focus:outline-none"
      >
        Pular para o conteúdo principal
      </a>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ceramic-base/80 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="default" width={44} className="rounded-lg" />
            <span className="font-black text-2xl text-ceramic-text-primary tracking-tighter">Aica</span>
          </div>
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
      </header>

      <main id="main" className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-8xl font-black text-ceramic-text-primary mb-8 leading-[0.9] tracking-tighter">
              A essência da <br />
              <span className="bg-gradient-to-r from-ceramic-info via-ceramic-accent to-ceramic-warning bg-clip-text text-transparent">
                ordem
              </span>{' '}
              em meio ao caos.
            </h1>
            <p className="text-xl md:text-2xl text-ceramic-text-secondary max-w-2xl mx-auto font-medium leading-relaxed">
              O Life OS que refina suas conversas do WhatsApp em clareza absoluta. Tarefas, reflexões e conexões, destiladas por IA.
            </p>
          </motion.div>
        </section>

        {/* Processing Pipeline Area */}
        <div className="h-24 flex items-center justify-center mb-12">
          <AnimatePresence>
            {isProcessing && processingStage && (
              <ProcessingPipeline
                stage={processingStage}
                messageCount={messages.length}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Main Demo Area */}
        <section className="max-w-7xl mx-auto px-6 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: Chaos Panel */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <ChaosPanel
                messages={messages}
                isProcessing={isProcessing}
              />
            </motion.div>

            {/* Right: Order Panel */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <OrderPanel
                modules={processedModules}
                isProcessing={isProcessing}
              />
            </motion.div>
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
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
                  onClick={handleOpenLogin}
                  className="px-12 py-5 rounded-full font-bold text-xl text-white transition-all hover:scale-[1.02] bg-[#B45309] shadow-[8px_8px_24px_rgba(180,83,9,0.25)]"
                >
                  Testar minha conexão
                </button>
              </>
            )}
          </motion.div>
        </section>

        {/* Invite Code Section */}
        <motion.section
          className="max-w-md mx-auto px-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-8 text-center ceramic-card relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 opacity-50" />
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-black text-ceramic-text-primary mb-2 tracking-tight">
              Acesso por convite
            </h3>
            <p className="text-sm text-ceramic-text-secondary mb-6 leading-relaxed">
              O AICA está em beta exclusivo. Digite seu código para entrar.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="XXXX-XXXX"
                maxLength={9}
                value={inviteCode}
                onChange={handleCodeInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inviteCode.replace(/-/g, '').length === 8) {
                    handleCodeSubmit();
                  }
                }}
                className="flex-1 px-4 py-3 rounded-xl text-center font-mono text-lg uppercase tracking-[0.2em] text-ceramic-text-primary placeholder:text-ceramic-text-tertiary/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-shadow"
                style={{ boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.7)' }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={handleCodeSubmit}
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
                  className="text-sm text-ceramic-success mt-3 font-medium"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  Código válido! Clique em "Entrar com Convite" acima.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-6 py-16 mb-16 border-t border-white/20">
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

        {/* Curiosity Section */}
        <section className="max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="p-16 ceramic-card relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ceramic-info via-ceramic-accent to-ceramic-warning opacity-40" />
            <h2 className="text-4xl md:text-6xl font-black text-ceramic-text-primary mb-8 tracking-tighter leading-tight">
              A curiosidade é o primeiro passo <br /> para a ordem.
            </h2>
            <p className="text-xl text-ceramic-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Conecte seu WhatsApp e veja a mágica da destilação em tempo real. Sem burocracia, apenas clareza.
            </p>
            <button
              onClick={handleOpenLogin}
              className={`px-20 py-8 rounded-full font-black text-2xl text-white transition-all hover:scale-[1.02] ${
                hasStoredInvite
                  ? 'bg-amber-600 shadow-[12px_12px_32px_rgba(180,83,9,0.3)] hover:bg-amber-700'
                  : 'bg-[#5C554B] shadow-[12px_12px_32px_rgba(92,85,75,0.3)] hover:bg-[#3A3632]'
              }`}
            >
              {hasStoredInvite ? 'Começar com meu convite' : 'Testar minha conexão'}
            </button>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/20 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <Logo variant="default" width={32} />
            <span className="font-black text-xl text-ceramic-text-primary tracking-tighter">Aica Life OS</span>
          </div>
          <div className="flex items-center gap-8 text-sm font-bold text-ceramic-text-secondary uppercase tracking-widest">
            <a href="/privacy" className="hover:text-ceramic-text-primary transition-colors">Privacidade</a>
            <a href="/terms" className="hover:text-ceramic-text-primary transition-colors">Termos</a>
            <span className="opacity-40">&copy; {new Date().getFullYear()} Aica</span>
          </div>
        </div>
      </footer>

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
