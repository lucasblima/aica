/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * OrganizationSlide - Sobre a organizacao
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, OrganizationSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';

export function OrganizationSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<OrganizationSlideContent>) {
  const handleChange = (field: keyof OrganizationSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleAchievementChange = (index: number, value: string) => {
    const newAchievements = [...content.achievements];
    newAchievements[index] = value;
    handleChange('achievements', newAchievements);
  };

  return (
    <div className="w-full h-full p-24">
      <div className="grid grid-cols-3 gap-12 h-full">
        {/* Left column - Logo and basic info */}
        <div className="flex flex-col items-center justify-center">
          {content.logoUrl && (
            <img
              src={content.logoUrl}
              alt={content.name}
              className="h-48 w-48 object-contain mb-8"
            />
          )}

          <EditableText
            value={content.name}
            onChange={(v) => handleChange('name', v)}
            tag="h2"
            className="text-center"
            editMode={editMode}
            placeholder="Nome da Organizacao"
          />

          {(content.foundedYear || editMode) && (
            <EditableText
              value={content.foundedYear?.toString() || ''}
              onChange={(v) => handleChange('foundedYear', parseInt(v) || undefined)}
              tag="p"
              className="mt-4 text-center opacity-70"
              editMode={editMode}
              placeholder="Ano de fundacao"
            />
          )}
        </div>

        {/* Middle column - Description and mission/vision */}
        <div className="col-span-2">
          <EditableText
            value={content.description}
            onChange={(v) => handleChange('description', v)}
            tag="p"
            className="mb-8 text-justify"
            editMode={editMode}
            placeholder="Descrição da organizacao..."
            multiline
          />

          {(content.mission || editMode) && (
            <div className="card mb-6">
              <h3 className="font-semibold mb-3">Missao</h3>
              <EditableText
                value={content.mission || ''}
                onChange={(v) => handleChange('mission', v)}
                tag="p"
                editMode={editMode}
                placeholder="Missao da organizacao..."
                multiline
              />
            </div>
          )}

          {(content.vision || editMode) && (
            <div className="card mb-6">
              <h3 className="font-semibold mb-3">Visao</h3>
              <EditableText
                value={content.vision || ''}
                onChange={(v) => handleChange('vision', v)}
                tag="p"
                editMode={editMode}
                placeholder="Visao da organizacao..."
                multiline
              />
            </div>
          )}

          {/* Achievements */}
          {content.achievements.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-4">Principais Conquistas</h3>
              <ul className="space-y-2">
                {content.achievements.map((achievement, index) => (
                  <li key={index}>
                    <EditableText
                      value={achievement}
                      onChange={(v) => handleAchievementChange(index, v)}
                      tag="span"
                      editMode={editMode}
                      placeholder={`Conquista ${index + 1}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrganizationSlide;
