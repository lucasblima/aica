/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * SlideCanvas - Main slide viewport component
 * Issue #117 - Presentation Generator
 *
 * Renders slides in a 1920x1080 viewport with zoom controls and
 * navigation between slides.
 */

import React, { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import type {
  SlideCanvasProps,
  SlideContent,
} from '@/modules/grants/types/presentation';
import { SLIDE_DIMENSIONS, ZOOM_LEVELS } from '@/modules/grants/types/presentation';
import { TEMPLATE_STYLES } from '../templates';

// Import slide components (will be created next)
import { CoverSlide } from '../slides/CoverSlide';
import { OrganizationSlide } from '../slides/OrganizationSlide';
import { ProjectSlide } from '../slides/ProjectSlide';
import { ImpactMetricsSlide } from '../slides/ImpactMetricsSlide';
import { TimelineSlide } from '../slides/TimelineSlide';
import { TeamSlide } from '../slides/TeamSlide';
import { IncentiveLawSlide } from '../slides/IncentiveLawSlide';
import { TiersSlide } from '../slides/TiersSlide';
import { TestimonialsSlide } from '../slides/TestimonialsSlide';
import { MediaSlide } from '../slides/MediaSlide';
import { ComparisonSlide } from '../slides/ComparisonSlide';
import { ContactSlide } from '../slides/ContactSlide';

export function SlideCanvas({
  slides,
  currentSlideIndex,
  template,
  zoom,
  onSlideChange,
  onZoomChange,
  editMode = false,
  onSlideUpdate,
}: SlideCanvasProps) {
  const currentSlide = slides[currentSlideIndex];

  // Calculate zoom levels
  const currentZoomIndex = ZOOM_LEVELS.indexOf(zoom);
  const canZoomIn = currentZoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = currentZoomIndex > 0;

  // Navigation
  const canGoPrev = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < slides.length - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onSlideChange(currentSlideIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onSlideChange(currentSlideIndex + 1);
    }
  };

  const handleZoomIn = () => {
    if (canZoomIn) {
      onZoomChange(ZOOM_LEVELS[currentZoomIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    if (canZoomOut) {
      onZoomChange(ZOOM_LEVELS[currentZoomIndex - 1]);
    }
  };

  const handleZoomFit = () => {
    onZoomChange(1);
  };

  // Handle slide content update
  const handleContentChange = (content: SlideContent) => {
    if (onSlideUpdate && currentSlide) {
      onSlideUpdate(currentSlide.id, content);
    }
  };

  // Render current slide based on type
  const renderSlide = useMemo(() => {
    if (!currentSlide) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-ceramic-base dark:bg-ceramic-base">
          <p className="text-ceramic-text-secondary dark:text-ceramic-text-secondary">Nenhum slide selecionado</p>
        </div>
      );
    }

    const slideProps = {
      content: currentSlide.content as any,
      template,
      editMode,
      onChange: handleContentChange,
    };

    switch (currentSlide.slideType) {
      case 'cover':
        return <CoverSlide {...slideProps} />;
      case 'organization':
        return <OrganizationSlide {...slideProps} />;
      case 'project':
        return <ProjectSlide {...slideProps} />;
      case 'impact-metrics':
        return <ImpactMetricsSlide {...slideProps} />;
      case 'timeline':
        return <TimelineSlide {...slideProps} />;
      case 'team':
        return <TeamSlide {...slideProps} />;
      case 'incentive-law':
        return <IncentiveLawSlide {...slideProps} />;
      case 'tiers':
        return <TiersSlide {...slideProps} />;
      case 'testimonials':
        return <TestimonialsSlide {...slideProps} />;
      case 'media':
        return <MediaSlide {...slideProps} />;
      case 'comparison':
        return <ComparisonSlide {...slideProps} />;
      case 'contact':
        return <ContactSlide {...slideProps} />;
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-ceramic-base">
            <p className="text-ceramic-text-secondary">Tipo de slide desconhecido: {currentSlide.slideType}</p>
          </div>
        );
    }
  }, [currentSlide, template, editMode]);

  return (
    <div className="flex flex-col h-full bg-ceramic-base dark:bg-ceramic-base">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-ceramic-base dark:bg-ceramic-base border-b border-ceramic-border dark:border-ceramic-border">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="p-2 rounded-lg hover:bg-ceramic-base dark:hover:bg-ceramic-cool disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Slide anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-ceramic-text-primary dark:text-ceramic-text-secondary min-w-[80px] text-center">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className="p-2 rounded-lg hover:bg-ceramic-base dark:hover:bg-ceramic-cool disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Próximo slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={!canZoomOut}
            className="p-2 rounded-lg hover:bg-ceramic-base dark:hover:bg-ceramic-cool disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomFit}
            className="px-3 py-1 rounded-lg hover:bg-ceramic-base dark:hover:bg-ceramic-cool transition-colors"
            title="Ajustar ao tamanho"
          >
            <span className="text-sm font-medium text-ceramic-text-primary dark:text-ceramic-text-secondary">
              {Math.round(zoom * 100)}%
            </span>
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={!canZoomIn}
            className="p-2 rounded-lg hover:bg-ceramic-base dark:hover:bg-ceramic-cool disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomFit}
            className="p-2 rounded-lg hover:bg-ceramic-base dark:hover:bg-ceramic-cool transition-colors ml-2"
            title="Tela cheia"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide viewport */}
      <div className="flex-1 overflow-auto p-8">
        <div className="flex items-center justify-center min-h-full">
          <div
            className={`${TEMPLATE_STYLES[template]} bg-ceramic-base shadow-2xl`}
            style={{
              width: SLIDE_DIMENSIONS.width,
              height: SLIDE_DIMENSIONS.height,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
            }}
          >
            <div className="slide w-full h-full overflow-hidden relative">
              {renderSlide}
            </div>
          </div>
        </div>
      </div>

      {/* Slide thumbnails */}
      <div className="px-4 py-3 bg-ceramic-base dark:bg-ceramic-base border-t border-ceramic-border dark:border-ceramic-border overflow-x-auto">
        <div className="flex gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => onSlideChange(index)}
              className={`
                flex-shrink-0 w-32 h-18 rounded-lg border-2 transition-all overflow-hidden
                ${index === currentSlideIndex
                  ? 'border-amber-500 ring-2 ring-amber-500/30'
                  : 'border-ceramic-border dark:border-ceramic-border hover:border-amber-300'
                }
              `}
            >
              <div className="w-full h-full bg-ceramic-base dark:bg-ceramic-cool flex items-center justify-center relative">
                <span className="text-xs font-medium text-ceramic-text-secondary dark:text-ceramic-text-secondary">
                  {index + 1}
                </span>
                <span className="absolute bottom-1 left-1 right-1 text-xs text-ceramic-text-secondary dark:text-ceramic-text-secondary truncate text-center">
                  {slide.slideType}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SlideCanvas;
