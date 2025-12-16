import React, { useEffect, useState } from 'react';
import { Header } from './landing/Header';
import { HeroSection } from './landing/HeroSection';
import { ValueProposition } from './landing/ValueProposition';
import { HowItWorks } from './landing/HowItWorks';
import { TrustIndicators } from './landing/TrustIndicators';
import { CTASection } from './landing/CTASection';
import { Footer } from './landing/Footer';
import { AuthSheet } from '../../../components/AuthSheet';

/**
 * LandingPage Component
 *
 * The main landing page (splash screen) for Aica.
 * This component serves as the first impression for unauthenticated users.
 *
 * It includes:
 * - Header with navigation and auth buttons
 * - Hero section with main value proposition
 * - Value proposition highlights (3 core benefits)
 * - How it works flow (4-step process)
 * - Trust indicators (beta, privacy, user stats)
 * - Final CTA section
 * - Footer with links and social media
 *
 * Features:
 * - Fully responsive (mobile, tablet, desktop)
 * - WCAG AAA accessible
 * - Smooth animations and transitions
 * - Performance optimized
 * - SEO friendly semantic HTML
 */
export function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

  // Handle scroll to section if hash is present
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      // Scroll to top when landing page mounts
      window.scrollTo(0, 0);
    }
  }, []);

  // Navigation handlers - show login modal
  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleSignUpClick = () => {
    setShowLogin(true);
  };

  const handleLearnMoreClick = () => {
    const ctaSection = document.querySelector('#cta');
    if (ctaSection) {
      ctaSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDemoClick = () => {
    // TODO: Implement demo scheduling modal or email
    console.log('Demo scheduling clicked');
    // For now, just scroll to contact info
    const footer = document.querySelector('footer');
    if (footer) {
      footer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-ceramic-base font-sans text-[#2B1B17]">
      {/* Meta tags would be handled by Helmet or head config */}
      <meta name="description" content="Aica - Seu companheiro pessoal para autoconhecimento e crescimento. Registre seus momentos, receba insights personalizados, e observe as transformações acontecerem." />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#F0EFE9" />

      {/* Header with sticky navigation */}
      <Header
        onLoginClick={handleLoginClick}
        onSignUpClick={handleSignUpClick}
      />

      {/* Main content */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection
          onSignUpClick={handleSignUpClick}
          onLearnMoreClick={handleLearnMoreClick}
        />

        {/* Value Proposition */}
        <ValueProposition />

        {/* How It Works */}
        <HowItWorks />

        {/* Trust Indicators */}
        <TrustIndicators />

        {/* CTA Section */}
        <CTASection
          onSignUpClick={handleSignUpClick}
          onDemoClick={handleDemoClick}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Skip to main content link (accessibility) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-[#6B9EFF] focus:text-white focus:rounded"
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

export default LandingPage;
