/**
 * Welcome Tour Component
 * Interactive carousel presenting the 4 pillars of Aica
 *
 * Features:
 * - 4-slide carousel with smooth transitions
 * - Navigation with dots and arrow buttons
 * - Keyboard navigation (Arrow keys, Tab)
 * - Touch/swipe navigation on mobile
 * - Skip tour option
 * - Detailed pillar information modal
 * - Progress tracking
 * - WCAG AAA accessible
 * - Fully responsive
 * - Framer Motion animations
 *
 * @component
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { getPillars, type Pillar } from '../../../data/pillarData';
import { ProgressDots } from './tour/ProgressDots';
import { NavigationArrows } from './tour/NavigationArrows';
import { PillarCard } from './tour/PillarCard';
import { PillarDetails } from './tour/PillarDetails';

interface WelcomeTourProps {
  onComplete?: () => void;
  onSkip?: () => void;
  onPillarExplore?: (pillar: Pillar) => void;
  autoPlayEnabled?: boolean;
  autoPlayInterval?: number;
}

/**
 * WelcomeTour - Main carousel component for onboarding
 *
 * Displays 4 pillars of Aica with smooth transitions and navigation.
 * Includes skip, detail modal, and completion tracking.
 */
export function WelcomeTour({
  onComplete,
  onSkip,
  onPillarExplore,
  autoPlayEnabled = false,
  autoPlayInterval = 5000,
}: WelcomeTourProps) {
  const pillars = getPillars();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [autoPlay, setAutoPlay] = useState(autoPlayEnabled);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev < pillars.length - 1 ? prev + 1 : prev
      );
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, pillars.length, autoPlayInterval]);

  // Stop autoplay when user interacts
  const handleUserInteraction = useCallback(() => {
    setAutoPlay(false);
  }, []);

  // Navigate to next slide
  const handleNext = useCallback(() => {
    handleUserInteraction();
    if (currentIndex < pillars.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, pillars.length, handleUserInteraction]);

  // Navigate to previous slide
  const handlePrevious = useCallback(() => {
    handleUserInteraction();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, handleUserInteraction]);

  // Navigate to specific slide
  const handleDotClick = useCallback(
    (index: number) => {
      handleUserInteraction();
      setCurrentIndex(index);
    },
    [handleUserInteraction]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showDetailsModal) return; // Don't navigate when modal is open

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'Escape':
          // Don't close tour with ESC, only close modal
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, showDetailsModal]);

  // Touch/swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
  }, [touchStart, touchEnd, handleNext, handlePrevious]);

  // Handle explore pillar
  const handleExplorePillar = useCallback(
    (pillar: Pillar) => {
      handleUserInteraction();
      onPillarExplore?.(pillar);
      // Could also navigate to the module directly
    },
    [onPillarExplore, handleUserInteraction]
  );

  // Handle learn more
  const handleLearnMore = useCallback((pillar: Pillar) => {
    setSelectedPillar(pillar);
    setShowDetailsModal(true);
  }, []);

  // Handle skip tour
  const handleSkipTour = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  // Handle tour completion (last slide done)
  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // Handle start using pillar from modal
  const handleStartPillar = useCallback(
    (pillar: Pillar) => {
      handleExplorePillar(pillar);
      setShowDetailsModal(false);
    },
    [handleExplorePillar]
  );

  const currentPillar = pillars[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < pillars.length - 1;
  const isLastSlide = currentIndex === pillars.length - 1;

  return (
    <div
      className="relative w-full min-h-screen bg-gradient-to-b from-[#FDFBF8] to-[#F5F2ED] flex flex-col"
      role="region"
      aria-label="Welcome tour of Aica pillars"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Header with close/skip buttons */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-8 py-6">
        {/* Logo/Title */}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-[#5C554B]">
            Bem-vindo ao Aica
          </h1>
          <p className="text-sm text-[#948D82] mt-1">
            Conheça os 4 pilares que vão transformar sua vida
          </p>
        </div>

        {/* Skip Button */}
        <button
          onClick={handleSkipTour}
          className="ml-4 px-4 md:px-6 py-2 text-sm md:text-base font-semibold text-[#948D82] hover:text-[#5C554B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded-lg"
          aria-label="Skip tour"
          title="Pular tour (você pode ver isso depois)"
        >
          Pular
        </button>
      </div>

      {/* Main carousel content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 md:px-8 py-8 md:py-12">
        {/* Carousel container */}
        <div className="w-full max-w-4xl">
          {/* Slide container */}
          <div className="relative min-h-[500px] md:min-h-[600px]">
            <AnimatePresence mode="wait">
              <PillarCard
                key={`pillar-${currentPillar.id}`}
                pillar={currentPillar}
                isActive={true}
                onExplore={handleExplorePillar}
                onLearnMore={handleLearnMore}
                index={currentIndex}
              />
            </AnimatePresence>
          </div>

          {/* Navigation section */}
          <div className="flex flex-col items-center justify-center gap-8 md:gap-10 mt-10 md:mt-12">
            {/* Progress dots */}
            <ProgressDots
              pillars={pillars}
              currentIndex={currentIndex}
              onNavigate={handleDotClick}
              ariaLabel="Navigate to pillar"
            />

            {/* Navigation arrows */}
            <NavigationArrows
              onPrevious={handlePrevious}
              onNext={handleNext}
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
              ariaLabel="Navigate carousel"
            />

            {/* Keyboard hint */}
            <p className="text-xs md:text-sm text-[#948D82] text-center">
              Use as setas do teclado para navegar
            </p>
          </div>
        </div>
      </div>

      {/* Footer with completion CTA */}
      {isLastSlide && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative z-10 px-6 md:px-8 py-8 border-t border-gray-200 bg-white bg-opacity-50 backdrop-blur-sm"
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div>
              <p className="font-semibold text-[#5C554B] mb-2">
                Pronto para explorar?
              </p>
              <p className="text-sm text-[#948D82]">
                Você verá esses módulos novamente conforme progride
              </p>
            </div>
            <button
              onClick={handleComplete}
              className="whitespace-nowrap bg-gradient-to-r from-[#6B9EFF] to-[#845EF7] hover:from-[#5A8DE8] hover:to-[#7444E8] text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              aria-label="Complete tour and start"
            >
              Começar a Explorar
            </button>
          </div>
        </motion.div>
      )}

      {/* Slide counter for accessibility */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Slide {currentIndex + 1} de {pillars.length}: {currentPillar.name}
      </div>

      {/* Pillar details modal */}
      <PillarDetails
        pillar={selectedPillar}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onStart={handleStartPillar}
      />
    </div>
  );
}
