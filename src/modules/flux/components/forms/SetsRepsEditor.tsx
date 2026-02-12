/**
 * SetsRepsEditor Component
 *
 * Editor for strength training exercise structure:
 * - Sets (number)
 * - Reps (number)
 * - Rest (seconds)
 * - Equipment (multi-select with autocomplete)
 * - Visual preview
 */

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ExerciseStructure } from '../../types/flow';

interface SetsRepsEditorProps {
  structure: ExerciseStructure | undefined;
  onChange: (structure: ExerciseStructure) => void;
}

const COMMON_EQUIPMENT = [
  'Halteres',
  'Barra',
  'Kettlebell',
  'Elásticos',
  'TRX',
  'Banco',
  'Bola Suíça',
  'Medicine Ball',
  'Peso Corporal',
  'Rolo de Espuma',
];

export default function SetsRepsEditor({ structure, onChange }: SetsRepsEditorProps) {
  const [equipmentInput, setEquipmentInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const sets = structure?.sets || 3;
  const reps = structure?.reps || 12;
  const rest = structure?.rest || 60;
  const equipment = structure?.equipment || [];

  const handleChange = (field: keyof ExerciseStructure, value: any) => {
    onChange({
      ...structure,
      [field]: value,
    });
  };

  const handleAddEquipment = (item: string) => {
    if (item && !equipment.includes(item)) {
      handleChange('equipment', [...equipment, item]);
    }
    setEquipmentInput('');
    setShowSuggestions(false);
  };

  const handleRemoveEquipment = (item: string) => {
    handleChange(
      'equipment',
      equipment.filter((e) => e !== item)
    );
  };

  const filteredSuggestions = COMMON_EQUIPMENT.filter(
    (item) =>
      item.toLowerCase().includes(equipmentInput.toLowerCase()) && !equipment.includes(item)
  );

  // Visual preview
  const preview = `${sets} × ${reps} repetições ${rest > 0 ? `(${rest}s descanso)` : ''}`;

  return (
    <div className="space-y-4">
      {/* Visual Preview */}
      <div className="p-3 ceramic-inset rounded-lg">
        <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider mb-1">
          Preview
        </p>
        <p className="text-lg font-bold text-ceramic-text-primary">{preview}</p>
      </div>

      {/* Sets */}
      <div>
        <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
          Séries <span className="text-ceramic-error">*</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleChange('sets', Math.max(1, sets - 1))}
            className="w-10 h-10 ceramic-inset hover:bg-white/50 rounded-lg font-bold text-ceramic-text-primary transition-colors"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max="20"
            value={sets}
            onChange={(e) => handleChange('sets', parseInt(e.target.value) || 1)}
            className="flex-1 px-3 py-2 text-center rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
          <button
            type="button"
            onClick={() => handleChange('sets', Math.min(20, sets + 1))}
            className="w-10 h-10 ceramic-inset hover:bg-white/50 rounded-lg font-bold text-ceramic-text-primary transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Reps */}
      <div>
        <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
          Repetições por Série <span className="text-ceramic-error">*</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleChange('reps', Math.max(1, reps - 1))}
            className="w-10 h-10 ceramic-inset hover:bg-white/50 rounded-lg font-bold text-ceramic-text-primary transition-colors"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max="100"
            value={reps}
            onChange={(e) => handleChange('reps', parseInt(e.target.value) || 1)}
            className="flex-1 px-3 py-2 text-center rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
          <button
            type="button"
            onClick={() => handleChange('reps', Math.min(100, reps + 1))}
            className="w-10 h-10 ceramic-inset hover:bg-white/50 rounded-lg font-bold text-ceramic-text-primary transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Rest */}
      <div>
        <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
          Descanso entre Séries (segundos)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="600"
            step="5"
            value={rest}
            onChange={(e) => handleChange('rest', parseInt(e.target.value) || 0)}
            className="flex-1 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
          <span className="text-sm text-ceramic-text-secondary">segundos</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {[30, 60, 90, 120].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => handleChange('rest', sec)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                rest === sec
                  ? 'bg-ceramic-accent text-white'
                  : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
          Equipamentos <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
        </label>

        {/* Equipment Input */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={equipmentInput}
              onChange={(e) => {
                setEquipmentInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Digite ou selecione..."
              className="flex-1 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
            <button
              type="button"
              onClick={() => handleAddEquipment(equipmentInput.trim())}
              disabled={!equipmentInput.trim()}
              className="px-3 py-2 rounded-lg bg-ceramic-accent text-white hover:bg-ceramic-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 ceramic-card max-h-48 overflow-y-auto">
              {filteredSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleAddEquipment(item)}
                  className="w-full px-3 py-2 text-left text-sm text-ceramic-text-primary hover:bg-white/50 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Equipment List */}
        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {equipment.map((item, index) => (
              <span
                key={index}
                className="flex items-center gap-1 px-3 py-1 bg-ceramic-cool rounded-lg text-sm font-medium text-ceramic-text-primary"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveEquipment(item)}
                  className="ml-1 hover:bg-ceramic-error/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3 text-ceramic-text-secondary hover:text-ceramic-error" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
