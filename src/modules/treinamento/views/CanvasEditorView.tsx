/**
 * CanvasEditorView - Workout canvas editor (mockup)
 *
 * Visual mockup of 12-week training block editor.
 * Phase 1: Static layout, no drag-and-drop.
 * Phase 2: Will integrate @dnd-kit for interactive canvas.
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSwimFlux } from '../context/SwimFluxContext';
import { MOCK_WORKOUT_BLOCKS, getMockAthleteById } from '../mockData';
import { ArrowLeft, Save, Grid, List, Plus, GripVertical } from 'lucide-react';

export default function CanvasEditorView() {
  const navigate = useNavigate();
  const { blockId } = useParams<{ blockId: string }>();
  const { actions } = useSwimFlux();

  // View toggle
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch block data (mock)
  const block = MOCK_WORKOUT_BLOCKS.find((b) => b.id === blockId);
  const athlete = block ? getMockAthleteById(block.athlete_id) : null;

  // Handle back
  const handleBack = () => {
    if (athlete) {
      actions.viewAthleteDetail(athlete.id);
      navigate(`/swimflux/athlete/${athlete.id}`);
    } else {
      actions.viewDashboard();
      navigate('/swimflux');
    }
  };

  // Handle save (mock)
  const handleSave = () => {
    alert('Salvar treino (em desenvolvimento)');
  };

  // Not found
  if (!block || !athlete) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-4">
          Bloco de treino não encontrado
        </p>
        <button
          onClick={() => navigate('/swimflux')}
          className="px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  // Mock weeks data
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
      {/* Header */}
      <div className="pt-8 px-6 pb-6">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        {/* Block Info */}
        <div className="ceramic-card p-4 mb-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-1">
                Editando Bloco
              </p>
              <h1 className="text-2xl font-black text-ceramic-text-primary mb-2">
                {block.title}
              </h1>
              <p className="text-sm text-ceramic-text-secondary">
                Atleta: <span className="font-bold">{athlete.name}</span>
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-ceramic-success hover:bg-ceramic-success/90 text-white rounded-lg font-bold transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-ceramic-text-secondary/10 text-xs text-ceramic-text-secondary">
            <div>
              <span className="font-medium">Início:</span>{' '}
              {new Date(block.start_date).toLocaleDateString('pt-BR')}
            </div>
            <div>
              <span className="font-medium">Fim:</span>{' '}
              {new Date(block.end_date).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all
              ${viewMode === 'grid'
                ? 'bg-ceramic-info text-white'
                : 'ceramic-card text-ceramic-text-secondary hover:scale-105'
              }
            `}
          >
            <Grid className="w-4 h-4" />
            Grade
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all
              ${viewMode === 'list'
                ? 'bg-ceramic-info text-white'
                : 'ceramic-card text-ceramic-text-secondary hover:scale-105'
              }
            `}
          >
            <List className="w-4 h-4" />
            Lista
          </button>
        </div>
      </div>

      {/* Canvas Grid View */}
      {viewMode === 'grid' && (
        <div className="px-6 space-y-4">
          <div className="ceramic-inset p-8 rounded-xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto ceramic-card flex items-center justify-center">
                <Grid className="w-8 h-8 text-ceramic-text-secondary" />
              </div>
              <div>
                <p className="text-lg font-bold text-ceramic-text-primary mb-2">
                  Canvas em Desenvolvimento
                </p>
                <p className="text-sm text-ceramic-text-secondary font-light max-w-md mx-auto">
                  A visualização em grade com drag-and-drop será implementada na Fase 2
                  usando @dnd-kit. Por enquanto, use a visualização em lista abaixo.
                </p>
              </div>
              <button
                onClick={() => setViewMode('list')}
                className="px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
              >
                Ver Lista de Semanas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="px-6 space-y-4">
          {weeks.map((weekNumber) => (
            <div key={weekNumber} className="ceramic-card p-4 space-y-3">
              {/* Week Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="ceramic-inset p-2">
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      S{weekNumber}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider">
                      Semana {weekNumber}
                    </p>
                    <p className="text-sm font-bold text-ceramic-text-primary">
                      {weekNumber <= 4
                        ? 'Base Aeróbica'
                        : weekNumber <= 8
                        ? 'Intensidade Moderada'
                        : 'Alta Performance'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Editar Semana ${weekNumber}`)}
                  className="ceramic-card p-2 hover:scale-105 transition-transform"
                >
                  <Plus className="w-4 h-4 text-ceramic-text-primary" />
                </button>
              </div>

              {/* Placeholder Workouts */}
              <div className="space-y-2 pt-2 border-t border-ceramic-text-secondary/10">
                {[1, 2, 3].map((dayIndex) => (
                  <div
                    key={dayIndex}
                    className="flex items-center gap-3 p-3 ceramic-inset rounded-lg group cursor-pointer hover:scale-[1.02] transition-transform"
                  >
                    <GripVertical className="w-4 h-4 text-ceramic-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1">
                      <p className="text-xs text-ceramic-text-secondary">
                        Dia {dayIndex}
                      </p>
                      <p className="text-sm font-bold text-ceramic-text-primary">
                        Treino Placeholder {dayIndex}
                      </p>
                    </div>
                    <div className="text-xs text-ceramic-text-secondary">
                      ~60 min
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Workout Button */}
              <button
                onClick={() => alert(`Adicionar treino na Semana ${weekNumber}`)}
                className="w-full py-2 ceramic-card text-xs font-bold text-ceramic-text-secondary hover:text-ceramic-text-primary hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Treino
              </button>
            </div>
          ))}

          {/* Empty State for Week */}
          <div className="ceramic-inset p-8 rounded-xl text-center space-y-3">
            <div className="w-12 h-12 mx-auto ceramic-card flex items-center justify-center">
              <Plus className="w-6 h-6 text-ceramic-text-secondary" />
            </div>
            <p className="text-sm text-ceramic-text-secondary font-light">
              Clique em qualquer semana para adicionar treinos
            </p>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-ceramic-base border-t border-ceramic-text-secondary/10 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex-1 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-ceramic-success hover:bg-ceramic-success/90 text-white rounded-lg text-sm font-bold transition-colors"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
