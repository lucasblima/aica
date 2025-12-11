import React, { useEffect, useState } from 'react';
import { Header } from './landing/Header';
import { HeroSection } from './landing/HeroSection';
import { ValueProposition } from './landing/ValueProposition';
import { HowItWorks } from './landing/HowItWorks';
import { TrustIndicators } from './landing/TrustIndicators';
import { CTASection } from './landing/CTASection';
import { Footer } from './landing/Footer';
import Login from '../../../components/Login';

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
    <div className="min-h-screen bg-white font-sans text-[#2B1B17]">
      {/* Meta tags would be handled by Helmet or head config */}
      <meta name="description" content="Aica - Seu companheiro pessoal para autoconhecimento e crescimento. Registre seus momentos, receba insights personalizados, e observe as transformações acontecerem." />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#6B9EFF" />

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

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
              aria-label="Fechar"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Login onLogin={() => setShowLogin(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
