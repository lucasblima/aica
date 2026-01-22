/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * TestimonialsSlide - Depoimentos com fotos
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, TestimonialsSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';
import { Quote } from 'lucide-react';

export function TestimonialsSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<TestimonialsSlideContent>) {
  const handleChange = (field: keyof TestimonialsSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleTestimonialChange = (index: number, field: string, value: any) => {
    const newTestimonials = [...content.testimonials];
    newTestimonials[index] = { ...newTestimonials[index], [field]: value };
    handleChange('testimonials', newTestimonials);
  };

  return (
    <div className="w-full h-full p-24">
      {/* Header */}
      <div className="text-center mb-16">
        <EditableText
          value={content.title}
          onChange={(v) => handleChange('title', v)}
          tag="h1"
          editMode={editMode}
          placeholder="Depoimentos"
        />
      </div>

      {/* Testimonials grid */}
      <div className="space-y-8">
        {content.testimonials.map((testimonial, index) => (
          <div key={index} className="card">
            <div className="flex gap-8">
              {/* Photo */}
              <div className="flex-shrink-0">
                {testimonial.photoUrl ? (
                  <img
                    src={testimonial.photoUrl}
                    alt={testimonial.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Quote and info */}
              <div className="flex-1">
                <Quote className="w-12 h-12 opacity-20 mb-4" />
                <EditableText
                  value={testimonial.quote}
                  onChange={(v) => handleTestimonialChange(index, 'quote', v)}
                  tag="p"
                  className="text-2xl italic mb-6"
                  editMode={editMode}
                  placeholder="Depoimento aqui..."
                  multiline
                />
                <div>
                  <EditableText
                    value={testimonial.name}
                    onChange={(v) => handleTestimonialChange(index, 'name', v)}
                    tag="p"
                    className="font-bold text-xl"
                    editMode={editMode}
                    placeholder="Nome"
                  />
                  <EditableText
                    value={testimonial.role}
                    onChange={(v) => handleTestimonialChange(index, 'role', v)}
                    tag="p"
                    className="opacity-70"
                    editMode={editMode}
                    placeholder="Cargo"
                  />
                  {(testimonial.organization || editMode) && (
                    <EditableText
                      value={testimonial.organization || ''}
                      onChange={(v) => handleTestimonialChange(index, 'organization', v)}
                      tag="p"
                      className="opacity-70"
                      editMode={editMode}
                      placeholder="Organizacao"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestimonialsSlide;
