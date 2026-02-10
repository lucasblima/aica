/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * ProjectSlide - Detalhes do projeto
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, ProjectSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';

export function ProjectSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<ProjectSlideContent>) {
  const handleChange = (field: keyof ProjectSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleObjectiveChange = (index: number, value: string) => {
    const newObjectives = [...content.objectives];
    newObjectives[index] = value;
    handleChange('objectives', newObjectives);
  };

  return (
    <div className="w-full h-full p-24">
      {/* Header */}
      <div className="mb-12">
        <EditableText
          value={content.name}
          onChange={(v) => handleChange('name', v)}
          tag="h1"
          editMode={editMode}
          placeholder="Nome do Projeto"
        />

        <div className="flex gap-8 mt-6 text-ceramic-text-secondary dark:text-ceramic-text-secondary">
          {(content.duration || editMode) && (
            <EditableText
              value={content.duration || ''}
              onChange={(v) => handleChange('duration', v)}
              tag="p"
              editMode={editMode}
              placeholder="Duracao"
            />
          )}
          {(content.location || editMode) && (
            <EditableText
              value={content.location || ''}
              onChange={(v) => handleChange('location', v)}
              tag="p"
              editMode={editMode}
              placeholder="Local"
            />
          )}
          {(content.targetAudience || editMode) && (
            <EditableText
              value={content.targetAudience || ''}
              onChange={(v) => handleChange('targetAudience', v)}
              tag="p"
              editMode={editMode}
              placeholder="Publico-alvo"
            />
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <div className="card mb-8">
        <h2 className="mb-6">Resumo Executivo</h2>
        <EditableText
          value={content.executiveSummary}
          onChange={(v) => handleChange('executiveSummary', v)}
          tag="p"
          className="text-justify"
          editMode={editMode}
          placeholder="Resumo executivo do projeto..."
          multiline
        />
      </div>

      {/* Objectives */}
      <div>
        <h2 className="mb-6">Objetivos</h2>
        <div className="grid grid-cols-2 gap-6">
          {content.objectives.map((objective, index) => (
            <div key={index} className="card">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-600">
                    {index + 1}
                  </span>
                </div>
                <EditableText
                  value={objective}
                  onChange={(v) => handleObjectiveChange(index, v)}
                  tag="p"
                  editMode={editMode}
                  placeholder={`Objetivo ${index + 1}`}
                  multiline
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectSlide;
