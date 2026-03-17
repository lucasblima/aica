/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * ComparisonSlide - Tabela comparativa
 * Issue #117 - Presentation Generator
 */

import React from 'react';
import type { BaseSlideProps, ComparisonSlideContent } from '@/modules/grants/types/presentation';
import { EditableText } from '../canvas/EditableText';
import { Check, X } from 'lucide-react';

export function ComparisonSlide({
  content,
  template,
  editMode = false,
  onChange,
}: BaseSlideProps<ComparisonSlideContent>) {
  const handleChange = (field: keyof ComparisonSlideContent, value: any) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...content.columnHeaders];
    newHeaders[index] = value;
    handleChange('columnHeaders', newHeaders);
  };

  const handleRowLabelChange = (rowIndex: number, value: string) => {
    const newRows = [...content.rows];
    newRows[rowIndex] = { ...newRows[rowIndex], label: value };
    handleChange('rows', newRows);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: any) => {
    const newRows = [...content.rows];
    const newValues = [...newRows[rowIndex].values];
    newValues[colIndex] = value;
    newRows[rowIndex] = { ...newRows[rowIndex], values: newValues };
    handleChange('rows', newRows);
  };

  const renderCellValue = (value: string | number | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-8 h-8 text-ceramic-success mx-auto" />
      ) : (
        <X className="w-8 h-8 text-ceramic-error mx-auto" />
      );
    }
    return value;
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
          placeholder="Tabela Comparativa"
        />
        {(content.description || editMode) && (
          <EditableText
            value={content.description || ''}
            onChange={(v) => handleChange('description', v)}
            tag="p"
            className="mt-4 text-xl"
            editMode={editMode}
            placeholder="Descrição da comparacao"
            multiline
          />
        )}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="w-1/4"></th>
              {content.columnHeaders.map((header, index) => (
                <th key={index}>
                  <EditableText
                    value={header}
                    onChange={(v) => handleHeaderChange(index, v)}
                    tag="span"
                    editMode={editMode}
                    placeholder={`Coluna ${index + 1}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="font-semibold">
                  <EditableText
                    value={row.label}
                    onChange={(v) => handleRowLabelChange(rowIndex, v)}
                    tag="span"
                    editMode={editMode}
                    placeholder={`Linha ${rowIndex + 1}`}
                  />
                </td>
                {row.values.map((value, colIndex) => (
                  <td key={colIndex} className="text-center">
                    {typeof value === 'boolean' ? (
                      renderCellValue(value)
                    ) : (
                      <EditableText
                        value={value.toString()}
                        onChange={(v) => handleCellChange(rowIndex, colIndex, v)}
                        tag="span"
                        editMode={editMode}
                        placeholder="-"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ComparisonSlide;
