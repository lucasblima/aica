/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * CoverSlide - Capa com logo e título
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, CoverSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';

export function CoverSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<CoverSlideContent>) {
  const handleChange = (field: keyof CoverSlideContent, value: string) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-24 relative">
      {/* Background image */}
      {content.backgroundUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${content.backgroundUrl})` }}
        />
      )}

      <div className="relative z-10 text-center max-w-5xl">
        {/* Logo */}
        {content.logoUrl && (
          <div className="mb-12">
            <img
              src={content.logoUrl}
              alt="Logo"
              className="h-32 mx-auto object-contain"
            />
          </div>
        )}

        {/* Title */}
        <EditableText
          value={content.title}
          onChange={(v) => handleChange('title', v)}
          tag="h1"
          editMode={editMode}
          placeholder="Título do Projeto"
        />

        {/* Subtitle */}
        <EditableText
          value={content.subtitle}
          onChange={(v) => handleChange('subtitle', v)}
          tag="h2"
          className="mt-6"
          editMode={editMode}
          placeholder="Subtitulo"
        />

        {/* Tagline */}
        {(content.tagline || editMode) && (
          <EditableText
            value={content.tagline || ''}
            onChange={(v) => handleChange('tagline', v)}
            tag="p"
            className="mt-8 text-2xl"
            editMode={editMode}
            placeholder="Tagline opcional"
          />
        )}

        {/* Approval number */}
        {(content.approvalNumber || editMode) && (
          <div className="mt-16">
            <EditableText
              value={content.approvalNumber || ''}
              onChange={(v) => handleChange('approvalNumber', v)}
              tag="p"
              className="text-xl opacity-70"
              editMode={editMode}
              placeholder="Número de aprovacao"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default CoverSlide;
