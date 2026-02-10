/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * PresentationDemo - Demonstracao do sistema de apresentacoes
 * Issue #117 - Presentation Generator
 *
 * Componente de exemplo mostrando como usar o SlideCanvas e os slides.
 */

import React, { useState } from 'react';
import { SlideCanvas } from './canvas/SlideCanvas';
import type { DeckSlide, TemplateType, SlideContent } from '@/modules/grants/types/presentation';

// Mock data for demonstration
const DEMO_SLIDES: DeckSlide[] = [
  {
    id: '1',
    deckId: 'demo',
    slideType: 'cover',
    slideOrder: 0,
    content: {
      type: 'cover',
      title: 'Projeto Cultural 2024',
      subtitle: 'Transformando vidas atraves da arte',
      tagline: 'Uma iniciativa que faz a diferenca',
      approvalNumber: 'PRONAC 123456',
    },
    customCss: null,
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    deckId: 'demo',
    slideType: 'organization',
    slideOrder: 1,
    content: {
      type: 'organization',
      name: 'Instituto Cultural ABC',
      description: 'Organizacao dedicada a promover o acesso a cultura e educacao para todas as idades.',
      mission: 'Democratizar o acesso a cultura e arte.',
      vision: 'Ser referencia em projetos culturais transformadores.',
      achievements: [
        'Mais de 10.000 pessoas impactadas',
        '15 premios nacionais e internacionais',
        '20 anos de atuacao',
      ],
      foundedYear: 2004,
    },
    customCss: null,
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    deckId: 'demo',
    slideType: 'impact-metrics',
    slideOrder: 2,
    content: {
      type: 'impact-metrics',
      title: 'Nosso Impacto',
      metrics: [
        { label: 'Pessoas Beneficiadas', value: '10.000', icon: '👥' },
        { label: 'Eventos Realizados', value: '150', icon: '🎭' },
        { label: 'Cidades Alcancadas', value: '25', icon: '🏙️' },
      ],
      impactStatement: 'Transformando vidas atraves da cultura',
    },
    customCss: null,
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function PresentationDemo() {
  const [slides, setSlides] = useState<DeckSlide[]>(DEMO_SLIDES);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [template, setTemplate] = useState<TemplateType>('professional');
  const [zoom, setZoom] = useState(1);
  const [editMode, setEditMode] = useState(false);

  const handleSlideUpdate = (slideId: string, content: SlideContent) => {
    setSlides((prev) =>
      prev.map((slide) =>
        slide.id === slideId ? { ...slide, content } : slide
      )
    );
  };

  return (
    <div className="h-screen flex flex-col bg-ceramic-base">
      {/* Top controls */}
      <div className="px-6 py-4 bg-ceramic-base border-b border-ceramic-border flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ceramic-text-primary">
            Demo - Presentation Generator
          </h1>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            Issue #117 - Fase 2 implementada
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Template selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-ceramic-text-primary">
              Template:
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as TemplateType)}
              className="px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-base text-ceramic-text-primary"
            >
              <option value="professional">Professional</option>
              <option value="creative">Creative</option>
              <option value="institutional">Institutional</option>
            </select>
          </div>

          {/* Edit mode toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              editMode
                ? 'bg-amber-600 text-white'
                : 'bg-ceramic-cool text-ceramic-text-primary'
            }`}
          >
            {editMode ? 'Modo Edicao: ON' : 'Modo Edicao: OFF'}
          </button>
        </div>
      </div>

      {/* Slide canvas */}
      <div className="flex-1">
        <SlideCanvas
          slides={slides}
          currentSlideIndex={currentSlideIndex}
          template={template}
          zoom={zoom}
          onSlideChange={setCurrentSlideIndex}
          onZoomChange={setZoom}
          editMode={editMode}
          onSlideUpdate={handleSlideUpdate}
        />
      </div>
    </div>
  );
}

export default PresentationDemo;
