import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { RitualOccurrence } from '../types';
import { useRSVP } from '../hooks/useRituals';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('RitualCard');

interface RitualCardProps {
  occurrence: RitualOccurrence;
  memberId?: string;
  compact?: boolean;
}

export const RitualCard: React.FC<RitualCardProps> = ({
  occurrence,
  memberId,
  compact = false,
}) => {
  const rsvpMutation = useRSVP();

  const userRSVP = memberId ? occurrence.rsvpData[memberId] : undefined;
  const rsvpCounts = Object.values(occurrence.rsvpData).reduce(
    (acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const occurrenceDate = new Date(occurrence.occurrenceDate);
  const isUpcoming = occurrenceDate > new Date();
  const isPast = occurrenceDate < new Date();

  const handleRSVP = async (status: 'yes' | 'no' | 'maybe') => {
    if (!memberId) return;

    try {
      await rsvpMutation.mutateAsync({
        occurrenceId: occurrence.id,
        memberId,
        status,
      });
    } catch (error) {
      log.error('Error updating RSVP:', error);
    }
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-3 border border-ceramic-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#9B4D3A]/20 to-[#9B4D3A]/10 rounded-lg flex flex-col items-center justify-center">
            <div className="text-xs font-medium text-[#9B4D3A]">
              {format(occurrenceDate, 'MMM', { locale: ptBR })}
            </div>
            <div className="text-lg font-bold text-[#9B4D3A]">
              {format(occurrenceDate, 'd')}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-ceramic-900 truncate">
              {occurrence.ritual?.name}
            </h3>
            <p className="text-sm text-ceramic-600">
              {format(occurrenceDate, 'HH:mm', { locale: ptBR })}
            </p>
          </div>

          {userRSVP && (
            <div className="flex-shrink-0">
              {userRSVP === 'yes' && <span className="text-green-600">✓</span>}
              {userRSVP === 'no' && <span className="text-red-600">✗</span>}
              {userRSVP === 'maybe' && <span className="text-yellow-600">?</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl p-4 border-2 transition-all ${
        isPast
          ? 'border-ceramic-200 opacity-60'
          : 'border-[#9B4D3A]/20 hover:border-[#9B4D3A]/40 hover:shadow-lg'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#9B4D3A]/20 to-[#9B4D3A]/10 rounded-xl flex flex-col items-center justify-center">
          <div className="text-xs font-medium text-[#9B4D3A] uppercase">
            {format(occurrenceDate, 'MMM', { locale: ptBR })}
          </div>
          <div className="text-2xl font-bold text-[#9B4D3A]">
            {format(occurrenceDate, 'd')}
          </div>
          <div className="text-xs text-[#9B4D3A]">
            {format(occurrenceDate, 'HH:mm')}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ceramic-900 mb-1">
            {occurrence.ritual?.name}
          </h3>
          {occurrence.ritual?.description && (
            <p className="text-sm text-ceramic-600 line-clamp-2">
              {occurrence.ritual.description}
            </p>
          )}
          {occurrence.location && (
            <div className="flex items-center gap-1 mt-2 text-sm text-ceramic-600">
              <span>📍</span>
              <span>{occurrence.location}</span>
            </div>
          )}
        </div>

        {occurrence.ritual?.isMandatory && (
          <div className="flex-shrink-0">
            <span className="inline-block px-2 py-1 bg-[#9B4D3A]/10 text-[#9B4D3A] text-xs font-medium rounded-full">
              Obrigatório
            </span>
          </div>
        )}
      </div>

      {/* RSVP Summary */}
      <div className="flex items-center gap-3 mb-3 text-sm">
        {rsvpCounts.yes > 0 && (
          <div className="flex items-center gap-1 text-green-600">
            <span>✓</span>
            <span>{rsvpCounts.yes}</span>
          </div>
        )}
        {rsvpCounts.maybe > 0 && (
          <div className="flex items-center gap-1 text-yellow-600">
            <span>?</span>
            <span>{rsvpCounts.maybe}</span>
          </div>
        )}
        {rsvpCounts.no > 0 && (
          <div className="flex items-center gap-1 text-red-600">
            <span>✗</span>
            <span>{rsvpCounts.no}</span>
          </div>
        )}
        {occurrence.ritual?.typicalAttendance && (
          <div className="text-ceramic-600">
            ~{occurrence.ritual.typicalAttendance} pessoas
          </div>
        )}
      </div>

      {/* Bring List Preview */}
      {occurrence.bringList.length > 0 && (
        <div className="mb-3 p-2 bg-ceramic-50 rounded-lg">
          <div className="text-xs font-medium text-ceramic-700 mb-1">
            O que levar:
          </div>
          <div className="text-sm text-ceramic-600">
            {occurrence.bringList
              .slice(0, 2)
              .map((item) => item.item)
              .join(', ')}
            {occurrence.bringList.length > 2 &&
              ` +${occurrence.bringList.length - 2} mais`}
          </div>
        </div>
      )}

      {/* RSVP Actions */}
      {isUpcoming && memberId && (
        <div className="flex gap-2">
          <button
            onClick={() => handleRSVP('yes')}
            disabled={rsvpMutation.isPending}
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
              userRSVP === 'yes'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            Vou
          </button>
          <button
            onClick={() => handleRSVP('maybe')}
            disabled={rsvpMutation.isPending}
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
              userRSVP === 'maybe'
                ? 'bg-yellow-500 text-white'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            Talvez
          </button>
          <button
            onClick={() => handleRSVP('no')}
            disabled={rsvpMutation.isPending}
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
              userRSVP === 'no'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Não vou
          </button>
        </div>
      )}

      {/* Status badge for past events */}
      {isPast && occurrence.status === 'completed' && (
        <div className="mt-3 text-center text-sm text-ceramic-500">
          Realizado • {occurrence.actualAttendance || 0} presentes
        </div>
      )}
    </div>
  );
};
