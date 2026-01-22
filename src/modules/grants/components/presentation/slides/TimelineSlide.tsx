/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * TimelineSlide - Linha do tempo / cronograma
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, TimelineSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';

export function TimelineSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<TimelineSlideContent>) {
  const handleChange = (field: keyof TimelineSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleEventChange = (index: number, field: string, value: any) => {
    const newEvents = [...content.events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    handleChange('events', newEvents);
  };

  return (
    <div className="w-full h-full p-24">
      {/* Header */}
      <div className="mb-16">
        <EditableText
          value={content.title}
          onChange={(v) => handleChange('title', v)}
          tag="h1"
          editMode={editMode}
          placeholder="Titulo da Timeline"
        />
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {content.events.map((event, index) => (
          <div
            key={index}
            className={`timeline-item ${event.isHighlighted ? 'highlighted' : ''}`}
          >
            <div className="flex items-start gap-6">
              <EditableText
                value={event.date}
                onChange={(v) => handleEventChange(index, 'date', v)}
                tag="p"
                className="font-bold text-2xl flex-shrink-0 w-48"
                editMode={editMode}
                placeholder="Data"
              />
              <div className="flex-1">
                <EditableText
                  value={event.title}
                  onChange={(v) => handleEventChange(index, 'title', v)}
                  tag="h3"
                  editMode={editMode}
                  placeholder="Titulo do evento"
                />
                {(event.description || editMode) && (
                  <EditableText
                    value={event.description || ''}
                    onChange={(v) => handleEventChange(index, 'description', v)}
                    tag="p"
                    className="mt-2 opacity-80"
                    editMode={editMode}
                    placeholder="Descricao do evento"
                    multiline
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TimelineSlide;
