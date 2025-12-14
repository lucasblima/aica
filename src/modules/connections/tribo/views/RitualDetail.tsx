import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOccurrence } from '../hooks/useRituals';
import { RitualRSVP } from '../components/RitualRSVP';
import { BringListEditor } from '../components/BringListEditor';

interface RitualDetailProps {
  memberId?: string;
  isAdmin?: boolean;
}

export const RitualDetail: React.FC<RitualDetailProps> = ({
  memberId,
  isAdmin = false,
}) => {
  const { occurrenceId } = useParams<{ occurrenceId: string }>();
  const navigate = useNavigate();
  const [showRSVPModal, setShowRSVPModal] = useState(false);

  const { data: occurrence, isLoading } = useOccurrence(occurrenceId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9B4D3A]/20 border-t-[#9B4D3A] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ceramic-600">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!occurrence) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="text-6xl mb-4 block">❌</span>
          <h2 className="text-2xl font-semibold text-ceramic-900 mb-2">
            Ritual não encontrado
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="text-[#9B4D3A] hover:text-[#9B4D3A]/80"
          >
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  const occurrenceDate = new Date(occurrence.occurrenceDate);
  const userRSVP = memberId ? occurrence.rsvpData[memberId] : undefined;

  // Calculate RSVP stats
  const rsvpCounts = Object.values(occurrence.rsvpData).reduce(
    (acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { yes: 0, no: 0, maybe: 0 } as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9B4D3A]/5 via-white to-ceramic-50">
      {/* Header */}
      <div className="bg-white border-b border-ceramic-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="text-ceramic-600 hover:text-ceramic-900 mb-4 flex items-center gap-2"
          >
            ← Voltar
          </button>

          <div className="flex items-start gap-4">
            {/* Date Badge */}
            <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-[#9B4D3A] to-[#9B4D3A]/80 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
              <div className="text-xs font-medium uppercase">
                {format(occurrenceDate, 'MMM', { locale: ptBR })}
              </div>
              <div className="text-3xl font-bold">
                {format(occurrenceDate, 'd')}
              </div>
              <div className="text-xs">
                {format(occurrenceDate, 'HH:mm')}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-ceramic-900 mb-2">
                {occurrence.ritual?.name}
              </h1>
              {occurrence.ritual?.description && (
                <p className="text-ceramic-700">
                  {occurrence.ritual.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3">
                {occurrence.location && (
                  <div className="flex items-center gap-2 text-ceramic-600">
                    <span>📍</span>
                    <span>{occurrence.location}</span>
                  </div>
                )}
                {occurrence.ritual?.isMandatory && (
                  <span className="px-3 py-1 bg-[#9B4D3A]/10 text-[#9B4D3A] text-sm font-medium rounded-full">
                    Obrigatório
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* RSVP Summary */}
        <div className="bg-white rounded-2xl border-2 border-ceramic-200 p-6">
          <h2 className="text-xl font-semibold text-ceramic-900 mb-4">
            📊 Confirmações
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-3xl font-bold text-green-600">
                {rsvpCounts.yes}
              </div>
              <div className="text-sm text-green-700">Confirmados</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-xl">
              <div className="text-3xl font-bold text-yellow-600">
                {rsvpCounts.maybe}
              </div>
              <div className="text-sm text-yellow-700">Talvez</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="text-3xl font-bold text-red-600">
                {rsvpCounts.no}
              </div>
              <div className="text-sm text-red-700">Não vão</div>
            </div>
          </div>

          {/* User RSVP Status */}
          {memberId && (
            <div>
              {userRSVP ? (
                <div className="p-4 bg-[#9B4D3A]/10 rounded-xl mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-ceramic-700">
                        Sua resposta:
                      </div>
                      <div className="text-lg font-semibold text-[#9B4D3A]">
                        {userRSVP === 'yes' && '✓ Vou participar'}
                        {userRSVP === 'maybe' && '? Talvez participe'}
                        {userRSVP === 'no' && '✗ Não vou participar'}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRSVPModal(true)}
                      className="px-4 py-2 bg-white text-[#9B4D3A] rounded-lg font-medium hover:bg-ceramic-50 transition-colors"
                    >
                      Alterar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRSVPModal(true)}
                  className="w-full py-4 bg-[#9B4D3A] text-white rounded-xl font-semibold text-lg hover:bg-[#9B4D3A]/90 transition-colors shadow-lg"
                >
                  Confirmar Presença
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        {occurrence.notes && (
          <div className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">
              📝 Informações Importantes
            </h2>
            <p className="text-blue-800 whitespace-pre-wrap">
              {occurrence.notes}
            </p>
          </div>
        )}

        {/* Bring List */}
        <div className="bg-white rounded-2xl border-2 border-ceramic-200 p-6">
          <BringListEditor
            occurrenceId={occurrence.id}
            bringList={occurrence.bringList}
            memberId={memberId}
            readonly={!isAdmin && !memberId}
          />
        </div>

        {/* Past Event Info */}
        {occurrence.status === 'completed' && (
          <div className="bg-green-50 rounded-2xl border-2 border-green-200 p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-3">
              ✓ Evento Realizado
            </h2>
            {occurrence.actualAttendance && (
              <p className="text-green-800">
                Presença: {occurrence.actualAttendance} pessoas
              </p>
            )}
          </div>
        )}

        {occurrence.status === 'cancelled' && (
          <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-3">
              ✗ Evento Cancelado
            </h2>
          </div>
        )}
      </div>

      {/* RSVP Modal */}
      {showRSVPModal && memberId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <RitualRSVP
            occurrence={occurrence}
            memberId={memberId}
            onClose={() => setShowRSVPModal(false)}
          />
        </div>
      )}
    </div>
  );
};
