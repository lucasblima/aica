/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * TiersSlide - Cotas de patrocinio
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, TiersSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';

export function TiersSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<TiersSlideContent>) {
  const handleChange = (field: keyof TiersSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleTierChange = (index: number, field: string, value: any) => {
    const newTiers = [...content.tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    handleChange('tiers', newTiers);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: content.currency || 'BRL',
    }).format(value);
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
          placeholder="Cotas de Patrocinio"
        />
      </div>

      {/* Tiers grid */}
      <div className="grid grid-cols-3 gap-8">
        {content.tiers.map((tier, index) => (
          <div
            key={tier.id}
            className={`tier-card ${tier.isHighlighted ? 'highlighted' : ''}`}
          >
            {/* Tier name */}
            <EditableText
              value={tier.name}
              onChange={(v) => handleTierChange(index, 'name', v)}
              tag="h2"
              className="mb-4"
              editMode={editMode}
              placeholder="Nome da Cota"
            />

            {/* Value */}
            <div className="mb-6">
              <EditableText
                value={formatCurrency(tier.value)}
                onChange={(v) => {
                  const numValue = parseFloat(v.replace(/[^0-9.-]+/g, ''));
                  handleTierChange(index, 'value', isNaN(numValue) ? 0 : numValue);
                }}
                tag="p"
                className="text-4xl font-bold accent"
                editMode={editMode}
                placeholder="R$ 0,00"
              />
            </div>

            {/* Availability */}
            <div className="mb-6 text-center">
              <p className="text-sm opacity-70">
                <EditableText
                  value={tier.quantityAvailable.toString()}
                  onChange={(v) => handleTierChange(index, 'quantityAvailable', parseInt(v) || 0)}
                  tag="span"
                  className="font-semibold"
                  editMode={editMode}
                  placeholder="0"
                />
                {' / '}
                <EditableText
                  value={tier.quantityTotal.toString()}
                  onChange={(v) => handleTierChange(index, 'quantityTotal', parseInt(v) || 0)}
                  tag="span"
                  editMode={editMode}
                  placeholder="0"
                />
                {' cotas disponiveis'}
              </p>
            </div>

            {/* Deliverables */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-3 opacity-70">CONTRAPARTIDAS</h3>
              <ul className="space-y-2 text-sm">
                {tier.deliverables.map((deliverable, dIndex) => (
                  <li key={dIndex} className="flex items-start gap-2">
                    <span className="accent">✓</span>
                    <EditableText
                      value={deliverable}
                      onChange={(v) => {
                        const newDeliverables = [...tier.deliverables];
                        newDeliverables[dIndex] = v;
                        handleTierChange(index, 'deliverables', newDeliverables);
                      }}
                      tag="span"
                      className="flex-1"
                      editMode={editMode}
                      placeholder={`Contrapartida ${dIndex + 1}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TiersSlide;
