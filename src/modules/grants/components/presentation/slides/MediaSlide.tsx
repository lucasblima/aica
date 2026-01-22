/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * MediaSlide - Galeria de imagens/videos
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, MediaSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';
import { Image as ImageIcon, Video } from 'lucide-react';

export function MediaSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<MediaSlideContent>) {
  const handleChange = (field: keyof MediaSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...content.items];
    newItems[index] = { ...newItems[index], [field]: value };
    handleChange('items', newItems);
  };

  return (
    <div className="w-full h-full p-24">
      {/* Header */}
      <div className="mb-12">
        <EditableText
          value={content.title}
          onChange={(v) => handleChange('title', v)}
          tag="h1"
          editMode={editMode}
          placeholder="Galeria"
        />
        {(content.description || editMode) && (
          <EditableText
            value={content.description || ''}
            onChange={(v) => handleChange('description', v)}
            tag="p"
            className="mt-4 text-xl"
            editMode={editMode}
            placeholder="Descricao da galeria"
            multiline
          />
        )}
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-3 gap-6">
        {content.items.map((item, index) => (
          <div key={index} className="relative">
            {item.type === 'image' ? (
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                {item.url ? (
                  <img
                    src={item.url}
                    alt={item.caption || `Media ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.caption || `Video ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Video className="w-16 h-16 text-gray-400" />
                )}
              </div>
            )}
            {(item.caption || editMode) && (
              <EditableText
                value={item.caption || ''}
                onChange={(v) => handleItemChange(index, 'caption', v)}
                tag="p"
                className="mt-2 text-sm text-center opacity-70"
                editMode={editMode}
                placeholder="Legenda"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MediaSlide;
