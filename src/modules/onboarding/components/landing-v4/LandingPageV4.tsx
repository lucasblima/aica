import React, { useState, useEffect } from 'react';
import { HeroSection } from './HeroSection';
import { SocialProof } from './SocialProof';
import { Features } from './Features';
import { HowItWorks } from './HowItWorks';
import { CaptacaoSection } from './CaptacaoSection';
import { CTASection } from './CTASection';
import { MinimalFooter } from '../landing-v2/MinimalFooter';
import { AuthSheet } from '../../../../components/AuthSheet';

/**
 * LandingPageV4 - Complete Redesign (Issue #23)
 *
 * Design Philosophy: "Conheça a si mesmo" - Self-knowledge as the core value
 * Following Digital Ceramic aesthetic with modern, clean layouts
 *
 * Structure:
 * 1. HeroSection - "Conheça a si mesmo" headline
 * 2. SocialProof - University and company logos
 * 3. Features - Module showcase with icons
 * 4. HowItWorks - 3-step illustrated guide
 * 5. CaptacaoSection - Agency/enterprise offering
 * 6. CTASection - Waitlist with urgency
 * 7. MinimalFooter - Grounded footer
 *
 * Features:
 * - Fully responsive (mobile-first)
 * - WCAG AA accessible
 * - Framer Motion animations
 * - iOS-style auth sheet integration
 * - Digital Ceramic design system
 */
export function LandingPageV4() {
  const [showLogin, setShowLogin] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle CTA clicks - open auth sheet
  const handleGetStarted = () => {
    setShowLogin(true);
  };

  return (
    <div className="min-h-screen bg-ceramic-base font-sans text-ceramic-text-primary">
      {/* SEO Meta Tags */}
      <meta name="description" content="Aica Life OS - Conheça a si mesmo. Sistema operacional para sua vida com registro estruturado, reflexões diárias e gamificação inteligente." />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#F0EFE9" />

      <main>
        {/* 1. Hero - "Conheça a si mesmo" */}
        <HeroSection onGetStarted={handleGetStarted} />

        {/* 2. Social Proof - Universities & Companies */}
        <SocialProof />

        {/* 3. Features - Module Showcase */}
        <Features />

        {/* 4. How It Works - 3 Steps */}
        <HowItWorks />

        {/* 5. Captação - Agency/Enterprise */}
        <CaptacaoSection />

        {/* 6. Final CTA - Waitlist with Urgency */}
        <CTASection onGetStarted={handleGetStarted} />
      </main>

      {/* 7. Footer */}
      <MinimalFooter onGetStarted={handleGetStarted} />

      {/* Skip to main content link (accessibility) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-ceramic-accent focus:text-white focus:rounded"
      >
        Pular para conteúdo principal
      </a>

      {/* Auth Sheet - iOS-style bottom sheet */}
      <AuthSheet
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
      />
    </div>
  );
}

export default LandingPageV4;
