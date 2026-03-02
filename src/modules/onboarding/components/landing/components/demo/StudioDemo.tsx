import { useState } from 'react';
import { studioDemo } from '../../data/demoData';

const STATUS_STYLES = {
  completed: 'bg-ceramic-success text-white',
  active: 'bg-amber-500 text-white ring-4 ring-amber-200',
  pending: 'bg-ceramic-cool text-ceramic-text-secondary',
};

const STATUS_LINE = {
  completed: 'bg-ceramic-success',
  active: 'bg-amber-300',
  pending: 'bg-ceramic-border',
};

export function StudioDemo() {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const { episodeTitle, guestName, phases } = studioDemo;

  const selectedDetail = phases.find((p) => p.id === selectedPhase);

  return (
    <div className="space-y-4">
      {/* Episode info */}
      <div className="text-center">
        <p className="text-sm font-semibold text-ceramic-text-primary">
          {episodeTitle}
        </p>
        <p className="text-xs text-ceramic-text-secondary">
          Convidada: {guestName}
        </p>
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-center gap-0 px-2">
        {phases.map((phase, idx) => (
          <div key={phase.id} className="flex items-center">
            {/* Circle */}
            <button
              type="button"
              onClick={() =>
                setSelectedPhase((prev) => (prev === phase.id ? null : phase.id))
              }
              className={`relative w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 transition-transform hover:scale-110 cursor-pointer ${
                STATUS_STYLES[phase.status]
              } ${selectedPhase === phase.id ? 'scale-110' : ''}`}
              title={phase.label}
            >
              {phase.icon}
            </button>

            {/* Connecting line */}
            {idx < phases.length - 1 && (
              <div
                className={`h-0.5 w-6 md:w-10 ${STATUS_LINE[phase.status]}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Phase labels */}
      <div className="flex justify-center gap-0 px-2">
        {phases.map((phase, idx) => (
          <div key={phase.id} className="flex items-center">
            <div className="w-10 text-center">
              <span className="text-[9px] text-ceramic-text-secondary leading-tight">
                {phase.label}
              </span>
            </div>
            {idx < phases.length - 1 && <div className="w-6 md:w-10" />}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selectedDetail && (
        <div className="bg-ceramic-cool/30 rounded-xl p-3 text-center">
          <p className="text-sm font-medium text-ceramic-text-primary">
            {selectedDetail.icon} {selectedDetail.label}
          </p>
          <p className="text-xs text-ceramic-text-secondary mt-1">
            {selectedDetail.status === 'completed' && 'Concluido com sucesso'}
            {selectedDetail.status === 'active' && 'Em andamento agora'}
            {selectedDetail.status === 'pending' && 'Aguardando etapas anteriores'}
          </p>
        </div>
      )}
    </div>
  );
}
