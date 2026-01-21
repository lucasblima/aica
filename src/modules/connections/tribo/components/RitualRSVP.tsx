import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { RitualOccurrence, RSVPStatus } from '../types';
import { useRSVP } from '../hooks/useRituals';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('RitualRSVP');

interface RitualRSVPProps {
  occurrence: RitualOccurrence;
  memberId: string;
  onClose?: () => void;
}

export const RitualRSVP: React.FC<RitualRSVPProps> = ({
  occurrence,
  memberId,
  onClose,
}) => {
  const rsvpMutation = useRSVP();
  const [notes, setNotes] = useState('');

  const userRSVP = occurrence.rsvpData[memberId];
  const occurrenceDate = new Date(occurrence.occurrenceDate);

  const handleRSVP = async (status: RSVPStatus) => {
    try {
      await rsvpMutation.mutateAsync({
        occurrenceId: occurrence.id,
        memberId,
        status,
      });

      if (onClose) {
        onClose();
      }
    } catch (error) {
      log.error('Error updating RSVP:', error);
    }
  };

  // Get RSVP stats
  const rsvpStats = Object.values(occurrence.rsvpData).reduce(
    (acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { yes: 0, no: 0, maybe: 0 } as Record<RSVPStatus, number>
  );

  const totalResponses = rsvpStats.yes + rsvpStats.no + rsvpStats.maybe;

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
      {/* Header */}
      <div className="p-6 border-b border-ceramic-100">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ceramic-900 mb-1">
              {occurrence.ritual?.name}
            </h2>
            <p className="text-sm text-ceramic-600">
              {format(occurrenceDate, "EEEE, d 'de' MMMM", { locale: ptBR })} •{' '}
              {format(occurrenceDate, 'HH:mm')}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-ceramic-400 hover:text-ceramic-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Location */}
        {occurrence.location && (
          <div className="flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <div className="text-sm font-medium text-ceramic-700">Local</div>
              <div className="text-ceramic-900">{occurrence.location}</div>
            </div>
          </div>
        )}

        {/* Notes */}
        {occurrence.notes && (
          <div className="flex items-start gap-3">
            <span className="text-xl">📝</span>
            <div>
              <div className="text-sm font-medium text-ceramic-700">Detalhes</div>
              <div className="text-ceramic-900">{occurrence.notes}</div>
            </div>
          </div>
        )}

        {/* Bring List */}
        {occurrence.bringList.length > 0 && (
          <div className="flex items-start gap-3">
            <span className="text-xl">🎒</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-ceramic-700 mb-2">
                O que levar
              </div>
              <div className="space-y-2">
                {occurrence.bringList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-ceramic-50 rounded-lg"
                  >
                    <span
                      className={`text-sm ${
                        item.completed ? 'line-through text-ceramic-500' : 'text-ceramic-900'
                      }`}
                    >
                      {item.item}
                    </span>
                    {item.assignedTo && (
                      <span className="text-xs text-[#9B4D3A] font-medium">
                        Atribuído
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RSVP Stats */}
        {totalResponses > 0 && (
          <div className="pt-4 border-t border-ceramic-100">
            <div className="text-sm font-medium text-ceramic-700 mb-3">
              Confirmações ({totalResponses})
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-ceramic-900">
                  {rsvpStats.yes} Vão
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-sm text-ceramic-900">
                  {rsvpStats.maybe} Talvez
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-ceramic-900">
                  {rsvpStats.no} Não vão
                </span>
              </div>
            </div>
          </div>
        )}

        {/* User Notes */}
        <div>
          <label className="block text-sm font-medium text-ceramic-700 mb-2">
            Observações (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alguma informação adicional?"
            className="w-full px-3 py-2 border border-ceramic-200 rounded-lg focus:ring-2 focus:ring-[#9B4D3A]/20 focus:border-[#9B4D3A] transition-colors resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* RSVP Buttons */}
      <div className="p-6 border-t border-ceramic-100 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleRSVP('yes')}
            disabled={rsvpMutation.isPending}
            className={`py-3 rounded-xl font-medium text-sm transition-all ${
              userRSVP === 'yes'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            ✓ Vou
          </button>
          <button
            onClick={() => handleRSVP('maybe')}
            disabled={rsvpMutation.isPending}
            className={`py-3 rounded-xl font-medium text-sm transition-all ${
              userRSVP === 'maybe'
                ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            ? Talvez
          </button>
          <button
            onClick={() => handleRSVP('no')}
            disabled={rsvpMutation.isPending}
            className={`py-3 rounded-xl font-medium text-sm transition-all ${
              userRSVP === 'no'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            ✗ Não vou
          </button>
        </div>

        {userRSVP && (
          <p className="text-center text-sm text-ceramic-600">
            Você confirmou:{' '}
            <span className="font-medium">
              {userRSVP === 'yes' && 'Vou participar'}
              {userRSVP === 'maybe' && 'Talvez participe'}
              {userRSVP === 'no' && 'Não vou participar'}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};
