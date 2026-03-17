/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * IncentiveLawSlide - Beneficios da Lei de Incentivo
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, IncentiveLawSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';

export function IncentiveLawSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<IncentiveLawSlideContent>) {
  const handleChange = (field: keyof IncentiveLawSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...content.benefits];
    newBenefits[index] = value;
    handleChange('benefits', newBenefits);
  };

  return (
    <div className="w-full h-full p-24">
      {/* Header */}
      <div className="text-center mb-16">
        <EditableText
          value={content.lawName}
          onChange={(v) => handleChange('lawName', v)}
          tag="h1"
          editMode={editMode}
          placeholder="Nome da Lei"
        />
        <EditableText
          value={content.lawShortName}
          onChange={(v) => handleChange('lawShortName', v)}
          tag="p"
          className="text-2xl mt-4 opacity-70"
          editMode={editMode}
          placeholder="Sigla"
        />
      </div>

      {/* Key info cards */}
      <div className="grid grid-cols-3 gap-8 mb-12">
        <div className="card text-center">
          <h3 className="mb-4">Jurisdicao</h3>
          <EditableText
            value={content.jurisdiction}
            onChange={(v) => handleChange('jurisdiction', v)}
            tag="p"
            className="text-2xl font-semibold"
            editMode={editMode}
            placeholder="Federal/Estadual/Municipal"
          />
        </div>

        <div className="card text-center">
          <h3 className="mb-4">Tipo de Imposto</h3>
          <EditableText
            value={content.taxType}
            onChange={(v) => handleChange('taxType', v)}
            tag="p"
            className="text-2xl font-semibold"
            editMode={editMode}
            placeholder="IR/ICMS/ISS"
          />
        </div>

        <div className="card text-center">
          <h3 className="mb-4">Deducao</h3>
          <div className="highlight inline-block">
            <EditableText
              value={`${content.deductionPercentage}%`}
              onChange={(v) => handleChange('deductionPercentage', parseInt(v.replace('%', '')) || 0)}
              tag="span"
              className="text-3xl font-bold"
              editMode={editMode}
              placeholder="100%"
            />
          </div>
        </div>
      </div>

      {/* Additional info */}
      <div className="grid grid-cols-2 gap-8 mb-12">
        {(content.approvalNumber || editMode) && (
          <div className="card">
            <h3 className="mb-2">Número de Aprovacao</h3>
            <EditableText
              value={content.approvalNumber || ''}
              onChange={(v) => handleChange('approvalNumber', v)}
              tag="p"
              className="font-mono text-xl"
              editMode={editMode}
              placeholder="00-000000/0000"
            />
          </div>
        )}
        {(content.validityPeriod || editMode) && (
          <div className="card">
            <h3 className="mb-2">Período de Validade</h3>
            <EditableText
              value={content.validityPeriod || ''}
              onChange={(v) => handleChange('validityPeriod', v)}
              tag="p"
              className="text-xl"
              editMode={editMode}
              placeholder="01/2024 - 12/2024"
            />
          </div>
        )}
      </div>

      {/* Benefits */}
      <div>
        <h2 className="mb-6">Beneficios para o Patrocinador</h2>
        <ul className="grid grid-cols-2 gap-4">
          {content.benefits.map((benefit, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="accent text-2xl">✓</span>
              <EditableText
                value={benefit}
                onChange={(v) => handleBenefitChange(index, v)}
                tag="span"
                className="flex-1"
                editMode={editMode}
                placeholder={`Beneficio ${index + 1}`}
                multiline
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default IncentiveLawSlide;
