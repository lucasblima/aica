import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HeroSection } from './components/HeroSection';
import { ChatShowcase } from './components/ChatShowcase';
import { ModuleExplorer } from './components/ModuleExplorer';
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
 * LandingPage - "O Oleiro Digital" concept
 *
 * Structure:
 * 1. Header (fixed, frosted glass with nav links)
 * 2. Hero (Fleeing chaos shards + "A Forja" OS card)
 * 3. ChatShowcase (interactive VIDA demo)
 * 4. ModuleExplorer (8 module mini-demos)
 * 5. Conversion (TelegramPreview + TrustBadges + Invite/Waitlist)
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
        /* eslint-disable react-hooks/set-state-in-effect */
        setHasStoredInvite(true);
        setInviteCode(code);
        setCodeValid(true);
        /* eslint-enable react-hooks/set-state-in-effect */
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
      { property: 'og:url', content: `${import.meta.env.VITE_FRONTEND_URL || 'https://aica.guru'}/landing` },
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

    // Enable smooth scrolling globally
    document.documentElement.style.scrollBehavior = 'smooth';

    window.scrollTo(0, 0);

    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
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
          <nav className="flex items-center gap-3">
            <button
              onClick={() => scrollToSection('modules')}
              className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Módulos
            </button>
            <a
              href="https://t.me/AicaLifeBot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Experimentar
            </a>
            <button
              onClick={handleOpenLogin}
              className="text-sm bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-primary px-4 py-1.5 rounded-lg transition-colors"
            >
              {hasStoredInvite ? 'Entrar com Convite' : 'Entrar'}
            </button>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* ── 1. Hero ── */}
        <HeroSection onOpenLogin={handleOpenLogin} />

        {/* ── 2. Chat Showcase (interactive VIDA demo) ── */}
        <ChatShowcase />

        {/* ── 3. Module Explorer (8 mini-demos) ── */}
        <div id="modules">
          <ModuleExplorer />
        </div>

        {/* ── 4. Conversion (Telegram + TrustBadges + Invite/Waitlist) ── */}
        <ConversionSection
          waitlistCount={waitlistCount}
          onJoinWaitlist={joinWaitlist}
          isSubmitting={waitlistSubmitting}
          submitted={waitlistSubmitted}
          error={waitlistError}
          inviteCode={inviteCode}
          onCodeChange={handleCodeInput}
          onCodeSubmit={handleCodeSubmit}
          onEnterOS={handleOpenLogin}
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
