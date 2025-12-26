import React, { useState, useEffect } from 'react';
import { HeroMonolith } from './HeroMonolith';
import { BentoGridDense } from './BentoGridDense';
import { FeatureStrip } from './FeatureStrip';
import { CTASection } from './CTASection';
import { MinimalFooter } from '../landing-v2/MinimalFooter';
import { AuthSheet } from '../../../../components/AuthSheet';

/**
 * LandingPageV3 - Apple-Scale Digital Ceramic Landing Page
 *
 * Operation "Digital Ceramic Transformation"
 * Philosophy: Digital Ceramic demands attention through physical presence.
 * The interface is a luxury object that occupies space with confidence.
 *
 * Structure:
 * 1. HeroMonolith - Massive phone mockup with bleeding effect
 * 2. BentoGridDense - High-density feature grid
 * 3. FeatureStrip × 3 - Fale, Reflita, Evolua narrative
 * 4. CTASection - Final call-to-action
 * 5. MinimalFooter - Grounded footer
 *
 * Features:
 * - Apple-level scale and typography
 * - Spring physics animations
 * - Fully responsive (mobile-first)
 * - WCAG AA accessible
 * - Ceramic design system integration
 */
export function LandingPageV3() {
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
      <meta name="description" content="Aica - Conheça a si mesmo através do sistema operacional para sua vida." />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#F0EFE9" />

      <main>
        {/* 1. Hero - The Monolith */}
        <HeroMonolith onGetStarted={handleGetStarted} />

        {/* 2. Bento Grid - The Density */}
        <BentoGridDense />

        {/* 3. Feature Strips - Fale, Reflita, Evolua */}
        <FeatureStrip
          title="Fale."
          description="Capture pensamentos na velocidade da fala. Sem digitação, sem atrito. Apenas você e suas ideias."
          visual={<SpeakVisualPlaceholder />}
          index={0}
        />
        <FeatureStrip
          title="Reflita."
          description="Perguntas que mudam sua perspectiva. Cada dia, uma oportunidade de se conhecer melhor."
          visual={<ReflectVisualPlaceholder />}
          reverse
          index={1}
        />
        <FeatureStrip
          title="Evolua."
          description="Visualize seu progresso tangível. Níveis, conquistas e métricas que celebram sua jornada."
          visual={<EvolveVisualPlaceholder />}
          index={2}
        />

        {/* 4. Final CTA */}
        <CTASection onGetStarted={handleGetStarted} />
      </main>

      {/* 5. Footer */}
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

/**
 * Placeholder Components for UI Elements
 * These will be replaced with actual UI screenshots later
 */

function SpeakVisualPlaceholder() {
  return (
    <div className="aspect-square bg-gradient-to-br from-ceramic-accent/20 to-ceramic-accent/10 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-ceramic-accent/30 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-ceramic-accent/50" />
        </div>
        <p className="text-sm text-ceramic-text-secondary font-medium">Microphone UI</p>
      </div>
    </div>
  );
}

function ReflectVisualPlaceholder() {
  return (
    <div className="aspect-square bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center p-8">
      <div className="text-center w-full">
        <div className="h-4 bg-purple-200 rounded mb-3" />
        <div className="h-4 bg-purple-200 rounded mb-3 w-3/4 mx-auto" />
        <div className="h-4 bg-purple-200 rounded w-1/2 mx-auto" />
        <p className="text-sm text-ceramic-text-secondary font-medium mt-6">Daily Question Card</p>
      </div>
    </div>
  );
}

function EvolveVisualPlaceholder() {
  return (
    <div className="aspect-square bg-gradient-to-br from-green-100 to-green-50 rounded-2xl flex items-center justify-center p-8">
      <div className="text-center w-full">
        <div className="mb-4">
          <div className="text-4xl font-black text-green-600 mb-2">12</div>
          <p className="text-xs text-ceramic-text-secondary">Level</p>
        </div>
        <div className="h-3 bg-green-200 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-gradient-to-r from-green-500 to-green-400" />
        </div>
        <p className="text-sm text-ceramic-text-secondary font-medium mt-6">XP Progress Bar</p>
      </div>
    </div>
  );
}

export default LandingPageV3;
