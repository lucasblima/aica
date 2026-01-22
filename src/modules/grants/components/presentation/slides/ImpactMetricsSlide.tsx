/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * ImpactMetricsSlide - Metricas e numeros de impacto
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, ImpactMetricsSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';

export function ImpactMetricsSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<ImpactMetricsSlideContent>) {
  const handleChange = (field: keyof ImpactMetricsSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleMetricChange = (index: number, field: string, value: any) => {
    const newMetrics = [...content.metrics];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    handleChange('metrics', newMetrics);
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
          placeholder="Titulo do Slide"
        />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-8 mb-12">
        {content.metrics.map((metric, index) => (
          <div key={index} className="metric">
            {metric.icon && (
              <div className="text-6xl mb-4">{metric.icon}</div>
            )}
            <div className="metric-value">
              <EditableText
                value={metric.value.toString()}
                onChange={(v) => handleMetricChange(index, 'value', v)}
                tag="span"
                editMode={editMode}
                placeholder="0"
              />
              {metric.unit && (
                <EditableText
                  value={metric.unit}
                  onChange={(v) => handleMetricChange(index, 'unit', v)}
                  tag="span"
                  className="metric-unit ml-2"
                  editMode={editMode}
                  placeholder="unidade"
                />
              )}
            </div>
            <div className="metric-label">
              <EditableText
                value={metric.label}
                onChange={(v) => handleMetricChange(index, 'label', v)}
                tag="span"
                editMode={editMode}
                placeholder="Label da metrica"
              />
            </div>
            {(metric.description || editMode) && (
              <EditableText
                value={metric.description || ''}
                onChange={(v) => handleMetricChange(index, 'description', v)}
                tag="p"
                className="mt-2 text-sm opacity-70"
                editMode={editMode}
                placeholder="Descricao opcional"
                multiline
              />
            )}
          </div>
        ))}
      </div>

      {/* Impact statement */}
      {(content.impactStatement || editMode) && (
        <div className="text-center mt-12">
          <EditableText
            value={content.impactStatement || ''}
            onChange={(v) => handleChange('impactStatement', v)}
            tag="p"
            className="text-3xl font-semibold"
            editMode={editMode}
            placeholder="Declaracao de impacto"
            multiline
          />
        </div>
      )}
    </div>
  );
}

export default ImpactMetricsSlide;
