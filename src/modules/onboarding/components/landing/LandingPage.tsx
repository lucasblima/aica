import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye } from 'lucide-react';
import { HeroSection } from './components/HeroSection';
import { InteractiveModulesSection } from './components/InteractiveModulesSection';
import { ConversionSection } from './components/ConversionSection';
import { FooterSection } from './components/FooterSection';
import { AuthSheet } from '@/components/layout';
import { Logo } from '@/components/ui';
import { useWaitlist } from '@/hooks/useWaitlist';
import {
  validateInviteCode,
  storeInviteCode,
  getStoredInviteCode,
} from '@/services/inviteSystemService';

/**
 * LandingPage - "O Oleiro Digital" concept (Gemini 3.1)
 *
 * Structure:
 * 1. Header (fixed, frosted glass)
 * 2. Hero (Fleeing chaos shards + "A Forja" OS card)
 * 3. Interactive Modules ("A Prateleira do Ateliê")
 * 4. Security Badges
 * 5. Conversion (Invite code + Waitlist with odometer)
 * 6. Footer
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

      <main id="main">
        {/* ── 1. Hero (Chaos shards + Forja OS card) ── */}
        <HeroSection />

        {/* ── 2. Interactive Modules ("A Prateleira do Ateliê") ── */}
        <div id="modules">
          <InteractiveModulesSection />
        </div>

        {/* ── 3. Security Badges ── */}
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

        {/* ── 4. Conversion (Invite + Waitlist with odometer) ── */}
        <ConversionSection
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
